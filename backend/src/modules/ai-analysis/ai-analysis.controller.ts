import { Request, Response, NextFunction } from 'express';
import * as aiAnalysisService from './ai-analysis.service';
import { sendSuccess } from '../../utils/response';
import { resumeIdParamSchema } from './ai-analysis.validators';

/**
 * Maps database row to clean camelCase API response structure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAnalysisResponse(analysis: any) {
  // Ensure objects/arrays are parsed correctly if returned as string from pg
  const strengths =
    typeof analysis.strengths === 'string'
      ? JSON.parse(analysis.strengths)
      : analysis.strengths;
  const weaknesses =
    typeof analysis.weaknesses === 'string'
      ? JSON.parse(analysis.weaknesses)
      : analysis.weaknesses;
  const suggestions =
    typeof analysis.suggestions === 'string'
      ? JSON.parse(analysis.suggestions)
      : analysis.suggestions;
  const extractedSkills =
    typeof analysis.extracted_skills === 'string'
      ? JSON.parse(analysis.extracted_skills)
      : analysis.extracted_skills;
  const extractedEducation =
    typeof analysis.extracted_education === 'string'
      ? JSON.parse(analysis.extracted_education)
      : analysis.extracted_education;
  const extractedExperience =
    typeof analysis.extracted_experience === 'string'
      ? JSON.parse(analysis.extracted_experience)
      : analysis.extracted_experience;
  const extractedProjects =
    typeof analysis.extracted_projects === 'string'
      ? JSON.parse(analysis.extracted_projects)
      : analysis.extracted_projects;
  const extractedCertifications =
    typeof analysis.extracted_certifications === 'string'
      ? JSON.parse(analysis.extracted_certifications)
      : analysis.extracted_certifications;
  const result =
    typeof analysis.result === 'string'
      ? JSON.parse(analysis.result)
      : analysis.result;

  return {
    id: analysis.id,
    resumeId: analysis.resume_id,
    userId: analysis.user_id,
    analysisType: analysis.analysis_type,
    score: analysis.score,
    strengths: strengths || [],
    weaknesses: weaknesses || [],
    suggestions: suggestions || [],
    extractedSkills: extractedSkills || [],
    extractedEducation: extractedEducation || [],
    extractedExperience: extractedExperience || [],
    extractedProjects: extractedProjects || [],
    extractedCertifications: extractedCertifications || [],
    contactInfo: result?.contactInfo || {},
    categoryScores: result?.categoryScores || {
      education: 0,
      experience: 0,
      projects: 0,
      skills: 0,
      certifications: 0,
      contact: 0,
    },
    createdAt: analysis.created_at,
    updatedAt: analysis.updated_at,
  };
}

/**
 * POST /api/v1/ai-analysis/:resumeId/analyze
 * Manually triggers a fresh analysis on a resume.
 */
export async function analyzeResume(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { resumeId } = resumeIdParamSchema.parse(req.params);
    const userId = req.user!.userId;

    // Run analysis, forcing a refresh of parsing and scoring
    const analysis = await aiAnalysisService.generateAnalysis(
      resumeId,
      userId,
      true
    );

    sendSuccess(
      res,
      mapAnalysisResponse(analysis),
      'Resume analyzed successfully',
      200
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/ai-analysis/:resumeId
 * Retrieves existing resume analysis report, generating it if missing.
 */
export async function getAnalysis(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { resumeId } = resumeIdParamSchema.parse(req.params);
    const userId = req.user!.userId;

    const analysis = await aiAnalysisService.getAnalysis(resumeId, userId);

    sendSuccess(
      res,
      mapAnalysisResponse(analysis),
      'Resume analysis retrieved successfully',
      200
    );
  } catch (err) {
    next(err);
  }
}
