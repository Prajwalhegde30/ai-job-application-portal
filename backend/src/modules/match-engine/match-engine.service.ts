import { query } from '../../config/database';
import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';
import { extractJobRequirements } from './match-engine.extractor';
import { calculateMatchScores } from './match-engine.scoring';
import { generateMatchFeedback } from './match-engine.recommendations';
import * as aiAnalysisService from '../ai-analysis/ai-analysis.service';
import { AIAnalysis, MatchAnalysis } from '../../types/models';

/**
 * Ensures that resume analysis JSONB fields are parsed correctly,
 * regardless of the database driver's configuration (important for unit testing mock drivers).
 */
function normalizeResumeAnalysis(analysis: AIAnalysis): AIAnalysis {
  if (!analysis) return {} as AIAnalysis;
  const normalize = (val: unknown) => {
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
    ...analysis,
    extracted_skills: normalize(analysis.extracted_skills),
    extracted_education: normalize(analysis.extracted_education),
    extracted_experience: normalize(analysis.extracted_experience),
    extracted_projects: normalize(analysis.extracted_projects),
    extracted_certifications: normalize(analysis.extracted_certifications),
    result:
      typeof analysis.result === 'string'
        ? JSON.parse(analysis.result)
        : analysis.result || {},
  } as AIAnalysis;
}

/**
 * Helper to fetch application and job owner details.
 */
async function getApplicationDetailsForMatching(applicationId: string) {
  const result = await query<{
    id: string;
    job_id: string;
    user_id: string;
    resume_id: string;
    job_title: string;
    job_company: string;
    job_description: string;
    job_requirements: string;
    job_responsibilities: string | null;
    job_posted_by: string;
  }>(
    `SELECT
       a.id, a.job_id, a.user_id, a.resume_id,
       j.title AS job_title, j.company AS job_company, j.description AS job_description, 
       j.requirements AS job_requirements, j.responsibilities AS job_responsibilities, 
       j.posted_by AS job_posted_by
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [applicationId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
  }

  return result.rows[0];
}

/**
 * Generate a fresh match analysis or update an existing one.
 */
export async function generateMatchAnalysis(
  applicationId: string,
  _requestingUserId: string,
  force = false
): Promise<MatchAnalysis> {
  logger.info(
    `[Match-Engine] Request to generate match analysis for app: ${applicationId}`
  );

  // 1. Fetch details
  const app = await getApplicationDetailsForMatching(applicationId);

  // 2. Cache validation: Return existing report if force is false
  if (!force) {
    const existing = await query<MatchAnalysis>(
      'SELECT * FROM match_analysis WHERE application_id = $1',
      [applicationId]
    );
    if (existing.rows.length > 0) {
      logger.info(
        `[Match-Engine] Returning cached analysis for app: ${applicationId}`
      );
      return existing.rows[0];
    }
  }

  // 3. Extract Job specifications
  const jobRequirements = extractJobRequirements(
    app.job_description,
    app.job_requirements,
    app.job_responsibilities
  );

  // 4. Fetch resume AI Analysis (RESUME_EXTRACT)
  // Re-uses existing Phase 12 analysis or auto-generates if missing
  const rawResumeAnalysis = await aiAnalysisService.getAnalysis(
    app.resume_id,
    app.user_id
  );
  const resumeAnalysis = normalizeResumeAnalysis(rawResumeAnalysis);

  // 5. Evaluate score and generate feedback
  const matchResult = calculateMatchScores(jobRequirements, resumeAnalysis);
  generateMatchFeedback(matchResult, jobRequirements, resumeAnalysis);

  // 6. Save results to match_analysis table
  const checkAnalysis = await query(
    'SELECT id FROM match_analysis WHERE application_id = $1',
    [applicationId]
  );

  let matchRecord: MatchAnalysis;

  if (checkAnalysis.rows.length > 0) {
    const updateRes = await query<MatchAnalysis>(
      `UPDATE match_analysis 
       SET match_score = $1, matched_skills = $2, missing_skills = $3, additional_skills = $4,
           education_score = $5, experience_score = $6, certification_score = $7, 
           skills_score = $8, projects_score = $9, strengths = $10, weaknesses = $11, 
           recommendations = $12, updated_at = NOW()
       WHERE application_id = $13
       RETURNING *`,
      [
        matchResult.matchScore,
        JSON.stringify(matchResult.matchedSkills),
        JSON.stringify(matchResult.missingSkills),
        JSON.stringify(matchResult.additionalSkills),
        matchResult.categoryScores.education,
        matchResult.categoryScores.experience,
        matchResult.categoryScores.certifications,
        matchResult.categoryScores.skills,
        matchResult.categoryScores.projects,
        JSON.stringify(matchResult.strengths),
        JSON.stringify(matchResult.weaknesses),
        JSON.stringify(matchResult.recommendations),
        applicationId,
      ]
    );
    matchRecord = updateRes.rows[0];
  } else {
    const insertRes = await query<MatchAnalysis>(
      `INSERT INTO match_analysis (
         application_id, user_id, resume_id, job_id, match_score, matched_skills, 
         missing_skills, additional_skills, education_score, experience_score, 
         certification_score, skills_score, projects_score, strengths, weaknesses, 
         recommendations
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        applicationId,
        app.user_id,
        app.resume_id,
        app.job_id,
        matchResult.matchScore,
        JSON.stringify(matchResult.matchedSkills),
        JSON.stringify(matchResult.missingSkills),
        JSON.stringify(matchResult.additionalSkills),
        matchResult.categoryScores.education,
        matchResult.categoryScores.experience,
        matchResult.categoryScores.certifications,
        matchResult.categoryScores.skills,
        matchResult.categoryScores.projects,
        JSON.stringify(matchResult.strengths),
        JSON.stringify(matchResult.weaknesses),
        JSON.stringify(matchResult.recommendations),
      ]
    );
    matchRecord = insertRes.rows[0];
  }

  // 7. Sync with applications.ai_match_score
  await query(
    'UPDATE applications SET ai_match_score = $1, updated_at = NOW() WHERE id = $2',
    [matchResult.matchScore, applicationId]
  );

  logger.info(
    `[Match-Engine] Successfully generated and stored match analysis for app: ${applicationId} (Score: ${matchResult.matchScore}%)`
  );
  return matchRecord;
}

/**
 * Retrieve match analysis report. Auto-generates if not found.
 */
export async function getMatchAnalysis(
  applicationId: string,
  requestingUserId: string,
  requestingUserRole: string
): Promise<MatchAnalysis> {
  // 1. Fetch details to check authorization
  const app = await getApplicationDetailsForMatching(applicationId);

  // 2. Validate role-based ownership permissions
  if (requestingUserRole === 'ADMIN') {
    if (app.job_posted_by !== requestingUserId) {
      throw new AppError(
        'You can only view reports for jobs you posted',
        403,
        'FORBIDDEN'
      );
    }
  } else {
    if (app.user_id !== requestingUserId) {
      throw new AppError(
        'You can only view your own match reports',
        403,
        'FORBIDDEN'
      );
    }
  }

  // 3. Query DB
  const res = await query<MatchAnalysis>(
    'SELECT * FROM match_analysis WHERE application_id = $1',
    [applicationId]
  );

  if (res.rows.length === 0) {
    // Auto-generate if missing
    logger.info(
      `[Match-Engine] Match analysis missing for app ${applicationId}, generating now.`
    );
    return generateMatchAnalysis(applicationId, app.user_id);
  }

  return res.rows[0];
}
