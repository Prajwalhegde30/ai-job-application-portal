'use client';

import { CategoryScores } from '@/hooks/useAIAnalysis';

interface CategoryProgressProps {
  scores: CategoryScores;
}

export default function CategoryProgress({ scores }: CategoryProgressProps) {
  const categories = [
    {
      name: 'Experience',
      score: scores.experience,
      max: 25,
      color: 'bg-indigo-500',
    },
    {
      name: 'Education',
      score: scores.education,
      max: 20,
      color: 'bg-emerald-500',
    },
    { name: 'Projects', score: scores.projects, max: 20, color: 'bg-sky-500' },
    { name: 'Skills', score: scores.skills, max: 15, color: 'bg-violet-500' },
    {
      name: 'Certifications',
      score: scores.certifications,
      max: 10,
      color: 'bg-amber-500',
    },
    {
      name: 'Contact Information',
      score: scores.contact,
      max: 10,
      color: 'bg-rose-500',
    },
  ];

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md">
      <div>
        <h3 className="mb-4 text-lg font-bold text-white">
          Category Scorecard
        </h3>
        <div className="space-y-4">
          {categories.map((cat) => {
            const percentage = Math.round((cat.score / cat.max) * 100);
            return (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-300">
                    {cat.name}
                  </span>
                  <span className="font-semibold text-neutral-400">
                    <span className="text-white">{cat.score}</span> / {cat.max}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className={`${cat.color} h-2.5 rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
