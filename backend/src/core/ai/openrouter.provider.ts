import { AIProvider } from './ai-provider.interface';
import { metricsService } from '../metrics/metrics.service';
import { CareerAdviceContext, CareerAdviceResult } from './ai-provider.types';
import { logger } from '../../utils/logger';

/**
 * Default free model to use when OPENROUTER_MODEL is not supplied.
 * Change this single constant to update the default across the entire provider.
 */
const DEFAULT_MODEL = 'openrouter/free';

/** Maximum number of retry attempts for transient failures (429 / 503 / network). */
const MAX_RETRIES = 3;

/** Base delay in ms for exponential backoff (doubles each attempt). */
const BACKOFF_BASE_MS = 1000;

/** Request timeout in ms (30 seconds). */
const REQUEST_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// OpenRouter API response shape (OpenAI-compatible)
// ---------------------------------------------------------------------------

interface OpenRouterChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
}

// ---------------------------------------------------------------------------
// Error classification helpers
// ---------------------------------------------------------------------------

/**
 * Returns true for HTTP status codes that warrant an automatic retry.
 */
function isRetryable(status: number): boolean {
  return status === 429 || status === 503;
}

/**
 * Map an HTTP status code to a human-readable message.
 */
function describeHttpError(status: number): string {
  const messages: Record<number, string> = {
    401: 'Unauthorized — OPENROUTER_API_KEY is invalid or missing',
    403: 'Forbidden — the model or endpoint is not accessible with your plan',
    404: 'Not Found — the requested model or endpoint does not exist',
    408: 'Request Timeout — the upstream model took too long to respond',
    429: 'Rate Limit Exceeded — too many requests; retrying with backoff',
    500: 'Internal Server Error from OpenRouter',
    502: 'Bad Gateway — OpenRouter upstream is unavailable',
    503: 'Service Unavailable — OpenRouter is overloaded; retrying with backoff',
    504: 'Gateway Timeout — upstream model response timed out',
  };
  return messages[status] ?? `HTTP ${status} error from OpenRouter`;
}

/**
 * Sleep for `ms` milliseconds (used by the retry backoff loop).
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// OpenRouter Provider
// ---------------------------------------------------------------------------

/**
 * OpenRouter AI Provider
 *
 * Uses the OpenRouter gateway (OpenAI-compatible API) to generate
 * personalized career advice via any model available on openrouter.ai.
 *
 * Required environment variables:
 *   OPENROUTER_API_KEY  — Bearer token from https://openrouter.ai/keys
 *
 * Optional environment variables:
 *   OPENROUTER_MODEL    — Model slug (default: openai/gpt-4o-mini-high:free)
 *   OPENROUTER_BASE_URL — Override endpoint (default: https://openrouter.ai/api/v1)
 *
 * The provider:
 *  - Implements the same AIProvider interface as GeminiProvider and OpenAIProvider.
 *  - Reuses identical prompt builders so no prompt logic is duplicated.
 *  - Applies exponential backoff retries for 429 / 503 / network timeouts (max 3).
 *  - Logs provider, model, latency, token usage, and errors — never the API key.
 *  - Sends ONLY structured context — never raw resume text.
 */
export class OpenRouterProvider implements AIProvider {
  readonly name: string;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, model?: string, baseUrl?: string) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required for OpenRouterProvider');
    }

    this.apiKey = apiKey;
    this.model = model?.trim() || DEFAULT_MODEL;
    this.baseUrl = (baseUrl?.trim() || 'https://openrouter.ai/api/v1').replace(
      /\/$/,
      ''
    );
    this.name = `OpenRouter (${this.model})`;
  }

  // -------------------------------------------------------------------------
  // Public interface
  // -------------------------------------------------------------------------

  async generateCareerAdvice(
    context: CareerAdviceContext
  ): Promise<CareerAdviceResult> {
    metricsService.incrementAIRequest('openrouter');

    const systemPrompt = this.buildSystemPrompt();
    const userMessage = this.buildUserMessage(context);

    const requestBody = JSON.stringify({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const startTime = Date.now();
    const rawContent = await this.callWithRetry(requestBody, startTime);
    const latencyMs = Date.now() - startTime;

    logger.debug('[OpenRouter Provider] Response received', {
      provider: this.name,
      model: this.model,
      latencyMs,
    });

    return this.parseResponse(rawContent);
  }

  // -------------------------------------------------------------------------
  // HTTP client with retry
  // -------------------------------------------------------------------------

  /**
   * Call the OpenRouter completions endpoint with exponential backoff retries.
   * Retries on 429, 503, and network / timeout errors (max MAX_RETRIES attempts).
   */
  private async callWithRetry(
    requestBody: string,
    startTime: number
  ): Promise<string> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.callOnce(requestBody, startTime);
      } catch (err) {
        lastError = err as Error;

        const isTransient = (err as { retryable?: boolean }).retryable === true;

        if (!isTransient || attempt === MAX_RETRIES) {
          // Non-retryable error, or exhausted retries — re-throw immediately
          throw lastError;
        }

        const backoffMs = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
        logger.warn(
          `[OpenRouter Provider] Attempt ${attempt}/${MAX_RETRIES} failed — retrying in ${backoffMs}ms`,
          { reason: lastError.message }
        );
        await sleep(backoffMs);
      }
    }

    throw lastError;
  }

  /**
   * Execute a single HTTP request to the OpenRouter completions endpoint.
   * Tags the thrown error with `retryable: true` for transient failures.
   */
  private async callOnce(
    requestBody: string,
    startTime: number
  ): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;

    // AbortController provides request-level timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://ai-job-portal',
          'X-Title': 'AI Job Application Portal',
        },
        body: requestBody,
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);

      // AbortError = our timeout; TypeError = network failure
      const isAbort =
        fetchErr instanceof Error && fetchErr.name === 'AbortError';
      const latencyMs = Date.now() - startTime;

      logger.error('[OpenRouter Provider] Network / timeout error', {
        provider: this.name,
        model: this.model,
        latencyMs,
        error: isAbort ? 'Request timed out' : (fetchErr as Error).message,
      });

      const networkError = new Error(
        isAbort
          ? `OpenRouter request timed out after ${REQUEST_TIMEOUT_MS}ms`
          : `OpenRouter network error: ${(fetchErr as Error).message}`
      );
      // Mark as retryable so the retry loop picks it up
      (networkError as unknown as Record<string, unknown>)['retryable'] = true;
      throw networkError;
    } finally {
      clearTimeout(timeoutId);
    }

    const latencyMs = Date.now() - startTime;

    // ----- Non-OK HTTP response handling -----
    if (!response.ok) {
      let responseBody = '';
      try {
        responseBody = await response.text();
      } catch {
        // Ignore body-read failure
      }

      const description = describeHttpError(response.status);

      logger.error('[OpenRouter Provider] HTTP error response', {
        provider: this.name,
        model: this.model,
        status: response.status,
        latencyMs,
        description,
        // Truncate body to avoid flooding logs with large error payloads
        body: responseBody.substring(0, 300),
      });

      const httpError = new Error(
        `OpenRouter career advice generation failed: ${description}`
      );
      if (isRetryable(response.status)) {
        (httpError as unknown as Record<string, unknown>)['retryable'] = true;
      }
      throw httpError;
    }

    // ----- Parse successful response -----
    let json: OpenRouterResponse;
    try {
      json = (await response.json()) as OpenRouterResponse;
    } catch (parseErr) {
      logger.error('[OpenRouter Provider] Failed to parse response as JSON', {
        provider: this.name,
        model: this.model,
        latencyMs,
      });
      throw new Error(
        'OpenRouter returned malformed JSON — cannot parse response',
        { cause: parseErr }
      );
    }

    // Log token usage when available
    if (json.usage) {
      logger.debug('[OpenRouter Provider] Token usage', {
        provider: this.name,
        model: this.model,
        promptTokens: json.usage.prompt_tokens,
        completionTokens: json.usage.completion_tokens,
        totalTokens: json.usage.total_tokens,
        latencyMs,
      });
    }

    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(
        'OpenRouter returned an empty content field in the response'
      );
    }

    return content;
  }

  // -------------------------------------------------------------------------
  // Prompt builders (identical logic to OpenAIProvider — no duplication)
  // -------------------------------------------------------------------------

  private buildSystemPrompt(): string {
    return `You are an expert career advisor for technology professionals.
You analyze structured candidate data (skills, experience, education, certifications, projects, and job match scores) and provide actionable career guidance.

You MUST respond with a valid JSON object matching this exact schema:
{
  "overallSummary": "string - 2-3 sentence personalized career summary",
  "confidenceScore": "number 0-100 based on data quality/completeness",
  "careerPaths": [{ "title": "string", "description": "string", "timeframe": "string", "relevance": "high|medium|low" }],
  "skillRecommendations": [{ "skill": "string", "priority": "critical|important|nice-to-have", "reason": "string", "resources": ["string"], "estimatedTime": "string" }],
  "projectSuggestions": [{ "title": "string", "description": "string", "techStack": ["string"], "difficulty": "beginner|intermediate|advanced", "estimatedHours": "number" }],
  "interviewTips": [{ "category": "string", "tip": "string", "example": "string" }],
  "salaryInsights": { "estimatedRange": "string", "marketTrend": "string", "negotiationTips": ["string"] }
}

Rules:
- Provide 2-4 career paths
- Provide 2-5 skill recommendations, prioritizing missing job requirements
- Provide 2-3 project suggestions using technologies the candidate needs to learn
- Provide 3-4 interview tips
- Be specific, actionable, and encouraging
- Base salary estimates on the role level and skills`;
  }

  private buildUserMessage(context: CareerAdviceContext): string {
    return JSON.stringify({
      candidate: {
        name: context.candidateName,
        headline: context.candidateHeadline,
        skills: context.skills.map((s) => `${s.name} (${s.category})`),
        education: context.education,
        experience: context.experience,
        projects: context.projects,
        certifications: context.certifications,
      },
      jobTarget: context.jobInfo,
      matchAnalysis: {
        scores: context.matchScores,
        matchedSkills: context.matchedSkills,
        missingSkills: context.missingSkills,
        strengths: context.strengths,
        weaknesses: context.weaknesses,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Response parser
  // -------------------------------------------------------------------------

  private parseResponse(content: string): CareerAdviceResult {
    try {
      // Strip markdown code fences if the model wraps the JSON
      const cleaned = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const parsed = JSON.parse(cleaned) as CareerAdviceResult;

      return {
        overallSummary: parsed.overallSummary || 'Career advice generated.',
        confidenceScore: Math.min(
          Math.max(parsed.confidenceScore || 50, 0),
          100
        ),
        careerPaths: Array.isArray(parsed.careerPaths)
          ? parsed.careerPaths
          : [],
        skillRecommendations: Array.isArray(parsed.skillRecommendations)
          ? parsed.skillRecommendations
          : [],
        projectSuggestions: Array.isArray(parsed.projectSuggestions)
          ? parsed.projectSuggestions
          : [],
        interviewTips: Array.isArray(parsed.interviewTips)
          ? parsed.interviewTips
          : [],
        salaryInsights: parsed.salaryInsights || {
          estimatedRange: 'N/A',
          marketTrend: 'N/A',
          negotiationTips: [],
        },
      };
    } catch (err) {
      logger.error(
        '[OpenRouter Provider] Failed to parse career advice JSON:',
        err
      );
      throw new Error('Failed to parse OpenRouter career advice response', {
        cause: err,
      });
    }
  }
}
