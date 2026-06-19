// eslint-disable-next-line @typescript-eslint/no-require-imports
import pdf = require('pdf-parse');
import {
  ExtractedSkill,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedProject,
  ExtractedCertification,
} from '../../types/models';
import {
  SKILLS_DICTIONARY,
  SECTION_PATTERNS,
  CONTACT_PATTERNS,
  EDUCATION_PATTERNS,
  DURATION_PATTERN,
  CERTIFICATION_PROVIDERS,
} from './ai-analysis.rules';
import { ContactInformation } from './ai-analysis.types';

/**
 * Parses binary buffer to text, handles fallback for mock text PDFs
 */
export async function parsePdfToText(buffer: Buffer): Promise<string> {
  const firstBytes = buffer.toString('utf8', 0, 4);
  if (firstBytes === '%PDF') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = await (pdf as any)(buffer);
      // If parsing resulted in empty text, fall back to string decode
      if (parsed.text && parsed.text.trim().length > 0) {
        return parsed.text;
      }
      return buffer.toString('utf8');
    } catch {
      // Fallback for mock PDFs that just contain string content
      return buffer.toString('utf8');
    }
  }
  return buffer.toString('utf8');
}

/**
 * Segments raw text into a record of section contents
 */
export function segmentText(rawText: string): Record<string, string> {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());
  const sections: Record<string, string[]> = {
    skills: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    achievements: [],
    contact: [],
    general: [], // anything before the first section
  };

  let activeSection = 'general';

  for (const line of lines) {
    if (!line) continue;

    // Detect section header (short line matching header keyword)
    if (
      line.length < 50 &&
      !line.startsWith('-') &&
      !line.startsWith('•') &&
      !line.startsWith('*')
    ) {
      let matched = false;
      for (const [secName, regex] of Object.entries(SECTION_PATTERNS)) {
        if (regex.test(line)) {
          activeSection = secName;
          matched = true;
          break;
        }
      }
      if (matched) continue;
    }

    sections[activeSection].push(line);
  }

  // Join lines back into paragraphs/text blocks
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(sections)) {
    result[key] = value.join('\n');
  }
  return result;
}

/**
 * Extract contact information from text
 */
export function extractContactInfo(text: string): ContactInformation {
  const info: ContactInformation = {};

  const emailMatch = text.match(CONTACT_PATTERNS.email);
  if (emailMatch) info.email = emailMatch[0];

  const phoneMatch = text.match(CONTACT_PATTERNS.phone);
  if (phoneMatch) info.phone = phoneMatch[0];

  const linkedinMatch = text.match(CONTACT_PATTERNS.linkedin);
  if (linkedinMatch)
    info.linkedin = 'https://' + linkedinMatch[0].replace(/https?:\/\//i, '');

  const githubMatch = text.match(CONTACT_PATTERNS.github);
  if (githubMatch)
    info.github = 'https://' + githubMatch[0].replace(/https?:\/\//i, '');

  // For portfolio, find links that are NOT github/linkedin
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const portfolioMatch = line.match(CONTACT_PATTERNS.portfolio);
    if (portfolioMatch) {
      const matchStr = portfolioMatch[0];
      if (!/github|linkedin/i.test(matchStr)) {
        info.portfolio = matchStr.startsWith('http')
          ? matchStr
          : 'https://' + matchStr;
        break;
      }
    }
  }

  return info;
}

/**
 * Extract skills based on vocabulary dictionary matching
 */
export function extractSkills(text: string): ExtractedSkill[] {
  const textLower = text.toLowerCase();
  const found: ExtractedSkill[] = [];

  for (const skill of SKILLS_DICTIONARY) {
    const escaped = skill.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // For purely alphanumeric skills (e.g. go, aws), enforce word boundary.
    // For others (e.g. c++, next.js), match exact sub-sequence.
    const isAlphaNumeric = /^[a-z0-9]+$/i.test(skill.name);
    const regex = isAlphaNumeric
      ? new RegExp(`\\b${escaped}\\b`, 'i')
      : new RegExp(escaped, 'i');

    if (regex.test(textLower)) {
      found.push(skill);
    }
  }
  return found;
}

/**
 * Extract Education entries
 */
export function extractEducation(educationText: string): ExtractedEducation[] {
  if (!educationText) return [];
  const lines = educationText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: ExtractedEducation[] = [];
  let currentEntry: ExtractedEducation = {};

  for (const line of lines) {
    const hasUniv = EDUCATION_PATTERNS.university.test(line);
    const hasDegree = EDUCATION_PATTERNS.degree.test(line);

    // Grouping strategy: Start a new entry only if we already have the same field populated
    if (
      (hasUniv && currentEntry.university) ||
      (hasDegree && currentEntry.degree)
    ) {
      entries.push(currentEntry);
      currentEntry = {};
    }

    if (hasUniv) {
      currentEntry.university = line;
    }
    if (hasDegree) {
      currentEntry.degree = line;
    }

    const yearMatch = line.match(EDUCATION_PATTERNS.year);
    if (yearMatch) {
      currentEntry.graduationYear = parseInt(yearMatch[0], 10);
    }

    const gpaMatch = line.match(EDUCATION_PATTERNS.gpa);
    if (gpaMatch) {
      const gpaStr = gpaMatch[1] || gpaMatch[2] || gpaMatch[3];
      currentEntry.gpa = parseFloat(gpaStr);
    }
  }

  if (currentEntry.university || currentEntry.degree) {
    entries.push(currentEntry);
  }

  return entries;
}

/**
 * Extract Experience entries
 */
export function extractExperience(
  experienceText: string
): ExtractedExperience[] {
  if (!experienceText) return [];
  const lines = experienceText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: ExtractedExperience[] = [];
  let currentEntry: ExtractedExperience = {};

  for (const line of lines) {
    const isCompany =
      /\b(?:Inc|Ltd|Co|Corporation|Company)\b/i.test(line) ||
      /(?:Google|Microsoft|Amazon|Meta|Netflix|Apple|Infosys|TCS|Wipro|Cognizant)/i.test(
        line
      );
    const isRole =
      /\b(?:Engineer|Developer|Manager|Analyst|Consultant|Specialist|Lead|Architect|Intern|Designer|Officer)\b/i.test(
        line
      );

    // Commit previous entry if the field we found is already populated
    if ((isCompany && currentEntry.company) || (isRole && currentEntry.role)) {
      entries.push(currentEntry);
      currentEntry = {};
    }

    if (isCompany && !currentEntry.company) {
      currentEntry.company = line;
    } else if (isRole && !currentEntry.role) {
      currentEntry.role = line;
    }

    const durationMatch = line.match(DURATION_PATTERN);
    if (durationMatch) {
      currentEntry.duration = durationMatch[0];
    }

    // Achievements or bullet points
    if (
      line.startsWith('-') ||
      line.startsWith('•') ||
      line.startsWith('*') ||
      line.length > 30
    ) {
      // Do not treat company names or roles as achievements
      if (!isCompany && !isRole && !durationMatch) {
        if (!currentEntry.achievements) currentEntry.achievements = [];
        currentEntry.achievements.push(line.replace(/^[-•*]\s*/, ''));
      }
    }
  }

  if (currentEntry.company || currentEntry.role) {
    entries.push(currentEntry);
  }

  return entries;
}

/**
 * Extract Projects entries
 */
export function extractProjects(projectsText: string): ExtractedProject[] {
  if (!projectsText) return [];
  const lines = projectsText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: ExtractedProject[] = [];
  let currentEntry: ExtractedProject = {};

  for (const line of lines) {
    // If a line is short and doesn't start with bullet point, it's likely a project name
    const isProjectHeader =
      line.length < 50 &&
      !line.startsWith('-') &&
      !line.startsWith('•') &&
      !line.startsWith('*') &&
      !/http/i.test(line);

    if (isProjectHeader && currentEntry.projectName) {
      entries.push(currentEntry);
      currentEntry = {};
    }

    if (isProjectHeader && !currentEntry.projectName) {
      currentEntry.projectName = line;
    } else {
      const githubMatch = line.match(CONTACT_PATTERNS.github);
      if (githubMatch) {
        currentEntry.githubLink =
          'https://' + githubMatch[0].replace(/https?:\/\//i, '');
      }

      // Check tech stack keywords
      const lineLower = line.toLowerCase();
      const detectedTech: string[] = [];
      const keywords = [
        'react',
        'next.js',
        'node.js',
        'typescript',
        'javascript',
        'python',
        'django',
        'postgresql',
        'mongodb',
        'docker',
        'aws',
      ];
      for (const kw of keywords) {
        if (lineLower.includes(kw)) {
          detectedTech.push(kw);
        }
      }

      if (detectedTech.length > 0) {
        if (!currentEntry.techStack) currentEntry.techStack = [];
        currentEntry.techStack = Array.from(
          new Set([...currentEntry.techStack, ...detectedTech])
        );
      }

      currentEntry.description = (
        (currentEntry.description || '') +
        ' ' +
        line
      ).trim();
    }
  }

  if (currentEntry.projectName) {
    entries.push(currentEntry);
  }

  return entries;
}

/**
 * Extract Certifications
 */
export function extractCertifications(
  certText: string
): ExtractedCertification[] {
  if (!certText) return [];
  const lines = certText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: ExtractedCertification[] = [];

  for (const line of lines) {
    let provider = '';
    for (const prov of CERTIFICATION_PROVIDERS) {
      if (prov.pattern.test(line)) {
        provider = prov.name;
        break;
      }
    }

    const yearMatch = line.match(EDUCATION_PATTERNS.year);

    entries.push({
      name: line.replace(/^[-•*]\s*/, ''),
      provider: provider || undefined,
      date: yearMatch ? yearMatch[0] : undefined,
    });
  }

  return entries;
}
