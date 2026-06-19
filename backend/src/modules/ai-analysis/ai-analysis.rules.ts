import { ExtractedSkill } from '../../types/models';

// Skills Dictionary with Category Mappings
export const SKILLS_DICTIONARY: {
  name: string;
  category: ExtractedSkill['category'];
}[] = [
  // Programming Languages
  { name: 'python', category: 'Language' },
  { name: 'javascript', category: 'Language' },
  { name: 'typescript', category: 'Language' },
  { name: 'java', category: 'Language' },
  { name: 'c++', category: 'Language' },
  { name: 'c#', category: 'Language' },
  { name: 'ruby', category: 'Language' },
  { name: 'golang', category: 'Language' },
  { name: 'go', category: 'Language' },
  { name: 'rust', category: 'Language' },
  { name: 'php', category: 'Language' },
  { name: 'swift', category: 'Language' },
  { name: 'kotlin', category: 'Language' },
  { name: 'sql', category: 'Language' },
  { name: 'html', category: 'Language' },
  { name: 'css', category: 'Language' },

  // Frameworks
  { name: 'react', category: 'Framework' },
  { name: 'next.js', category: 'Framework' },
  { name: 'vue', category: 'Framework' },
  { name: 'angular', category: 'Framework' },
  { name: 'svelte', category: 'Framework' },
  { name: 'express', category: 'Framework' },
  { name: 'express.js', category: 'Framework' },
  { name: 'nest.js', category: 'Framework' },
  { name: 'nestjs', category: 'Framework' },
  { name: 'django', category: 'Framework' },
  { name: 'flask', category: 'Framework' },
  { name: 'spring boot', category: 'Framework' },
  { name: 'laravel', category: 'Framework' },
  { name: 'asp.net', category: 'Framework' },
  { name: 'fastapi', category: 'Framework' },

  // Databases
  { name: 'postgresql', category: 'Database' },
  { name: 'postgres', category: 'Database' },
  { name: 'mysql', category: 'Database' },
  { name: 'mongodb', category: 'Database' },
  { name: 'redis', category: 'Database' },
  { name: 'sqlite', category: 'Database' },
  { name: 'mariadb', category: 'Database' },
  { name: 'oracle', category: 'Database' },
  { name: 'dynamodb', category: 'Database' },
  { name: 'cassandra', category: 'Database' },

  // Cloud Platforms
  { name: 'aws', category: 'Cloud' },
  { name: 'amazon web services', category: 'Cloud' },
  { name: 'google cloud', category: 'Cloud' },
  { name: 'gcp', category: 'Cloud' },
  { name: 'azure', category: 'Cloud' },
  { name: 'heroku', category: 'Cloud' },
  { name: 'vercel', category: 'Cloud' },
  { name: 'netlify', category: 'Cloud' },

  // Tools
  { name: 'docker', category: 'Tool' },
  { name: 'kubernetes', category: 'Tool' },
  { name: 'git', category: 'Tool' },
  { name: 'github', category: 'Tool' },
  { name: 'gitlab', category: 'Tool' },
  { name: 'jenkins', category: 'Tool' },
  { name: 'terraform', category: 'Tool' },
  { name: 'ansible', category: 'Tool' },
  { name: 'webpack', category: 'Tool' },
  { name: 'vite', category: 'Tool' },
  { name: 'npm', category: 'Tool' },
  { name: 'yarn', category: 'Tool' },
  { name: 'pnpm', category: 'Tool' },
  { name: 'jira', category: 'Tool' },
];

// Keywords to match sections
export const SECTION_PATTERNS = {
  skills:
    /\b(?:skills|technical skills|technologies|expertise|skills & expertise|core competencies)\b/i,
  education:
    /\b(?:education|academic background|academic details|academic record|qualifications)\b/i,
  experience:
    /\b(?:experience|work experience|employment history|professional experience|work history|career history)\b/i,
  projects:
    /\b(?:projects|key projects|personal projects|academic projects|project work)\b/i,
  certifications:
    /\b(?:certifications|licenses & certifications|credentials|professional certifications)\b/i,
  achievements: /\b(?:achievements|awards|awards & achievements|honors)\b/i,
  contact:
    /\b(?:contact|contact information|personal info|personal details)\b/i,
};

// Patterns for contact information extraction
export const CONTACT_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  linkedin: /linkedin\.com\/in\/[a-zA-Z0-9_-]+/i,
  github: /github\.com\/[a-zA-Z0-9_-]+/i,
  portfolio:
    /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?:\/[^\s]*)?/i,
};

// Education specific search patterns
export const EDUCATION_PATTERNS = {
  degree:
    /(?:B\.?S\.?|B\.?E\.?|B\.?Tech|M\.?S\.?|M\.?Tech|Ph\.?D|Bachelor|Master|Degree|Associate|Diploma|Doctor of Philosophy|Science|Engineering|Arts)/i,
  university:
    /(?:University|College|Institute|Academy|School|IIT|NIT|BITS|IIIT|Harvard|Stanford|MIT|Oxford|Cambridge)/i,
  year: /\b(19|20)\d{2}\b/,
  gpa: /(?:GPA|CGPA|Grade|Marks|Percentage)[:\s]+([0-9.]+)|([0-9.]+)\s*(?:\/\s*(?:4|10))|\b([7-9]\.\d+)\b/i,
};

// Experience duration parsing pattern (to verify presence of dates/durations)
export const DURATION_PATTERN =
  /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|\d{1,2}\/\d{2,4})\s*\d{2,4}\s*[-–to]+\s*(?:Present|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December|\d{1,2}\/\d{2,4})\s*\d{2,4}|\b\d{4}\s*-\s*\d{4}\b/i;

// Quantified metric patterns (for scoring)
export const METRIC_PATTERN =
  /\b(?:\d+%\s*|\d+\s*(?:percent|x|fold)|(?:\$|USD)\s*\d+(?:\.\d+)?[kKmMbB]?)\b|\b(?:optimized|reduced|increased|improved|saved|delivered|managed)\b.*\b\d+\b/i;

// Certification Providers
export const CERTIFICATION_PROVIDERS = [
  { pattern: /aws|amazon/i, name: 'AWS' },
  { pattern: /google|gcp/i, name: 'Google Cloud' },
  { pattern: /microsoft|azure/i, name: 'Microsoft' },
  { pattern: /coursera/i, name: 'Coursera' },
  { pattern: /udemy/i, name: 'Udemy' },
  { pattern: /nptel/i, name: 'NPTEL' },
  { pattern: /ccna|cisco/i, name: 'Cisco' },
  { pattern: /scrum|psm|csm/i, name: 'Scrum Alliance' },
  { pattern: /oracle/i, name: 'Oracle' },
];
