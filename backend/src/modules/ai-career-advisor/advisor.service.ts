import { query } from '../../config/database';
import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';
import { getAIProvider } from '../../core/ai';
import { buildCareerAdviceContext } from './advisor.context-builder';

/** DB row shape for the career_advice table */
interface CareerAdviceRow {
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
}

/**
 * Fetch application details with authorization check.
 */
async function getApplicationDetailsForAdvice(applicationId: string) {
  const result = await query<{
    id: string;
    job_id: string;
    user_id: string;
    resume_id: string;
    job_posted_by: string;
  }>(
    `SELECT a.id, a.job_id, a.user_id, a.resume_id, j.posted_by AS job_posted_by
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
 * Generate career advice for a given application.
 * Uses the configured AI provider to generate structured advice.
 */
export async function generateCareerAdvice(
  applicationId: string,
  _requestingUserId: string,
  force = false
): Promise<CareerAdviceRow> {
  logger.info(
    `[Career Advisor] Request to generate career advice for app: ${applicationId}`
  );

  // 1. Fetch application
  const app = await getApplicationDetailsForAdvice(applicationId);

  // 2. Cache check — return existing if not forcing regeneration
  if (!force) {
    const existing = await query<CareerAdviceRow>(
      'SELECT * FROM career_advice WHERE application_id = $1',
      [applicationId]
    );
    if (existing.rows.length > 0) {
      logger.info(
        `[Career Advisor] Returning cached advice for app: ${applicationId}`
      );
      return existing.rows[0];
    }
  }

  // 3. Build structured context (NO raw resume text)
  const context = await buildCareerAdviceContext(applicationId);

  // 4. Call AI Provider
  const provider = getAIProvider();
  logger.info(
    `[Career Advisor] Using provider: ${provider.name} for app: ${applicationId}`
  );

  const adviceResult = await provider.generateCareerAdvice(context);

  // 5. Persist to database
  const checkExisting = await query(
    'SELECT id FROM career_advice WHERE application_id = $1',
    [applicationId]
  );

  let adviceRecord: CareerAdviceRow;

  if (checkExisting.rows.length > 0) {
    const updateRes = await query<CareerAdviceRow>(
      `UPDATE career_advice
       SET provider = $1, career_paths = $2, skill_recommendations = $3,
           project_suggestions = $4, interview_tips = $5, salary_insights = $6,
           overall_summary = $7, confidence_score = $8, updated_at = NOW()
       WHERE application_id = $9
       RETURNING *`,
      [
        provider.name,
        JSON.stringify(adviceResult.careerPaths),
        JSON.stringify(adviceResult.skillRecommendations),
        JSON.stringify(adviceResult.projectSuggestions),
        JSON.stringify(adviceResult.interviewTips),
        JSON.stringify(adviceResult.salaryInsights),
        adviceResult.overallSummary,
        adviceResult.confidenceScore,
        applicationId,
      ]
    );
    adviceRecord = updateRes.rows[0];
  } else {
    const insertRes = await query<CareerAdviceRow>(
      `INSERT INTO career_advice (
         application_id, user_id, resume_id, job_id, provider,
         career_paths, skill_recommendations, project_suggestions,
         interview_tips, salary_insights, overall_summary, confidence_score
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        applicationId,
        app.user_id,
        app.resume_id,
        app.job_id,
        provider.name,
        JSON.stringify(adviceResult.careerPaths),
        JSON.stringify(adviceResult.skillRecommendations),
        JSON.stringify(adviceResult.projectSuggestions),
        JSON.stringify(adviceResult.interviewTips),
        JSON.stringify(adviceResult.salaryInsights),
        adviceResult.overallSummary,
        adviceResult.confidenceScore,
      ]
    );
    adviceRecord = insertRes.rows[0];
  }

  logger.info(
    `[Career Advisor] Successfully generated and stored advice for app: ${applicationId} (Provider: ${provider.name}, Confidence: ${adviceResult.confidenceScore}%)`
  );

  return adviceRecord;
}

/**
 * Retrieve career advice. Auto-generates if not found.
 * Enforces ownership: candidate owns the application, or admin owns the job.
 */
export async function getCareerAdvice(
  applicationId: string,
  requestingUserId: string,
  requestingUserRole: string
): Promise<CareerAdviceRow> {
  // 1. Authorization check
  const app = await getApplicationDetailsForAdvice(applicationId);

  if (requestingUserRole === 'ADMIN') {
    if (app.job_posted_by !== requestingUserId) {
      throw new AppError(
        'You can only view advice for jobs you posted',
        403,
        'FORBIDDEN'
      );
    }
  } else {
    if (app.user_id !== requestingUserId) {
      throw new AppError(
        'You can only view your own career advice',
        403,
        'FORBIDDEN'
      );
    }
  }

  // 2. Query DB
  const res = await query<CareerAdviceRow>(
    'SELECT * FROM career_advice WHERE application_id = $1',
    [applicationId]
  );

  if (res.rows.length === 0) {
    // Auto-generate if missing
    logger.info(
      `[Career Advisor] Advice missing for app ${applicationId}, generating now.`
    );
    return generateCareerAdvice(applicationId, app.user_id);
  }

  return res.rows[0];
}
