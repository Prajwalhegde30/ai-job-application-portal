import { JobRequirements, MatchAnalysisResult } from './match-engine.types';
import { METRIC_PATTERN } from '../ai-analysis/ai-analysis.rules';
import { AIAnalysis, ExtractedExperience } from '../../types/models';

/**
 * Normalizes years of experience from experience duration strings.
 * Parses strings like "2 years", "1.5 yrs", "18 months", or date ranges.
 */
function parseYearsOfExperience(entries: ExtractedExperience[]): number {
  if (!entries || entries.length === 0) return 0;
  let totalYears = 0;

  for (const entry of entries) {
    const durationStr = (entry.duration || '').toLowerCase();
    if (!durationStr) continue;

    // 1. Check for explicit "X years" or "X.Y years" or "X yrs"
    const yearsMatch = durationStr.match(/([0-9.]+)\s*(?:year|yr)/i);
    if (yearsMatch) {
      const y = parseFloat(yearsMatch[1]);
      if (!isNaN(y)) {
        totalYears += y;
        continue;
      }
    }

    // 2. Check for explicit "X months" or "X mos"
    const monthsMatch = durationStr.match(/(\d+)\s*(?:month|mo|mth)/i);
    if (monthsMatch) {
      const m = parseInt(monthsMatch[1], 10);
      if (!isNaN(m)) {
        totalYears += m / 12;
        continue;
      }
    }

    // 3. Fallback: Parse date formats like "2021 - 2023" or "Jan 2021 - Present"
    const years = durationStr.match(/\b(20\d{2})\b/g);
    if (years && years.length >= 2) {
      const start = parseInt(years[0], 10);
      const end = parseInt(years[1], 10);
      totalYears += Math.max(0.5, end - start);
    } else if (years && years.length === 1 && /present/i.test(durationStr)) {
      const start = parseInt(years[0], 10);
      const end = new Date().getFullYear();
      totalYears += Math.max(0.5, end - start);
    } else {
      // If duration is non-empty, award a default of 1 year as baseline
      totalYears += 1;
    }
  }

  return Math.round(totalYears * 10) / 10;
}

/**
 * Computes deterministic match scores based on requirements vs candidate data.
 */
export function calculateMatchScores(
  reqs: JobRequirements,
  resumeAnalysis: AIAnalysis
): MatchAnalysisResult {
  // Extract candidate information
  const candidateSkills = (resumeAnalysis.extracted_skills || []).map(
    (s) => s.name
  );
  const candidateEducation = resumeAnalysis.extracted_education || [];
  const candidateExperience = resumeAnalysis.extracted_experience || [];
  const candidateCertifications = resumeAnalysis.extracted_certifications || [];
  const candidateProjects = resumeAnalysis.extracted_projects || [];
  const contactInfo =
    (
      resumeAnalysis.result as unknown as {
        contactInfo?: Record<string, string>;
      }
    )?.contactInfo || {};

  // Case-insensitive sets for checking
  const candSkillsSet = new Set(candidateSkills.map((s) => s.toLowerCase()));
  const reqSkillsSet = new Set(reqs.skills.map((s) => s.toLowerCase()));

  // 1. Skill Classification
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  const additionalSkills: string[] = [];

  // Identify Matched and Missing required skills
  for (const skill of reqs.skills) {
    if (candSkillsSet.has(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  // Identify Additional skills
  for (const skill of candidateSkills) {
    if (!reqSkillsSet.has(skill.toLowerCase())) {
      additionalSkills.push(skill);
    }
  }

  // --- Skills Score (40 Points Max) ---
  let skillsScore = 40;
  if (reqs.skills.length > 0) {
    skillsScore = Math.round((matchedSkills.length / reqs.skills.length) * 40);
  }

  // --- Experience Match (25 Points Max) ---
  const candidateYears = parseYearsOfExperience(candidateExperience);
  let expYearsScore = 10;
  if (reqs.experienceYears > 0) {
    expYearsScore =
      candidateYears >= reqs.experienceYears
        ? 10
        : Math.round((candidateYears / reqs.experienceYears) * 10);
  }

  // Tech in Roles Score (8 pts max)
  let techInRolesScore = 8;
  if (reqs.skills.length > 0) {
    let matchedTechCount = 0;
    const fullExpText = candidateExperience
      .map(
        (e) =>
          `${e.company || ''} ${e.role || ''} ${e.duration || ''} ${(e.achievements || []).join(' ')}`
      )
      .join(' ')
      .toLowerCase();

    for (const skill of reqs.skills) {
      if (fullExpText.includes(skill.toLowerCase())) {
        matchedTechCount++;
      }
    }
    techInRolesScore = Math.min(8, matchedTechCount * 2);
  }

  // Achievements Score (7 pts max)
  let achievementsScore = 0;
  if (candidateExperience.length > 0) {
    achievementsScore = 3; // Baseline for having description
    let hasQuantified = false;

    for (const exp of candidateExperience) {
      const text = `${exp.role || ''} ${(exp.achievements || []).join(' ')}`;
      if (METRIC_PATTERN.test(text)) {
        hasQuantified = true;
        break;
      }
    }
    if (hasQuantified) {
      achievementsScore = 7;
    }
  }

  const experienceScore = expYearsScore + techInRolesScore + achievementsScore;

  // --- Education Match (15 Points Max) ---
  // Degree Level (8 pts max)
  let requiredDegreeLevel = 0;
  for (const deg of reqs.educationDegrees) {
    const norm = deg.toLowerCase();
    if (norm.includes('ph') || norm.includes('doctor'))
      requiredDegreeLevel = Math.max(requiredDegreeLevel, 3);
    else if (
      norm.includes('master') ||
      norm.includes('m.') ||
      norm.includes('mba')
    )
      requiredDegreeLevel = Math.max(requiredDegreeLevel, 2);
    else if (
      norm.includes('bachelor') ||
      norm.includes('b.') ||
      norm.includes('degree')
    )
      requiredDegreeLevel = Math.max(requiredDegreeLevel, 1);
  }

  let candidateDegreeLevel = 0;
  for (const edu of candidateEducation) {
    const norm = (edu.degree || '').toLowerCase();
    if (norm.includes('ph') || norm.includes('doctor'))
      candidateDegreeLevel = Math.max(candidateDegreeLevel, 3);
    else if (
      norm.includes('master') ||
      norm.includes('m.') ||
      norm.includes('mba')
    )
      candidateDegreeLevel = Math.max(candidateDegreeLevel, 2);
    else if (
      norm.includes('bachelor') ||
      norm.includes('b.') ||
      norm.includes('degree')
    )
      candidateDegreeLevel = Math.max(candidateDegreeLevel, 1);
  }

  let eduDegreeScore = 8;
  if (requiredDegreeLevel > 0) {
    if (candidateDegreeLevel >= requiredDegreeLevel) {
      eduDegreeScore = 8;
    } else if (candidateDegreeLevel > 0) {
      eduDegreeScore = 4;
    } else {
      eduDegreeScore = 2; // Baseline
    }
  }

  // Field Match (5 pts max)
  let eduFieldScore = 2;
  const csStemKeywords = [
    'computer',
    'software',
    'information',
    'system',
    'technology',
    'engineering',
    'science',
    'it',
    'mathematics',
    'physics',
    'stem',
    'data',
  ];
  for (const edu of candidateEducation) {
    const field = (edu.university || '').toLowerCase(); // Note: check degree description fields if university is mislabeled
    const degreeField = (edu.degree || '').toLowerCase();
    if (
      csStemKeywords.some(
        (kw) => field.includes(kw) || degreeField.includes(kw)
      )
    ) {
      eduFieldScore = 5;
      break;
    }
  }

  // Completion Year Status (2 pts max)
  let eduGradYearScore = 1;
  for (const edu of candidateEducation) {
    if (edu.graduationYear && edu.graduationYear > 0) {
      eduGradYearScore = 2;
      break;
    }
  }

  const educationScore = eduDegreeScore + eduFieldScore + eduGradYearScore;

  // --- Certification Match (10 Points Max) ---
  let certificationScore: number;
  if (reqs.certifications.length > 0) {
    let matchedCerts = 0;
    const candCertsText = candidateCertifications
      .map((c) => (c.name || '').toLowerCase())
      .join(' ');

    for (const cert of reqs.certifications) {
      if (candCertsText.includes(cert.toLowerCase())) {
        matchedCerts++;
      }
    }
    certificationScore = Math.round(
      (matchedCerts / reqs.certifications.length) * 10
    );
  } else {
    // If no certifications required, award points based on general professional certs
    if (candidateCertifications.length > 0) {
      certificationScore = Math.min(10, candidateCertifications.length * 5);
    } else {
      certificationScore = 8; // Default fallback to avoid penalizing candidates
    }
  }

  // --- Project Relevance (10 Points Max) ---
  // Presence of projects (3 pts max)
  let projectPresenceScore = 0;
  if (candidateProjects.length >= 2) projectPresenceScore = 3;
  else if (candidateProjects.length === 1) projectPresenceScore = 2;

  // Tech stack overlap (5 pts max)
  let projectTechOverlapScore = 0;
  if (candidateProjects.length > 0) {
    if (reqs.skills.length > 0) {
      let overlaps = 0;
      for (const proj of candidateProjects) {
        const stack = (proj.techStack || []).map((t) => t.toLowerCase());
        for (const skill of reqs.skills) {
          if (stack.includes(skill.toLowerCase())) {
            overlaps++;
          }
        }
      }
      projectTechOverlapScore = Math.min(5, overlaps * 2);
    } else {
      projectTechOverlapScore = 5;
    }
  }

  // Github presence (2 pts max)
  let githubPresenceScore = 0;
  const hasGitLink = candidateProjects.some((p) => !!p.githubLink);
  if (hasGitLink || !!contactInfo.github) {
    githubPresenceScore = 2;
  }

  const projectsScore =
    projectPresenceScore + projectTechOverlapScore + githubPresenceScore;

  // --- Final Aggregate score ---
  const matchScore =
    skillsScore +
    experienceScore +
    educationScore +
    certificationScore +
    projectsScore;

  return {
    matchScore: Math.min(100, Math.max(0, matchScore)),
    categoryScores: {
      skills: skillsScore,
      experience: experienceScore,
      education: educationScore,
      certifications: certificationScore,
      projects: projectsScore,
    },
    matchedSkills,
    missingSkills,
    additionalSkills,
    strengths: [],
    weaknesses: [],
    recommendations: [],
  };
}
