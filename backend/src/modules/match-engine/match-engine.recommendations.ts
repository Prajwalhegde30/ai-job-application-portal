import { JobRequirements, MatchAnalysisResult } from './match-engine.types';
import { AIAnalysis } from '../../types/models';

/**
 * Generates strengths, weaknesses (gaps), and recommendations.
 */
export function generateMatchFeedback(
  result: MatchAnalysisResult,
  reqs: JobRequirements,
  resumeAnalysis: AIAnalysis
): void {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  const candidateCertifications = resumeAnalysis.extracted_certifications || [];
  const candidateProjects = resumeAnalysis.extracted_projects || [];
  const contactInfo =
    (
      resumeAnalysis.result as unknown as {
        contactInfo?: Record<string, string>;
      }
    )?.contactInfo || {};

  // Helper to determine candidate years of experience
  const candidateExperience = resumeAnalysis.extracted_experience || [];
  let candidateYears = 0;
  for (const entry of candidateExperience) {
    const durationStr = (entry.duration || '').toLowerCase();
    const yearsMatch = durationStr.match(/([0-9.]+)\s*(?:year|yr)/i);
    if (yearsMatch) {
      const y = parseFloat(yearsMatch[1]);
      if (!isNaN(y)) candidateYears += y;
    }
  }

  // Helper to determine candidate highest degree level
  let candidateDegreeLevel = 0;
  for (const edu of candidateEducationList(resumeAnalysis)) {
    const norm = edu.toLowerCase();
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

  // --- STRENGTHS ---
  if (result.categoryScores.skills >= 30) {
    strengths.push('Excellent alignment with required technical skills.');
  }
  if (reqs.experienceYears > 0 && candidateYears >= reqs.experienceYears) {
    strengths.push(
      `Meets or exceeds the required experience of ${reqs.experienceYears} years.`
    );
  }
  if (result.categoryScores.experience >= 18) {
    strengths.push(
      'Strong professional history details with measurable project impact.'
    );
  }
  if (result.categoryScores.education >= 12) {
    strengths.push('Solid academic background matching required fields.');
  }
  if (
    candidateCertifications.length >= 2 ||
    (reqs.certifications.length > 0 &&
      result.categoryScores.certifications >= 8)
  ) {
    strengths.push(
      'Possesses professional certifications relevant to the domain.'
    );
  }
  if (result.categoryScores.projects >= 8) {
    strengths.push('Impressive project portfolio with tech stack overlap.');
  }
  if (strengths.length === 0) {
    strengths.push(
      'Structured resume sections align with standard job profiles.'
    );
  }

  // --- WEAKNESSES / GAPS ---
  if (result.missingSkills.length > 0) {
    const skillsList = result.missingSkills.slice(0, 3).join(', ');
    weaknesses.push(
      `Missing key technical skills required for this job: ${skillsList}.`
    );
  }
  if (reqs.experienceYears > 0 && candidateYears < reqs.experienceYears) {
    weaknesses.push(
      `Years of experience (${Math.round(candidateYears)} years) is below the required ${reqs.experienceYears} years.`
    );
  }
  if (requiredDegreeLevel > 0 && candidateDegreeLevel < requiredDegreeLevel) {
    weaknesses.push(
      `Highest degree level does not meet the preferred requirement (${reqs.educationDegrees.join(', ')}).`
    );
  }
  if (reqs.certifications.length > 0) {
    const missingCerts: string[] = [];
    const candCertsText = candidateCertifications
      .map((c) => (c.name || '').toLowerCase())
      .join(' ');
    for (const cert of reqs.certifications) {
      if (!candCertsText.includes(cert.toLowerCase())) {
        missingCerts.push(cert);
      }
    }
    if (missingCerts.length > 0) {
      weaknesses.push(
        `Missing preferred certifications: ${missingCerts.slice(0, 2).join(', ')}.`
      );
    }
  }
  if (candidateProjects.length === 0) {
    weaknesses.push('No personal or academic projects listed on the resume.');
  } else if (result.categoryScores.projects < 6) {
    weaknesses.push(
      'Listed projects show limited technology overlap with job requirements.'
    );
  }
  if (!contactInfo.github && !candidateProjects.some((p) => !!p.githubLink)) {
    weaknesses.push('Missing GitHub profile link or project repositories.');
  }

  // --- RECOMMENDATIONS ---
  if (result.missingSkills.length > 0) {
    result.missingSkills.forEach((skill) => {
      recommendations.push(
        `Learn ${skill} and build a small demonstration project to add to your portfolio.`
      );
    });
  }
  if (reqs.experienceYears > 0 && candidateYears < reqs.experienceYears) {
    recommendations.push(
      `Highlight equivalent freelance work, open-source contributions, or internship hours to bolster experience level.`
    );
  }
  if (requiredDegreeLevel > 0 && candidateDegreeLevel < requiredDegreeLevel) {
    recommendations.push(
      `Include online specializations, certificates, or bootcamps in lieu of formal degree expectations.`
    );
  }
  if (reqs.certifications.length > 0) {
    const candCertsText = candidateCertifications
      .map((c) => (c.name || '').toLowerCase())
      .join(' ');
    reqs.certifications.forEach((cert) => {
      if (!candCertsText.includes(cert.toLowerCase())) {
        recommendations.push(
          `Earn the ${cert} certification to validate your qualifications.`
        );
      }
    });
  }
  if (candidateProjects.length === 0) {
    const sampleTech = reqs.skills.slice(0, 2).join(' or ') || 'React/Node';
    recommendations.push(
      `Create 1-2 new software projects utilizing ${sampleTech} to exhibit technical capability.`
    );
  }
  if (!contactInfo.github && !candidateProjects.some((p) => !!p.githubLink)) {
    recommendations.push(
      'Create a GitHub profile, upload your project source codes, and link it in your contact info.'
    );
  }

  // Limit recommendations to top 5 most critical to avoid clutter
  result.strengths = strengths;
  result.weaknesses = weaknesses;
  result.recommendations = recommendations.slice(0, 5);
}

function candidateEducationList(resumeAnalysis: AIAnalysis): string[] {
  return (resumeAnalysis.extracted_education || []).map((e) => e.degree || '');
}
