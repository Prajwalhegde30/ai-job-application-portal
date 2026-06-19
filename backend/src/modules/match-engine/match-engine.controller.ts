import { Request, Response, NextFunction } from 'express';
import * as matchEngineService from './match-engine.service';
import { sendSuccess } from '../../utils/response';
import { applicationIdParamSchema } from './match-engine.validators';
import { MatchAnalysis } from '../../types/models';

/**
 * Maps database row to clean camelCase API response structure.
 */
function mapMatchAnalysisResponse(analysis: MatchAnalysis) {
  if (!analysis) return null;
  const parseJson = (val: unknown) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return [];
      }
    }
    return Array.isArray(val) ? val : [];
  };

  return {
    id: analysis.id,
    applicationId: analysis.application_id,
    userId: analysis.user_id,
    resumeId: analysis.resume_id,
    jobId: analysis.job_id,
    matchScore: analysis.match_score,
    matchedSkills: parseJson(analysis.matched_skills),
    missingSkills: parseJson(analysis.missing_skills),
    additionalSkills: parseJson(analysis.additional_skills),
    categoryScores: {
      education: analysis.education_score,
      experience: analysis.experience_score,
      certifications: analysis.certification_score,
      skills: analysis.skills_score,
      projects: analysis.projects_score,
    },
    strengths: parseJson(analysis.strengths),
    weaknesses: parseJson(analysis.weaknesses),
    recommendations: parseJson(analysis.recommendations),
    createdAt: analysis.created_at,
    updatedAt: analysis.updated_at,
  };
}

/**
 * GET /api/v1/match-analysis/:applicationId
 * Retrieves match score card comparison details for candidate application.
 */
export async function getMatchAnalysis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { applicationId } = applicationIdParamSchema.parse(req.params);
    const userId = req.user!.userId;
    const role = req.user!.role;

    const analysis = await matchEngineService.getMatchAnalysis(
      applicationId,
      userId,
      role
    );

    sendSuccess(
      res,
      mapMatchAnalysisResponse(analysis),
      'Match analysis details retrieved successfully',
      200
    );
  } catch (err) {
    next(err);
  }
}
