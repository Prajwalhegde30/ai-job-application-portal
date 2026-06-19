'use client';

interface AnalysisSummaryProps {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export default function AnalysisSummary({
  strengths,
  weaknesses,
  suggestions,
}: AnalysisSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Strengths */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-6 shadow-lg backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2">
          <svg
            className="h-6 w-6 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-bold text-emerald-400">Strengths</h3>
        </div>
        {strengths.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No notable strengths identified yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {strengths.map((str, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-neutral-200">
                <span className="font-bold text-emerald-400">•</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Weaknesses */}
      <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-6 shadow-lg backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2">
          <svg
            className="h-6 w-6 text-red-400"
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
          <h3 className="text-lg font-bold text-red-400">Areas to Improve</h3>
        </div>
        {weaknesses.length === 0 ? (
          <p className="text-sm text-neutral-400">
            No critical weaknesses found. Great job!
          </p>
        ) : (
          <ul className="space-y-3">
            {weaknesses.map((weak, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-neutral-200">
                <span className="font-bold text-red-400">•</span>
                <span>{weak}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Recommendations */}
      <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 p-6 shadow-lg backdrop-blur-md">
        <div className="mb-4 flex items-center gap-2">
          <svg
            className="h-6 w-6 text-sky-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="text-lg font-bold text-sky-400">
            Actionable Suggestions
          </h3>
        </div>
        {suggestions.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Your resume is well optimized!
          </p>
        ) : (
          <ul className="space-y-3">
            {suggestions.map((sug, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-neutral-200">
                <span className="font-bold text-sky-400">💡</span>
                <span>{sug}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
