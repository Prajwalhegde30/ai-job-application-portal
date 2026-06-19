'use client';

import type { CareerAdviceReport } from '@/hooks/useCareerAdvice';
import {
  Sparkles,
  TrendingUp,
  BookOpen,
  Hammer,
  MessageCircle,
  DollarSign,
  ChevronRight,
  Clock,
  ExternalLink,
  Zap,
  Shield,
  Star,
  Target,
} from 'lucide-react';
import { useState } from 'react';

interface CareerAdvisorCardProps {
  report: CareerAdviceReport;
}

// =============================================================================
// Priority / Relevance / Difficulty Config
// =============================================================================

const PRIORITY_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  critical: {
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    label: 'Critical',
  },
  important: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    label: 'Important',
  },
  'nice-to-have': {
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/30',
    label: 'Nice to Have',
  },
};

const RELEVANCE_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode }
> = {
  high: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    icon: <Zap className="h-4 w-4" />,
  },
  medium: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    icon: <Target className="h-4 w-4" />,
  },
  low: {
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    icon: <Clock className="h-4 w-4" />,
  },
};

const DIFFICULTY_CONFIG: Record<string, { color: string; label: string }> = {
  beginner: { color: 'text-emerald-400', label: 'Beginner' },
  intermediate: { color: 'text-amber-400', label: 'Intermediate' },
  advanced: { color: 'text-red-400', label: 'Advanced' },
};

// =============================================================================
// Main Component
// =============================================================================

export function CareerAdvisorCard({ report }: CareerAdvisorCardProps) {
  const [activeTab, setActiveTab] = useState<
    'paths' | 'skills' | 'projects' | 'interview' | 'salary'
  >('paths');

  const tabs = [
    {
      key: 'paths' as const,
      label: 'Career Paths',
      icon: <TrendingUp className="h-4 w-4" />,
      count: report.careerPaths.length,
    },
    {
      key: 'skills' as const,
      label: 'Skills',
      icon: <BookOpen className="h-4 w-4" />,
      count: report.skillRecommendations.length,
    },
    {
      key: 'projects' as const,
      label: 'Projects',
      icon: <Hammer className="h-4 w-4" />,
      count: report.projectSuggestions.length,
    },
    {
      key: 'interview' as const,
      label: 'Interview',
      icon: <MessageCircle className="h-4 w-4" />,
      count: report.interviewTips.length,
    },
    {
      key: 'salary' as const,
      label: 'Salary',
      icon: <DollarSign className="h-4 w-4" />,
      count: 0,
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-violet-950/20 to-slate-900/80">
      {/* Header */}
      <div className="border-b border-slate-800/80 bg-gradient-to-r from-violet-950/40 to-indigo-950/30 px-6 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20 text-violet-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                AI Career Advisor
              </h2>
              <p className="text-xs text-slate-400">
                Personalized career guidance powered by {report.provider}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge score={report.confidenceScore} />
          </div>
        </div>

        {/* Summary */}
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {report.overallSummary}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex overflow-x-auto border-b border-slate-800/60">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'border-b-2 border-violet-400 bg-violet-500/5 text-violet-300'
                : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab.key
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'paths' && <CareerPathsTab paths={report.careerPaths} />}
        {activeTab === 'skills' && (
          <SkillsTab recommendations={report.skillRecommendations} />
        )}
        {activeTab === 'projects' && (
          <ProjectsTab suggestions={report.projectSuggestions} />
        )}
        {activeTab === 'interview' && (
          <InterviewTab tips={report.interviewTips} />
        )}
        {activeTab === 'salary' && (
          <SalaryTab insights={report.salaryInsights} />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : score >= 50
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        : 'text-red-400 bg-red-500/10 border-red-500/30';

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${color}`}
    >
      <Shield className="h-3.5 w-3.5" />
      {score}% Confidence
    </div>
  );
}

// -- Career Paths Tab --

function CareerPathsTab({
  paths,
}: {
  paths: CareerAdviceReport['careerPaths'];
}) {
  return (
    <div className="space-y-4">
      {paths.map((path, i) => {
        const rel = RELEVANCE_CONFIG[path.relevance] || RELEVANCE_CONFIG.low;
        return (
          <div
            key={i}
            className="group rounded-lg border border-slate-800 bg-slate-900/40 p-5 transition-all hover:border-slate-700 hover:bg-slate-900/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${rel.bg} ${rel.color}`}
                >
                  {rel.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {path.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {path.description}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-slate-800/60 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                <Clock className="h-3 w-3" />
                {path.timeframe}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Skills Tab --

function SkillsTab({
  recommendations,
}: {
  recommendations: CareerAdviceReport['skillRecommendations'];
}) {
  return (
    <div className="space-y-4">
      {recommendations.map((rec, i) => {
        const prio =
          PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG['nice-to-have'];
        return (
          <div
            key={i}
            className="rounded-lg border border-slate-800 bg-slate-900/40 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    {rec.skill}
                  </h3>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${prio.bg} ${prio.color}`}
                  >
                    {prio.label}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">{rec.reason}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1 text-[11px] text-slate-500">
                <Clock className="h-3 w-3" />
                {rec.estimatedTime}
              </div>
            </div>

            {rec.resources.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {rec.resources.map((resource, j) => (
                  <span
                    key={j}
                    className="flex items-center gap-1 rounded-md bg-slate-800/50 px-2.5 py-1 text-[11px] text-slate-400"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {resource}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// -- Projects Tab --

function ProjectsTab({
  suggestions,
}: {
  suggestions: CareerAdviceReport['projectSuggestions'];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {suggestions.map((proj, i) => {
        const diff =
          DIFFICULTY_CONFIG[proj.difficulty] || DIFFICULTY_CONFIG.intermediate;
        return (
          <div
            key={i}
            className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/40 p-5 transition-all hover:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{proj.title}</h3>
              <span className={`text-[10px] font-bold uppercase ${diff.color}`}>
                {diff.label}
              </span>
            </div>
            <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-400">
              {proj.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {proj.techStack.map((tech, j) => (
                <span
                  key={j}
                  className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300"
                >
                  {tech}
                </span>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="h-3 w-3" />~{proj.estimatedHours} hours
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Interview Tab --

function InterviewTab({ tips }: { tips: CareerAdviceReport['interviewTips'] }) {
  return (
    <div className="space-y-4">
      {tips.map((tip, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-800 bg-slate-900/40 p-5"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
              <Star className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-white">{tip.category}</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            {tip.tip}
          </p>
          <div className="mt-3 rounded-md bg-slate-800/40 px-3 py-2">
            <p className="text-[11px] text-slate-400">
              <span className="font-medium text-slate-300">Example:</span>{' '}
              {tip.example}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Salary Tab --

function SalaryTab({
  insights,
}: {
  insights: CareerAdviceReport['salaryInsights'];
}) {
  return (
    <div className="space-y-6">
      {/* Salary Range Card */}
      <div className="rounded-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-slate-900/40 p-6">
        <div className="mb-3 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">
            Estimated Salary Range
          </h3>
        </div>
        <p className="text-2xl font-bold text-emerald-400">
          {insights.estimatedRange}
        </p>
        <p className="mt-2 text-xs text-slate-400">{insights.marketTrend}</p>
      </div>

      {/* Negotiation Tips */}
      {insights.negotiationTips && insights.negotiationTips.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <ChevronRight className="h-4 w-4 text-amber-400" />
            Negotiation Tips
          </h3>
          <div className="space-y-2">
            {insights.negotiationTips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3"
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-400">
                  {i + 1}
                </div>
                <p className="text-xs text-slate-300">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
