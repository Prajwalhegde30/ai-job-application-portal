import { query } from '../../config/database';
import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';
import { AIAnalysis } from '../../types/models';
import * as storageService from '../resumes/resumes.storage';
import {
  parsePdfToText,
  segmentText,
  extractSkills,
  extractEducation,
  extractExperience,
  extractProjects,
  extractCertifications,
  extractContactInfo,
} from './ai-analysis.parser';
import { calculateScores } from './ai-analysis.scoring';
import { METRIC_PATTERN } from './ai-analysis.rules';

/**
 * Retrieves the resume details and verifies ownership.
 */
async function getAndVerifyResume(resumeId: string, userId: string) {
  const res = await query<{
    id: string;
    user_id: string;
    resume_text: string | null;
    storage_path: string;
  }>(
    'SELECT id, user_id, resume_text, storage_path FROM resumes WHERE id = $1',
    [resumeId]
  );

  if (res.rows.length === 0) {
    throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
  }

  const resume = res.rows[0];
  if (resume.user_id !== userId) {
    throw new AppError('You do not own this resume', 403, 'FORBIDDEN');
  }

  return resume;
}

/**
 * Generates strengths based on score values and features.
 */
function generateStrengths(
  skillsCount: number,
  eduScore: number,
  expScore: number,
  hasQuantified: boolean,
  projScore: number,
  contactScore: number
): string[] {
  const strengths: string[] = [];

  if (skillsCount > 5) {
    strengths.push(
      'Strong technical skills coverage with multiple matched technologies.'
    );
  }
  if (eduScore >= 15) {
    strengths.push(
      'Solid academic foundation with degree and institution clearly identified.'
    );
  }
  if (expScore >= 15) {
    strengths.push(
      'Substantial professional experience across multiple roles.'
    );
  }
  if (hasQuantified) {
    strengths.push(
      'Demonstrated measurable impact and business outcomes in work roles.'
    );
  }
  if (projScore >= 15) {
    strengths.push(
      'Impressive project portfolio with technical details and stack listed.'
    );
  }
  if (contactScore === 10) {
    strengths.push(
      'Complete contact information including professional social profiles.'
    );
  }

  // Fallback strength if none triggered
  if (strengths.length === 0) {
    strengths.push('Structured sections present and readable.');
  }

  return strengths;
}

/**
 * Generates weaknesses based on score values and features.
 */
function generateWeaknesses(
  skillsCount: number,
  certCount: number,
  contactScore: number,
  hasExperience: boolean,
  hasQuantified: boolean,
  projScore: number
): string[] {
  const weaknesses: string[] = [];

  if (skillsCount <= 2) {
    weaknesses.push(
      'Low technical skill count: very few keywords matched the skills dictionary.'
    );
  }
  if (certCount === 0) {
    weaknesses.push('No professional certifications listed.');
  }
  if (contactScore <= 6) {
    weaknesses.push(
      'Missing key contact links (e.g. GitHub, LinkedIn, or portfolio website).'
    );
  }
  if (hasExperience && !hasQuantified) {
    weaknesses.push(
      'Work history entries lack measurable metrics or quantified achievements.'
    );
  }
  if (projScore < 15) {
    weaknesses.push('Brief or minimal project description details.');
  }

  return weaknesses;
}

/**
 * Generates suggestions/recommendations based on weaknesses.
 */
function generateSuggestions(
  contact: { github?: string; linkedin?: string; portfolio?: string },
  hasExperience: boolean,
  hasQuantified: boolean,
  certCount: number,
  projScore: number
): string[] {
  const suggestions: string[] = [];

  if (!contact.github) {
    suggestions.push(
      'Add your GitHub profile link to showcase your code repositories.'
    );
  }
  if (!contact.linkedin) {
    suggestions.push(
      'Add your LinkedIn profile link to establish your professional network.'
    );
  }
  if (!contact.portfolio) {
    suggestions.push(
      'Add a portfolio website link to highlight your projects visually.'
    );
  }
  if (hasExperience && !hasQuantified) {
    suggestions.push(
      "Quantify your achievements (e.g. 'Reduced API latency by 40%', 'Managed team of 5 engineers')."
    );
  }
  if (certCount === 0) {
    suggestions.push(
      'Consider adding certifications from providers like AWS, Google, or Coursera to validate skills.'
    );
  }
  if (projScore < 15) {
    suggestions.push(
      'Expand project descriptions by detailing the problem solved, tech stack used, and github links.'
    );
  }

  return suggestions;
}

/**
 * Service to orchestrate parsing, extraction, scoring, and persistence.
 */
export async function generateAnalysis(
  resumeId: string,
  userId: string,
  force = false
): Promise<AIAnalysis> {
  // 1. Verify existence and ownership
  const resume = await getAndVerifyResume(resumeId, userId);

  // 2. Check cache: Avoid re-analysis if resume has not changed
  if (!force && resume.resume_text) {
    const existing = await query<AIAnalysis>(
      "SELECT * FROM ai_analysis WHERE resume_id = $1 AND analysis_type = 'RESUME_EXTRACT'",
      [resumeId]
    );
    if (existing.rows.length > 0) {
      logger.info(
        `[AI-Analysis] Returning cached analysis for resume ${resumeId}`
      );
      return existing.rows[0];
    }
  }

  let text = resume.resume_text || '';

  // 3. Parse PDF if raw text is missing or force is requested
  if (!text || force) {
    logger.info(
      `[AI-Analysis] Parsing resume file from storage path: ${resume.storage_path}`
    );
    const buffer = await storageService.downloadFile(resume.storage_path);
    text = await parsePdfToText(buffer);

    // Save parsed text to resumes table
    await query(
      'UPDATE resumes SET resume_text = $1, parsed_at = NOW(), updated_at = NOW() WHERE id = $2',
      [text, resumeId]
    );
  }

  // 4. Segment text and extract information
  const segments = segmentText(text);
  const skills = extractSkills(text);
  const education = extractEducation(segments.education);
  const experience = extractExperience(segments.experience);
  const projects = extractProjects(segments.projects);
  const certifications = extractCertifications(segments.certifications);
  const contact = extractContactInfo(text);

  // 5. Score categories
  const { overallScore, categoryScores } = calculateScores(
    skills,
    education,
    experience,
    projects,
    certifications,
    contact
  );

  // Check if work achievements contain metrics
  const hasExperience = experience.length > 0;
  const hasQuantified = experience.some(
    (e) =>
      e.achievements && e.achievements.some((ach) => METRIC_PATTERN.test(ach))
  );

  // 6. Generate feedback
  const strengths = generateStrengths(
    skills.length,
    categoryScores.education,
    categoryScores.experience,
    hasQuantified,
    categoryScores.projects,
    categoryScores.contact
  );

  const weaknesses = generateWeaknesses(
    skills.length,
    certifications.length,
    categoryScores.contact,
    hasExperience,
    hasQuantified,
    categoryScores.projects
  );

  const suggestions = generateSuggestions(
    contact,
    hasExperience,
    hasQuantified,
    certifications.length,
    categoryScores.projects
  );

  // Formulate legacy result structure for backward compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const legacyResult: any = {
    skills: skills.map((s) => s.name),
    education: education.map((e) => ({
      institution: e.university || 'Unknown',
      degree: e.degree || 'Degree',
    })),
    experience: experience.map((e) => ({
      company: e.company || 'Unknown',
      title: e.role || 'Role',
      duration: e.duration || 'Duration',
    })),
    summary: segments.general || 'No summary details parsed.',
    contactInfo: contact,
    categoryScores: categoryScores,
  };

  // 7. Save or update analysis record
  const checkAnalysis = await query(
    "SELECT id FROM ai_analysis WHERE resume_id = $1 AND analysis_type = 'RESUME_EXTRACT'",
    [resumeId]
  );

  let resultRow: AIAnalysis;

  if (checkAnalysis.rows.length > 0) {
    const updateRes = await query<AIAnalysis>(
      `UPDATE ai_analysis 
       SET score = $1, strengths = $2, weaknesses = $3, suggestions = $4,
           extracted_skills = $5, extracted_education = $6, extracted_experience = $7,
           extracted_projects = $8, extracted_certifications = $9, result = $10,
           updated_at = NOW()
       WHERE resume_id = $11 AND analysis_type = 'RESUME_EXTRACT'
       RETURNING *`,
      [
        overallScore,
        JSON.stringify(strengths),
        JSON.stringify(weaknesses),
        JSON.stringify(suggestions),
        JSON.stringify(skills),
        JSON.stringify(education),
        JSON.stringify(experience),
        JSON.stringify(projects),
        JSON.stringify(certifications),
        JSON.stringify(legacyResult),
        resumeId,
      ]
    );
    resultRow = updateRes.rows[0];
  } else {
    const insertRes = await query<AIAnalysis>(
      `INSERT INTO ai_analysis (
         resume_id, user_id, analysis_type, score, strengths, weaknesses, suggestions,
         extracted_skills, extracted_education, extracted_experience, extracted_projects,
         extracted_certifications, result
       ) VALUES ($1, $2, 'RESUME_EXTRACT', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        resumeId,
        userId,
        overallScore,
        JSON.stringify(strengths),
        JSON.stringify(weaknesses),
        JSON.stringify(suggestions),
        JSON.stringify(skills),
        JSON.stringify(education),
        JSON.stringify(experience),
        JSON.stringify(projects),
        JSON.stringify(certifications),
        JSON.stringify(legacyResult),
      ]
    );
    resultRow = insertRes.rows[0];
  }

  return resultRow;
}

/**
 * Retrieves the complete analysis report.
 */
export async function getAnalysis(
  resumeId: string,
  userId: string
): Promise<AIAnalysis> {
  // Enforce ownership
  await getAndVerifyResume(resumeId, userId);

  const res = await query<AIAnalysis>(
    "SELECT * FROM ai_analysis WHERE resume_id = $1 AND analysis_type = 'RESUME_EXTRACT'",
    [resumeId]
  );

  if (res.rows.length === 0) {
    // Automatically generate if it doesn't exist yet
    logger.info(
      `[AI-Analysis] Analysis not found for resume ${resumeId}, generating now`
    );
    return generateAnalysis(resumeId, userId);
  }

  return res.rows[0];
}
