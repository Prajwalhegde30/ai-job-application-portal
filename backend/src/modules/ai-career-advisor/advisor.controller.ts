import { Request, Response, NextFunction } from 'express';
import * as advisorService from './advisor.service';
import { sendSuccess } from '../../utils/response';
import { applicationIdParamSchema } from './advisor.validators';

/**
 * Normalizes JSONB fields that may arrive as strings from the DB driver.
 */
function parseJson(val: unknown): unknown {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

/**
 * Maps database row to clean camelCase API response structure.
 */
function mapCareerAdviceResponse(row: {
  id: string;
  application_id: string;
  user_id: string;
  resume_id: string;
  job_id: string;
  provider: string;
  career_paths: unknown;
  skill_recommendations: unknown;
  project_suggestions: unknown;
  interview_tips: unknown;
  salary_insights: unknown;
  overall_summary: string;
  confidence_score: number;
  created_at: Date;
  updated_at: Date;
}) {
  return {
    id: row.id,
    applicationId: row.application_id,
    userId: row.user_id,
    resumeId: row.resume_id,
    jobId: row.job_id,
    provider: row.provider,
    careerPaths: parseJson(row.career_paths),
    skillRecommendations: parseJson(row.skill_recommendations),
    projectSuggestions: parseJson(row.project_suggestions),
    interviewTips: parseJson(row.interview_tips),
    salaryInsights: parseJson(row.salary_insights),
    overallSummary: row.overall_summary,
    confidenceScore: row.confidence_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/v1/career-advice/:applicationId
 * Retrieves or generates personalized career advice for an application.
 */
export async function getCareerAdvice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { applicationId } = applicationIdParamSchema.parse(req.params);
    const userId = req.user!.userId;
    const role = req.user!.role;

    const advice = await advisorService.getCareerAdvice(
      applicationId,
      userId,
      role
    );

    sendSuccess(
      res,
      mapCareerAdviceResponse(advice),
      'Career advice retrieved successfully',
      200
    );
  } catch (err) {
    next(err);
  }
}
