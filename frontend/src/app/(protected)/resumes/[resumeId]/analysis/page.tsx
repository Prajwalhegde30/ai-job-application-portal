'use client';

import { use } from 'react';
import Link from 'next/link';
import { useGetAnalysis, useAnalyzeResume } from '@/hooks/useAIAnalysis';
import {
  ScoreGauge,
  CategoryProgress,
  AnalysisSummary,
  ExtractedDetails,
} from '@/components/analysis';

interface PageProps {
  params: Promise<{ resumeId: string }>;
}

export default function ResumeAnalysisPage({ params }: PageProps) {
  const { resumeId } = use(params);

  // Query to fetch the report
  const {
    data: analysis,
    isLoading,
    isError,
    refetch,
  } = useGetAnalysis(resumeId);

  // Mutation to re-analyze resume
  const analyzeMutation = useAnalyzeResume();

  const handleReanalyze = async () => {
    try {
      await analyzeMutation.mutateAsync(resumeId);
      refetch();
    } catch (err) {
      console.error('Failed to re-analyze resume:', err);
    }
  };

  const isProcessing = isLoading || analyzeMutation.isPending;

  if (isProcessing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6 text-white">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
        <h2 className="mt-6 animate-pulse text-xl font-bold tracking-wide">
          Analyzing Resume...
        </h2>
        <p className="mt-2 max-w-sm text-center text-sm text-neutral-400">
          Our rule-based engine is scanning sections, extracting key metrics,
          and scoring completeness.
        </p>
      </div>
    );
  }

  if (isError || !analysis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6 text-white">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-950/20 p-4 text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-lg font-bold text-red-400">Analysis Error</h2>
          <p className="mt-2 text-sm text-neutral-300">
            Failed to retrieve or generate the resume analysis. Ensure the
            resume belongs to you and contains readable text.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-neutral-800 px-4 py-2 text-sm font-semibold transition hover:bg-neutral-700"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => refetch()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold transition hover:bg-indigo-500"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 transition hover:text-indigo-400"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
              Resume ATS Analysis
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Detailed breakdown of matched skills, section coverage, and
              structured insights.
            </p>
          </div>

          <button
            onClick={handleReanalyze}
            disabled={isProcessing}
            className="flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:opacity-50 sm:self-center"
          >
            <svg
              className="animate-spin-hover h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3m0 0l3 3m-3-3v8"
              />
            </svg>
            Re-Analyze Resume
          </button>
        </div>

        {/* Top Section Score overview */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <ScoreGauge score={analysis.score} />
          </div>
          <div className="lg:col-span-2">
            <CategoryProgress scores={analysis.categoryScores} />
          </div>
        </div>

        {/* Feedback Grid */}
        <AnalysisSummary
          strengths={analysis.strengths}
          weaknesses={analysis.weaknesses}
          suggestions={analysis.suggestions}
        />

        {/* Dynamic Detail tabs */}
        <ExtractedDetails
          skills={analysis.extractedSkills}
          education={analysis.extractedEducation}
          experience={analysis.extractedExperience}
          projects={analysis.extractedProjects}
          certifications={analysis.extractedCertifications}
          contact={analysis.contactInfo}
        />
      </div>
    </div>
  );
}
