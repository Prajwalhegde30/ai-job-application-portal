'use client';

import { useAuth } from '@/hooks/useAuth';
import {
  useDashboardSummary,
  useApplicationStatus,
  useDashboardRecentApplications,
  useDashboardRecentNotifications,
  useDashboardResumeSummary,
} from '@/hooks/useDashboard';
import {
  SummaryCards,
  ProfileCompletionWidget,
  ApplicationStatusChart,
  RecentApplicationsList,
  ResumeSummaryCard,
  NotificationPreview,
  QuickActionsPanel,
} from '@/components/dashboard';
import { Sparkles } from 'lucide-react';

/**
 * Candidate Dashboard Page — /dashboard
 *
 * Central workspace aggregating data from Profile, Resume, Application,
 * and Notification modules. Provides candidates a complete overview of
 * their progress within the ATS.
 */
export default function DashboardPage() {
  const { user } = useAuth();

  // Fetch all dashboard data in parallel
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: applicationStatus, isLoading: statusLoading } =
    useApplicationStatus();
  const { data: recentApplications, isLoading: appsLoading } =
    useDashboardRecentApplications();
  const { data: recentNotifications, isLoading: notifsLoading } =
    useDashboardRecentNotifications();
  const { data: resumeSummary, isLoading: resumeLoading } =
    useDashboardResumeSummary();

  return (
    <div className="space-y-6">
      {/* ========== Welcome Banner ========== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl sm:p-8">
        {/* Ambient glow effects */}
        <div className="pointer-events-none absolute -top-10 right-0 h-48 w-48 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="pointer-events-none absolute right-20 -bottom-10 h-48 w-48 rounded-full bg-violet-500/8 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -left-10 h-32 w-32 rounded-full bg-emerald-500/5 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse text-blue-400" />
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Candidate Dashboard
            </span>
          </div>
          <h1 className="mt-2 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl lg:text-4xl">
            Welcome back, {user?.name || 'Candidate'}!
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 md:text-base">
            Track your job applications, manage resumes, and stay on top of your
            career progress — all from one place.
          </p>
        </div>
      </div>

      {/* ========== Summary Stat Cards ========== */}
      <SummaryCards summary={summary} isLoading={summaryLoading} />

      {/* ========== Two-Column Layout ========== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <ProfileCompletionWidget
            summary={summary}
            isLoading={summaryLoading}
          />
          <ApplicationStatusChart
            status={applicationStatus}
            isLoading={statusLoading}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <RecentApplicationsList
            applications={recentApplications}
            isLoading={appsLoading}
          />
          <ResumeSummaryCard
            resumeSummary={resumeSummary}
            isLoading={resumeLoading}
          />
        </div>
      </div>

      {/* ========== Notification Preview ========== */}
      <NotificationPreview
        notifications={recentNotifications}
        isLoading={notifsLoading}
      />

      {/* ========== Quick Actions ========== */}
      <QuickActionsPanel />
    </div>
  );
}
