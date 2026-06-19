'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Briefcase,
  User,
  Loader2,
} from 'lucide-react';
import type { DashboardSummary } from '@/hooks/useDashboard';

interface ProfileCompletionWidgetProps {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

/** Determines which CTAs to show based on what's missing from the profile. */
function getMissingActions(summary: DashboardSummary | undefined) {
  if (!summary) return [];

  const actions: { label: string; href: string; icon: React.ReactNode }[] = [];

  // Profile completion is under 100% — derive missing items from score brackets
  if (summary.profileCompletion < 100) {
    // Generic CTA for profile editing
    actions.push({
      label: 'Complete Profile',
      href: '/profile',
      icon: <User className="h-3.5 w-3.5" />,
    });
  }

  if (!summary.activeResume) {
    actions.push({
      label: 'Upload Resume',
      href: '/resumes',
      icon: <PlusCircle className="h-3.5 w-3.5" />,
    });
  }

  if (summary.totalApplications === 0) {
    actions.push({
      label: 'Browse Jobs',
      href: '/jobs',
      icon: <Briefcase className="h-3.5 w-3.5" />,
    });
  }

  return actions;
}

/**
 * Profile completion widget with progress bar and CTA buttons.
 */
export function ProfileCompletionWidget({
  summary,
  isLoading,
}: ProfileCompletionWidgetProps) {
  const completion = summary?.profileCompletion ?? 0;
  const missingActions = getMissingActions(summary);

  // Progress bar color based on completion level
  let progressColor = 'from-red-500 to-orange-500';
  let statusText = 'Needs Attention';
  let StatusIcon = AlertCircle;
  let statusColor = 'text-red-400';

  if (completion >= 80) {
    progressColor = 'from-emerald-500 to-green-500';
    statusText = 'Great Progress!';
    StatusIcon = CheckCircle;
    statusColor = 'text-emerald-400';
  } else if (completion >= 50) {
    progressColor = 'from-amber-500 to-yellow-500';
    statusText = 'Getting There';
    StatusIcon = AlertCircle;
    statusColor = 'text-amber-400';
  }

  if (completion === 100) {
    statusText = 'Complete!';
  }

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <User className="h-4.5 w-4.5 text-blue-400" />
          Profile Completion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            {/* Progress display */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{completion}%</p>
                <div
                  className={`mt-1 flex items-center gap-1.5 ${statusColor}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{statusText}</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${progressColor} transition-all duration-700 ease-out`}
                style={{ width: `${completion}%` }}
              />
            </div>

            {/* CTA actions */}
            {missingActions.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                  Recommended Actions
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingActions.map((action) => (
                    <Link key={action.label} href={action.href}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-slate-700/60 bg-slate-800/40 text-xs text-slate-300 hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
                      >
                        {action.icon}
                        {action.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
