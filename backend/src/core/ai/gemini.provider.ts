import { AIProvider } from './ai-provider.interface';
import { metricsService } from '../metrics/metrics.service';
import { CareerAdviceContext, CareerAdviceResult } from './ai-provider.types';
import { logger } from '../../utils/logger';

/**
 * Google Gemini Provider
 *
 * Uses Google Generative AI SDK to generate personalized career advice.
 * Requires GEMINI_API_KEY environment variable.
 * Sends ONLY structured context — never raw resume text.
 */
export class GeminiProvider implements AIProvider {
  readonly name = 'Google Gemini';
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Gemini API key is required for GeminiProvider');
    }
    this.apiKey = apiKey;
  }

  async generateCareerAdvice(
    context: CareerAdviceContext
  ): Promise<CareerAdviceResult> {
    metricsService.incrementAIRequest('gemini');
    // Dynamic import to avoid requiring the package when not using Gemini
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = this.buildPrompt(context);

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return this.parseResponse(text);
    } catch (err) {
      logger.error('[Gemini Provider] Error generating career advice:', err);
      throw new Error(
        `Gemini career advice generation failed: ${(err as Error).message}`,
        { cause: err }
      );
    }
  }

  private buildPrompt(context: CareerAdviceContext): string {
    const candidateData = JSON.stringify(
      {
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
      },
      null,
      2
    );

    return `You are an expert career advisor for technology professionals.
Analyze the following structured candidate data and job match analysis, then provide actionable career guidance.

CANDIDATE DATA:
${candidateData}

Respond with ONLY a valid JSON object (no markdown, no code blocks) matching this exact schema:
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
- Base salary estimates on the role level and skills
- Return ONLY the JSON object, no additional text`;
  }

  private parseResponse(content: string): CareerAdviceResult {
    try {
      // Strip markdown code blocks if present
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
      logger.error('[Gemini Provider] Failed to parse response JSON:', err);
      throw new Error('Failed to parse Gemini career advice response', {
        cause: err,
      });
    }
  }
}
