'use client';

import { useEffect, useState } from 'react';

interface ScoreGaugeProps {
  score: number;
}

export default function ScoreGauge({ score }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1000; // 1s
    const steps = 60;
    const stepTime = duration / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      // Ease out quad formula
      const easedProgress = progress * (2 - progress);
      const val = Math.round(easedProgress * score);
      setAnimatedScore(val);

      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedScore(score);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  // SVG parameters
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (animatedScore / 100) * circumference;

  // Determine color based on score tiers
  let colorClass = 'stroke-red-500';
  let textClass = 'text-red-500';
  let label = 'Needs Work';

  if (score >= 70) {
    colorClass = 'stroke-emerald-500';
    textClass = 'text-emerald-500';
    label = 'Excellent';
  } else if (score >= 50) {
    colorClass = 'stroke-amber-500';
    textClass = 'text-amber-500';
    label = 'Good';
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg className="h-full w-full -rotate-90 transform">
          <circle
            className="stroke-neutral-800"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          {/* Progress Circle */}
          <circle
            className={`${colorClass} transition-all duration-300 ease-out`}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-4xl font-extrabold tracking-tight ${textClass}`}
          >
            {animatedScore}
          </span>
          <span className="mt-1 text-xs font-medium text-neutral-400">
            out of 100
          </span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <h3 className="text-lg font-bold text-white">{label}</h3>
        <p className="mt-1 max-w-[200px] text-xs text-neutral-400">
          Overall resume optimization score based on section completeness.
        </p>
      </div>
    </div>
  );
}
