import { AIProvider } from './ai-provider.interface';
import { metricsService } from '../metrics/metrics.service';
import {
  CareerAdviceContext,
  CareerAdviceResult,
  CareerPathEntry,
  SkillRecommendation,
  ProjectSuggestion,
  InterviewTip,
  SalaryInsights,
} from './ai-provider.types';

/**
 * Mock AI Provider
 *
 * Deterministic, rule-based provider for development and testing.
 * Generates career advice from structured context without any external API calls.
 */
export class MockProvider implements AIProvider {
  readonly name = 'Mock AI';

  async generateCareerAdvice(
    context: CareerAdviceContext
  ): Promise<CareerAdviceResult> {
    metricsService.incrementAIRequest('mock');
    const careerPaths = this.generateCareerPaths(context);
    const skillRecommendations = this.generateSkillRecommendations(context);
    const projectSuggestions = this.generateProjectSuggestions(context);
    const interviewTips = this.generateInterviewTips(context);
    const salaryInsights = this.generateSalaryInsights(context);
    const confidenceScore = this.calculateConfidence(context);
    const overallSummary = this.generateSummary(context, confidenceScore);

    return {
      overallSummary,
      confidenceScore,
      careerPaths,
      skillRecommendations,
      projectSuggestions,
      interviewTips,
      salaryInsights,
    };
  }

  private generateCareerPaths(context: CareerAdviceContext): CareerPathEntry[] {
    const paths: CareerPathEntry[] = [];
    const { matchScores, jobInfo } = context;

    // Primary path: the job they applied for
    paths.push({
      title: jobInfo.title,
      description: `Continue developing expertise for the ${jobInfo.title} role at ${jobInfo.company}. Your current match score is ${matchScores.overall}%.`,
      timeframe: '0-6 months',
      relevance: 'high',
    });

    // If skills score is strong, suggest senior path
    if (matchScores.skills >= 30) {
      paths.push({
        title: `Senior ${jobInfo.title}`,
        description: `Your strong technical skill alignment positions you well for advancement. Focus on leadership and system design to progress.`,
        timeframe: '1-2 years',
        relevance: 'high',
      });
    }

    // If experience is lower, suggest specialization
    if (matchScores.experience < 15) {
      const topSkill =
        context.matchedSkills[0] || context.skills[0]?.name || 'your field';
      paths.push({
        title: `${topSkill} Specialist`,
        description: `Deepen your expertise in ${topSkill} to compensate for limited years of experience. Specialization accelerates career growth.`,
        timeframe: '6-12 months',
        relevance: 'medium',
      });
    }

    // Always suggest a lateral path
    paths.push({
      title: 'Technical Lead / Engineering Manager',
      description:
        'As you accumulate domain expertise, consider transitioning into a technical leadership role combining coding and mentorship.',
      timeframe: '2-4 years',
      relevance: 'low',
    });

    return paths;
  }

  private generateSkillRecommendations(
    context: CareerAdviceContext
  ): SkillRecommendation[] {
    const recommendations: SkillRecommendation[] = [];

    // Critical: missing skills required by the job
    for (const skill of context.missingSkills.slice(0, 3)) {
      recommendations.push({
        skill,
        priority: 'critical',
        reason: `${skill} is required by the ${context.jobInfo.title} role but was not detected in your profile.`,
        resources: [
          `Official ${skill} documentation`,
          `Udemy/Coursera ${skill} certification course`,
          `Build a hands-on project using ${skill}`,
        ],
        estimatedTime: '2-4 weeks',
      });
    }

    // Important: skills with low match scores
    if (context.matchScores.certifications < 5) {
      const cert =
        context.jobInfo.requiredCertifications[0] || 'industry certification';
      recommendations.push({
        skill: cert,
        priority: 'important',
        reason: `Professional certifications strengthen your profile significantly. Consider earning a ${cert}.`,
        resources: [
          `${cert} official preparation guide`,
          'Practice exams and study groups',
        ],
        estimatedTime: '1-3 months',
      });
    }

    // Nice to have: general improvement
    if (context.projects.length < 3) {
      recommendations.push({
        skill: 'Portfolio Development',
        priority: 'nice-to-have',
        reason:
          'Building more projects demonstrates practical ability and improves your visibility to recruiters.',
        resources: [
          'GitHub portfolio best practices',
          'Open source contribution guides',
        ],
        estimatedTime: '1-2 months',
      });
    }

    return recommendations;
  }

  private generateProjectSuggestions(
    context: CareerAdviceContext
  ): ProjectSuggestion[] {
    const suggestions: ProjectSuggestion[] = [];
    const missingTech = context.missingSkills.slice(0, 2);
    const matchedTech = context.matchedSkills.slice(0, 2);

    if (missingTech.length > 0) {
      suggestions.push({
        title: `${missingTech.join(' + ')} Demo Application`,
        description: `Build a full-stack application using ${missingTech.join(' and ')} to demonstrate proficiency in these required technologies.`,
        techStack: missingTech,
        difficulty: 'intermediate',
        estimatedHours: 20,
      });
    }

    if (matchedTech.length > 0) {
      suggestions.push({
        title: `Advanced ${matchedTech[0]} Portfolio Project`,
        description: `Create an advanced project showcasing deep ${matchedTech[0]} expertise — include testing, CI/CD, and deployment.`,
        techStack: matchedTech,
        difficulty: 'advanced',
        estimatedHours: 30,
      });
    }

    suggestions.push({
      title: 'Open Source Contribution',
      description: `Contribute to a popular open-source project related to ${context.jobInfo.title}. This builds credibility and community connections.`,
      techStack: context.matchedSkills.slice(0, 3),
      difficulty: 'intermediate',
      estimatedHours: 15,
    });

    return suggestions;
  }

  private generateInterviewTips(context: CareerAdviceContext): InterviewTip[] {
    const tips: InterviewTip[] = [];

    tips.push({
      category: 'Technical Preparation',
      tip: `Review core ${context.jobInfo.requiredSkills.slice(0, 3).join(', ')} concepts thoroughly before the interview.`,
      example: `Be ready to explain how you used ${context.matchedSkills[0] || 'your primary skill'} to solve a real problem at ${context.experience[0]?.company || 'a previous role'}.`,
    });

    tips.push({
      category: 'Behavioral Questions',
      tip: 'Prepare STAR-format stories (Situation, Task, Action, Result) for common behavioral questions.',
      example:
        'Describe a time you resolved a conflict in a team, or led a challenging project to completion.',
    });

    if (context.missingSkills.length > 0) {
      tips.push({
        category: 'Addressing Skill Gaps',
        tip: `Be upfront about skills you are still learning (${context.missingSkills.slice(0, 2).join(', ')}). Show enthusiasm and a concrete plan to learn them.`,
        example: `"I have not used ${context.missingSkills[0]} in production yet, but I have completed a course and built a personal project with it."`,
      });
    }

    tips.push({
      category: 'Company Research',
      tip: `Research ${context.jobInfo.company} thoroughly — their products, recent news, engineering culture, and tech stack.`,
      example: `Mention specific ${context.jobInfo.company} products or initiatives during the interview to show genuine interest.`,
    });

    return tips;
  }

  private generateSalaryInsights(context: CareerAdviceContext): SalaryInsights {
    const expYears =
      context.experience.length > 0
        ? Math.max(
            ...context.experience.map((e) => {
              const match = e.duration?.match(/(\d+)/);
              return match ? parseInt(match[1], 10) : 1;
            })
          )
        : 0;

    let range: string;
    if (expYears <= 2) {
      range = '$60,000 - $90,000';
    } else if (expYears <= 5) {
      range = '$90,000 - $140,000';
    } else {
      range = '$140,000 - $200,000+';
    }

    return {
      estimatedRange: range,
      marketTrend: `Demand for ${context.jobInfo.title} roles is strong and growing. Candidates with ${context.matchedSkills.slice(0, 3).join(', ')} command premium salaries.`,
      negotiationTips: [
        'Research salary data on Glassdoor, Levels.fyi, and LinkedIn Salary.',
        'Highlight quantified achievements when discussing compensation.',
        `Your match score of ${context.matchScores.overall}% gives you a solid negotiation position.`,
      ],
    };
  }

  private calculateConfidence(context: CareerAdviceContext): number {
    // Confidence is based on data completeness
    let score = 50; // base

    if (context.skills.length > 3) score += 10;
    if (context.education.length > 0) score += 10;
    if (context.experience.length > 0) score += 10;
    if (context.projects.length > 0) score += 5;
    if (context.certifications.length > 0) score += 5;
    if (context.matchScores.overall > 0) score += 10;

    return Math.min(score, 100);
  }

  private generateSummary(
    context: CareerAdviceContext,
    confidence: number
  ): string {
    const { matchScores, jobInfo, matchedSkills, missingSkills } = context;

    if (matchScores.overall >= 80) {
      return `Excellent profile alignment for the ${jobInfo.title} position at ${jobInfo.company}! Your skills in ${matchedSkills.slice(0, 3).join(', ')} are a strong match. Focus on interview preparation and showcasing your experience. Confidence: ${confidence}%.`;
    } else if (matchScores.overall >= 50) {
      return `Good potential for the ${jobInfo.title} role at ${jobInfo.company}. You have solid skills in ${matchedSkills.slice(0, 2).join(' and ')}${missingSkills.length > 0 ? `, but should prioritize learning ${missingSkills.slice(0, 2).join(' and ')}` : ''}. With targeted preparation, you can strengthen your candidacy. Confidence: ${confidence}%.`;
    } else {
      return `The ${jobInfo.title} position at ${jobInfo.company} requires significant skill development. Focus on acquiring ${missingSkills.slice(0, 3).join(', ')} through courses and projects. Consider building a stronger portfolio before applying to similar roles. Confidence: ${confidence}%.`;
    }
  }
}
