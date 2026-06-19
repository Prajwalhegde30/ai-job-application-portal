'use client';

import React from 'react';
import { MatchAnalysisReport } from '@/hooks/useMatchAnalysis';
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  Award,
  BookOpen,
  Briefcase,
  Code,
  Sparkles,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface MatchScorecardProps {
  report: MatchAnalysisReport;
  isAdminView?: boolean;
}

export default function MatchScorecard({
  report,
  isAdminView = false,
}: MatchScorecardProps) {
  const {
    matchScore,
    categoryScores,
    matchedSkills = [],
    missingSkills = [],
    additionalSkills = [],
    strengths = [],
    weaknesses = [],
    recommendations = [],
  } = report;

  // Gauge configurations
  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (matchScore / 100) * circumference;

  // Determine colors based on score
  const getScoreColorClass = (score: number) => {
    if (score >= 80) return 'text-emerald-400 stroke-emerald-500';
    if (score >= 60) return 'text-blue-400 stroke-blue-500';
    if (score >= 40) return 'text-amber-400 stroke-amber-500';
    return 'text-rose-400 stroke-rose-500';
  };

  const getScoreBgClass = (score: number) => {
    if (score >= 80)
      return 'bg-emerald-500/10 border-emerald-900/30 text-emerald-400';
    if (score >= 60) return 'bg-blue-500/10 border-blue-900/30 text-blue-400';
    if (score >= 40)
      return 'bg-amber-500/10 border-amber-900/30 text-amber-400';
    return 'bg-rose-500/10 border-rose-900/30 text-rose-400';
  };

  return (
    <div className="space-y-8">
      {/* 1. Main Score Header Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          {/* Gauge Widget */}
          <div className="relative mx-auto flex shrink-0 items-center justify-center md:mx-0">
            <svg
              height={radius * 2}
              width={radius * 2}
              className="-rotate-90 transform"
            >
              <circle
                stroke="rgba(30, 41, 59, 0.5)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke="currentColor"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-out ${getScoreColorClass(matchScore)}`}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold tracking-tight text-white">
                {matchScore}%
              </span>
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                Match
              </span>
            </div>
          </div>

          {/* Overall Details */}
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {isAdminView
                  ? 'Recruiter Fit Assessment'
                  : 'Application Match Score'}
              </h2>
              <span
                className={`rounded-full border px-3.5 py-0.5 text-xs font-semibold ${getScoreBgClass(matchScore)}`}
              >
                {matchScore >= 80
                  ? 'Strong Fit'
                  : matchScore >= 60
                    ? 'Good Fit'
                    : matchScore >= 40
                      ? 'Moderate Fit'
                      : 'Low Alignment'}
              </span>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              {isAdminView
                ? "This scorecard compares the candidate's verified resume skills, years of experience, projects, and credentials directly with the job requirements."
                : "See how well your resume matches the job requirements. Address the missing skills and recommendations below to increase your profile's visibility."}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Category Progression Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {/* Category progress cards */}
        <ProgressCard
          title="Required Skills"
          score={categoryScores.skills}
          max={40}
          icon={<Code className="h-4 w-4 text-blue-400" />}
          colorClass="bg-blue-500"
        />
        <ProgressCard
          title="Work Experience"
          score={categoryScores.experience}
          max={25}
          icon={<Briefcase className="h-4 w-4 text-violet-400" />}
          colorClass="bg-violet-500"
        />
        <ProgressCard
          title="Education Match"
          score={categoryScores.education}
          max={15}
          icon={<BookOpen className="h-4 w-4 text-emerald-400" />}
          colorClass="bg-emerald-500"
        />
        <ProgressCard
          title="Certifications"
          score={categoryScores.certifications}
          max={10}
          icon={<Award className="h-4 w-4 text-amber-400" />}
          colorClass="bg-amber-500"
        />
        <ProgressCard
          title="Project Match"
          score={categoryScores.projects}
          max={10}
          icon={<Sparkles className="h-4 w-4 text-rose-400" />}
          colorClass="bg-rose-500"
        />
      </div>

      {/* 3. Skill Overlap Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Matched Skills */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-white uppercase">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Matched Required Skills ({matchedSkills.length})
          </h3>
          {matchedSkills.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No matching job-required skills found.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {matchedSkills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-950/60 bg-emerald-950/20 px-2.5 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20"
                >
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Missing Skills */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-white uppercase">
            <XCircle className="h-4 w-4 text-rose-400" />
            Missing Required Skills ({missingSkills.length})
          </h3>
          {missingSkills.length === 0 ? (
            <p className="text-xs text-emerald-400 italic">
              Excellent! You possess all required technical skills listed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {missingSkills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-950/60 bg-rose-950/20 px-2.5 py-1 text-xs font-medium text-rose-400 ring-1 ring-rose-500/20"
                >
                  <XCircle className="h-3 w-3 shrink-0" />
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Additional candidate skills (only shown in full detail recruiter / admin mode) */}
        {isAdminView && additionalSkills.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 md:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-white uppercase">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              Additional Candidate Technologies ({additionalSkills.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {additionalSkills.map((skill, index) => (
                <span
                  key={index}
                  className="rounded-md border border-blue-900/30 bg-blue-950/15 px-2.5 py-1 text-xs text-blue-400 ring-1 ring-blue-500/10"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Action Items & Insights */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Strengths & Gaps (Only shown to recruiters in full, or candidate fits strengths) */}
        <div className="space-y-6">
          {/* Strengths Panel */}
          {(!isAdminView || strengths.length > 0) && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6">
              <h3 className="mb-4 text-sm font-bold tracking-wider text-white uppercase">
                Alignment Strengths
              </h3>
              <ul className="space-y-3 text-xs text-slate-300">
                {strengths.map((str, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 leading-relaxed"
                  >
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps Panel */}
          {isAdminView && weaknesses.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6">
              <h3 className="mb-4 flex items-center gap-1.5 text-sm font-bold tracking-wider text-white uppercase">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Alignment Gaps / Risks
              </h3>
              <ul className="space-y-3 text-xs text-slate-300">
                {weaknesses.map((weak, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 leading-relaxed"
                  >
                    <XCircle className="text-rose-450 mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
                    <span>{weak}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actionable Recommendations / Suggestions */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wider text-white uppercase">
            <Lightbulb className="h-4 w-4 animate-pulse text-amber-400" />
            {isAdminView
              ? 'Fit Optimization Recommendations'
              : 'Steps to Improve Profile Fit'}
          </h3>
          {recommendations.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No recommendations required. Profile shows ideal fit.
            </p>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="bg-slate-850/20 flex items-start gap-3 rounded-lg border border-slate-800/80 p-3"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/10 text-xs font-bold text-amber-400">
                    {i + 1}
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {rec}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ProgressCard Subcomponent
function ProgressCard({
  title,
  score,
  max,
  icon,
  colorClass,
}: {
  title: string;
  score: number;
  max: number;
  icon: React.ReactNode;
  colorClass: string;
}) {
  const percentage = Math.round((score / max) * 100);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-bold tracking-wider text-slate-500 uppercase">
          {title}
        </span>
        <div className="shrink-0 rounded bg-slate-800/50 p-1">{icon}</div>
      </div>

      <div className="space-y-1">
        <div className="flex items-end justify-between">
          <span className="text-lg font-extrabold text-white">
            {score}
            <span className="text-xs font-normal text-slate-500">/{max}</span>
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {percentage}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full ${colorClass} transition-all duration-1000`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
