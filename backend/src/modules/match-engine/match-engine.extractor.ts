import { SKILLS_DICTIONARY } from '../ai-analysis/ai-analysis.rules';
import { JobRequirements } from './match-engine.types';

/**
 * Escapes regex special characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Extracts requirements from a job posting's details (description, requirements, responsibilities).
 */
export function extractJobRequirements(
  description: string,
  requirements: string,
  responsibilities: string | null
): JobRequirements {
  const fullText = `${description}\n${requirements}\n${responsibilities || ''}`;
  const textLower = fullText.toLowerCase();

  // 1. Extract Skills
  const skills: string[] = [];
  for (const skill of SKILLS_DICTIONARY) {
    const escaped = escapeRegex(skill.name);
    const isAlphaNumeric = /^[a-z0-9]+$/i.test(skill.name);
    const regex = isAlphaNumeric
      ? new RegExp(`\\b${escaped}\\b`, 'i')
      : new RegExp(escaped, 'i');

    if (regex.test(textLower)) {
      skills.push(skill.name);
    }
  }

  // 2. Extract Certifications
  const certPatterns = [
    {
      name: 'AWS Certified',
      regex:
        /\baws\b.*\b(certified|certification|architect|practitioner|developer)\b/i,
    },
    {
      name: 'Azure Certified',
      regex:
        /\bazure\b.*\b(certified|certification|architect|developer|administrator)\b/i,
    },
    {
      name: 'Google Cloud Certified',
      regex:
        /\b(gcp|google cloud)\b.*\b(certified|certification|architect|developer)\b/i,
    },
    { name: 'PMP', regex: /\bpmp\b|\bproject management professional\b/i },
    { name: 'CCNA', regex: /\bccna\b|\bcisco certified network associate\b/i },
    { name: 'Scrum Master', regex: /\b(csm|psm|scrum master)\b/i },
    { name: 'NPTEL', regex: /\bnptel\b/i },
    { name: 'Coursera Certifications', regex: /\bcoursera\b/i },
    { name: 'Udemy Certifications', regex: /\budemy\b/i },
  ];

  const certifications: string[] = [];
  for (const pat of certPatterns) {
    if (pat.regex.test(fullText)) {
      certifications.push(pat.name);
    }
  }

  // 3. Extract Experience Years
  let experienceYears = 0;
  // Look for patterns like "3+ years", "at least 5 years", "2-5 years", "3 years of experience"
  const expRegexes = [
    /(?:minimum of|at least|require|needs?)\s*(\d+)\+?\s*(?:years?|yrs?)/i,
    /(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:relevant\s*)?experience/i,
    /\b(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)\b/i,
    /\b(\d+)\+?\s*(?:years?|yrs?)\b/i,
  ];

  for (const regex of expRegexes) {
    const match = fullText.match(regex);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 25) {
        experienceYears = parsed;
        break; // Match principal mentioned experience requirement
      }
    }
  }

  // 4. Extract Education Degrees
  const degreePatterns = [
    { name: 'PhD', regex: /\bph\.?d\b|\bdoctor of philosophy\b/i },
    {
      name: 'Master',
      regex: /\bmaster\b|\bm\.?s\b|\bm\.?tech\b|\bm\.?b\.?a\b/i,
    },
    {
      name: 'Bachelor',
      regex: /\bbachelor\b|\bb\.?s\b|\bb\.?e\b|\bb\.?tech\b/i,
    },
  ];

  const educationDegrees: string[] = [];
  for (const pat of degreePatterns) {
    if (pat.regex.test(fullText)) {
      educationDegrees.push(pat.name);
    }
  }

  // If no degree is found, check if "degree" is mentioned at all
  if (educationDegrees.length === 0 && /\bdegree\b/i.test(fullText)) {
    educationDegrees.push('Bachelor'); // Default baseline standard expectation if degree is general
  }

  return {
    skills,
    certifications,
    experienceYears,
    educationDegrees,
  };
}
