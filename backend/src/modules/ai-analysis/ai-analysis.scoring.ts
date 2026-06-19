import {
  ExtractedSkill,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedProject,
  ExtractedCertification,
} from '../../types/models';
import { ContactInformation, CategoryScores } from './ai-analysis.types';
import { METRIC_PATTERN } from './ai-analysis.rules';

/**
 * Score Education Section: Max 20 points
 * Factors: Degree (5), University (5), Graduation Year (5), CGPA/GPA (5)
 */
export function scoreEducation(education: ExtractedEducation[]): number {
  if (education.length === 0) return 0;

  let score = 0;
  const hasDegree = education.some((e) => !!e.degree);
  const hasUniv = education.some((e) => !!e.university);
  const hasYear = education.some((e) => !!e.graduationYear);
  const hasGpa = education.some((e) => e.gpa !== undefined && e.gpa !== null);

  if (hasDegree) score += 5;
  if (hasUniv) score += 5;
  if (hasYear) score += 5;
  if (hasGpa) score += 5;

  return score;
}

/**
 * Score Experience Section: Max 25 points
 * Factors: Entries Present (15), Duration Clarity (5), Quantified Achievements (5)
 */
export function scoreExperience(experience: ExtractedExperience[]): number {
  if (experience.length === 0) return 0;

  let score = 0;

  // 1. Entries Present: 1 entry = 10 pts, >= 2 entries = 15 pts
  if (experience.length === 1) {
    score += 10;
  } else if (experience.length >= 2) {
    score += 15;
  }

  // 2. Duration Clarity: Do all entries have duration? (5 pts)
  const hasDurationCount = experience.filter((e) => !!e.duration).length;
  if (hasDurationCount === experience.length) {
    score += 5;
  } else if (hasDurationCount > 0) {
    score += 3;
  }

  // 3. Quantified Achievements: Scan achievements for metrics (5 pts)
  let hasQuantified = false;
  for (const entry of experience) {
    if (entry.achievements && entry.achievements.length > 0) {
      const match = entry.achievements.some((ach) => METRIC_PATTERN.test(ach));
      if (match) {
        hasQuantified = true;
        break;
      }
    }
  }

  if (hasQuantified) score += 5;

  return score;
}

/**
 * Score Project Section: Max 20 points
 * Factors: Project Count (10), Tech Stack (5), Description Quality (3), GitHub Link (2)
 */
export function scoreProjects(projects: ExtractedProject[]): number {
  if (projects.length === 0) return 0;

  let score = 0;

  // 1. Count: 1 project = 5 pts, >= 2 projects = 10 pts
  if (projects.length === 1) {
    score += 5;
  } else if (projects.length >= 2) {
    score += 10;
  }

  // 2. Tech Stack: Tech stack present on any project (5 pts)
  const hasTech = projects.some((p) => p.techStack && p.techStack.length > 0);
  if (hasTech) score += 5;

  // 3. Description Quality: Long description present on any project (3 pts)
  const hasDesc = projects.some(
    (p) => p.description && p.description.length > 50
  );
  if (hasDesc) score += 3;

  // 4. GitHub Link: GitHub links present on any project (2 pts)
  const hasGithub = projects.some((p) => !!p.githubLink);
  if (hasGithub) score += 2;

  return score;
}

/**
 * Score Skills Section: Max 15 points
 * Factors: Count (1-2 = 5, 3-5 = 10, >5 = 15)
 */
export function scoreSkills(skills: ExtractedSkill[]): number {
  const count = skills.length;
  if (count === 0) return 0;
  if (count <= 2) return 5;
  if (count <= 5) return 10;
  return 15;
}

/**
 * Score Certifications: Max 10 points
 * Factors: Count (1 cert = 5, >= 2 certs = 10)
 */
export function scoreCertifications(certs: ExtractedCertification[]): number {
  const count = certs.length;
  if (count === 0) return 0;
  if (count === 1) return 5;
  return 10;
}

/**
 * Score Contact Completeness: Max 10 points
 * Factors: Email (2), Phone (2), LinkedIn (2), GitHub (2), Portfolio (2)
 */
export function scoreContact(contact: ContactInformation): number {
  let score = 0;
  if (contact.email) score += 2;
  if (contact.phone) score += 2;
  if (contact.linkedin) score += 2;
  if (contact.github) score += 2;
  if (contact.portfolio) score += 2;
  return score;
}

/**
 * Orchestrates scoring for all categories
 */
export function calculateScores(
  skills: ExtractedSkill[],
  education: ExtractedEducation[],
  experience: ExtractedExperience[],
  projects: ExtractedProject[],
  certifications: ExtractedCertification[],
  contact: ContactInformation
): { overallScore: number; categoryScores: CategoryScores } {
  const educationScore = scoreEducation(education);
  const experienceScore = scoreExperience(experience);
  const projectsScore = scoreProjects(projects);
  const skillsScore = scoreSkills(skills);
  const certificationsScore = scoreCertifications(certifications);
  const contactScore = scoreContact(contact);

  const overallScore =
    educationScore +
    experienceScore +
    projectsScore +
    skillsScore +
    certificationsScore +
    contactScore;

  return {
    overallScore,
    categoryScores: {
      education: educationScore,
      experience: experienceScore,
      projects: projectsScore,
      skills: skillsScore,
      certifications: certificationsScore,
      contact: contactScore,
    },
  };
}
