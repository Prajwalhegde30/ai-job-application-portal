import { query } from '../../config/database';
import { AIAnalysis, MatchAnalysis } from '../../types/models';
import { extractJobRequirements } from '../match-engine/match-engine.extractor';
import {
  CareerAdviceContext,
  ContextSkill,
  ContextEducation,
  ContextExperience,
  ContextProject,
  ContextCertification,
} from '../../core/ai/ai-provider.types';
import { logger } from '../../utils/logger';

/**
 * Normalizes JSONB fields that may arrive as strings from the DB driver.
 */
function normalizeJsonArray(val: unknown): unknown[] {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return [];
    }
  }
  return Array.isArray(val) ? val : [];
}

/**
 * Career Advice Context Builder
 *
 * Aggregates structured intelligence from:
 * - ai_analysis (Phase 12 resume extract)
 * - match_analysis (Phase 13 match scores)
 * - jobs table (job specs)
 * - profiles table (candidate info)
 *
 * Outputs a clean CareerAdviceContext.
 * NEVER includes raw resume text.
 */
export async function buildCareerAdviceContext(
  applicationId: string
): Promise<CareerAdviceContext> {
  logger.info(
    `[Context Builder] Building career advice context for app: ${applicationId}`
  );

  // 1. Fetch application + job details
  const appResult = await query<{
    id: string;
    job_id: string;
    user_id: string;
    resume_id: string;
    job_title: string;
    job_company: string;
    job_description: string;
    job_requirements: string;
    job_responsibilities: string | null;
  }>(
    `SELECT
       a.id, a.job_id, a.user_id, a.resume_id,
       j.title AS job_title, j.company AS job_company,
       j.description AS job_description, j.requirements AS job_requirements,
       j.responsibilities AS job_responsibilities
     FROM applications a
     JOIN jobs j ON j.id = a.job_id
     WHERE a.id = $1`,
    [applicationId]
  );

  if (appResult.rows.length === 0) {
    throw new Error(`Application ${applicationId} not found`);
  }

  const app = appResult.rows[0];

  // 2. Fetch candidate profile
  const profileResult = await query<{
    name: string;
    headline: string | null;
  }>(
    `SELECT u.name, p.headline
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = $1`,
    [app.user_id]
  );

  const candidateName = profileResult.rows[0]?.name || 'Candidate';
  const candidateHeadline = profileResult.rows[0]?.headline || '';

  // 3. Fetch resume analysis (Phase 12)
  const analysisResult = await query<AIAnalysis>(
    `SELECT * FROM ai_analysis WHERE resume_id = $1 AND analysis_type = 'RESUME_EXTRACT' ORDER BY created_at DESC LIMIT 1`,
    [app.resume_id]
  );

  const resumeAnalysis = analysisResult.rows[0] || null;

  // 4. Fetch match analysis (Phase 13)
  const matchResult = await query<MatchAnalysis>(
    `SELECT * FROM match_analysis WHERE application_id = $1`,
    [applicationId]
  );

  const matchAnalysis = matchResult.rows[0] || null;

  // 5. Extract job requirements (reuse Phase 13 extractor)
  const jobReqs = extractJobRequirements(
    app.job_description,
    app.job_requirements,
    app.job_responsibilities
  );

  // 6. Build matched/missing skill sets
  const matchedSkills = normalizeJsonArray(
    matchAnalysis?.matched_skills
  ) as string[];
  const missingSkills = normalizeJsonArray(
    matchAnalysis?.missing_skills
  ) as string[];
  const strengths = normalizeJsonArray(matchAnalysis?.strengths) as string[];
  const weaknesses = normalizeJsonArray(matchAnalysis?.weaknesses) as string[];

  // 7. Build skills context
  const extractedSkills = normalizeJsonArray(
    resumeAnalysis?.extracted_skills
  ) as Array<{
    name: string;
    category: string;
  }>;
  const matchedSet = new Set(matchedSkills.map((s: string) => s.toLowerCase()));
  const skills: ContextSkill[] = extractedSkills.map((s) => ({
    name: s.name,
    category: s.category || 'Other',
    matched: matchedSet.has(s.name.toLowerCase()),
  }));

  // 8. Build education context
  const extractedEducation = normalizeJsonArray(
    resumeAnalysis?.extracted_education
  ) as Array<{
    degree?: string;
    university?: string;
    graduationYear?: number;
    gpa?: number;
  }>;
  const education: ContextEducation[] = extractedEducation.map((e) => ({
    degree: e.degree || '',
    university: e.university || '',
    graduationYear: e.graduationYear,
    gpa: e.gpa,
  }));

  // 9. Build experience context
  const extractedExperience = normalizeJsonArray(
    resumeAnalysis?.extracted_experience
  ) as Array<{
    company?: string;
    role?: string;
    duration?: string;
    achievements?: string[];
  }>;
  const experience: ContextExperience[] = extractedExperience.map((e) => ({
    company: e.company || '',
    role: e.role || '',
    duration: e.duration || '',
    achievements: Array.isArray(e.achievements) ? e.achievements : [],
  }));

  // 10. Build projects context
  const extractedProjects = normalizeJsonArray(
    resumeAnalysis?.extracted_projects
  ) as Array<{
    projectName?: string;
    techStack?: string[];
    description?: string;
    githubLink?: string;
  }>;
  const projects: ContextProject[] = extractedProjects.map((p) => ({
    name: p.projectName || '',
    techStack: Array.isArray(p.techStack) ? p.techStack : [],
    description: p.description || '',
    hasGithub: !!p.githubLink,
  }));

  // 11. Build certifications context
  const extractedCerts = normalizeJsonArray(
    resumeAnalysis?.extracted_certifications
  ) as Array<{ name: string; provider?: string }>;
  const certifications: ContextCertification[] = extractedCerts.map((c) => ({
    name: c.name,
    provider: c.provider || '',
  }));

  // 12. Assemble the complete context
  const context: CareerAdviceContext = {
    candidateName,
    candidateHeadline,
    skills,
    education,
    experience,
    projects,
    certifications,
    matchScores: {
      overall: matchAnalysis?.match_score || 0,
      skills: matchAnalysis?.skills_score || 0,
      experience: matchAnalysis?.experience_score || 0,
      education: matchAnalysis?.education_score || 0,
      certifications: matchAnalysis?.certification_score || 0,
      projects: matchAnalysis?.projects_score || 0,
    },
    matchedSkills,
    missingSkills,
    strengths,
    weaknesses,
    jobInfo: {
      title: app.job_title,
      company: app.job_company,
      requiredSkills: jobReqs.skills,
      requiredExperienceYears: jobReqs.experienceYears,
      requiredDegree: jobReqs.educationDegrees[0] || '',
      requiredCertifications: jobReqs.certifications,
    },
  };

  logger.info(
    `[Context Builder] Context built: ${skills.length} skills, ${experience.length} experiences, ${education.length} education entries, ${projects.length} projects, ${certifications.length} certs`
  );

  return context;
}
