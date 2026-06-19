import { AIProvider } from './ai-provider.interface';
import { metricsService } from '../metrics/metrics.service';
import { CareerAdviceContext, CareerAdviceResult } from './ai-provider.types';
import { logger } from '../../utils/logger';

/**
 * OpenAI Provider
 *
 * Uses OpenAI GPT models to generate personalized career advice.
 * Requires OPENAI_API_KEY environment variable.
 * Sends ONLY structured context — never raw resume text.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI GPT-4o-mini';
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required for OpenAIProvider');
    }
    this.apiKey = apiKey;
  }

  async generateCareerAdvice(
    context: CareerAdviceContext
  ): Promise<CareerAdviceResult> {
    metricsService.incrementAIRequest('openai');
    // Dynamic import to avoid requiring the package when not using OpenAI
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: this.apiKey });

    const systemPrompt = this.buildSystemPrompt();
    const userMessage = this.buildUserMessage(context);

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 3000,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      return this.parseResponse(content);
    } catch (err) {
      logger.error('[OpenAI Provider] Error generating career advice:', err);
      throw new Error(
        `OpenAI career advice generation failed: ${(err as Error).message}`,
        { cause: err }
      );
    }
  }

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

  private parseResponse(content: string): CareerAdviceResult {
    try {
      const parsed = JSON.parse(content) as CareerAdviceResult;

      // Validate required fields exist
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
      logger.error('[OpenAI Provider] Failed to parse response JSON:', err);
      throw new Error('Failed to parse OpenAI career advice response', {
        cause: err,
      });
    }
  }
}
