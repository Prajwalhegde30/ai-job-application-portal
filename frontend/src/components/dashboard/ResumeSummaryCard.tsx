'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, FolderOpen, Loader2 } from 'lucide-react';
import type { ResumeSummary } from '@/hooks/useDashboard';
import { EmptyState } from './EmptyState';

interface ResumeSummaryCardProps {
  resumeSummary: ResumeSummary | undefined;
  isLoading: boolean;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Resume summary card showing active resume info, count, and quick actions.
 */
export function ResumeSummaryCard({
  resumeSummary,
  isLoading,
}: ResumeSummaryCardProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <FileText className="h-4.5 w-4.5 text-emerald-400" />
            Resumes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  if (!resumeSummary || resumeSummary.totalResumes === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-7 w-7 text-slate-500" />}
        title="No Resumes Uploaded"
        description="Upload your first resume to start applying to jobs."
        actionLabel="Upload Resume"
        actionHref="/resumes"
      />
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <FileText className="h-4.5 w-4.5 text-emerald-400" />
          Resumes
        </CardTitle>
        <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
          {resumeSummary.totalResumes} total
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active resume details */}
        {resumeSummary.activeResume && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <FileText className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {resumeSummary.activeResumeTitle || 'Untitled Resume'}
                  </p>
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[9px] font-semibold text-emerald-400">
                    Active
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Last updated:{' '}
                  {formatDate(resumeSummary.activeResumeUpdatedAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="flex gap-2">
          <Link href="/resumes" className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-slate-700/60 bg-slate-800/40 text-xs text-slate-300 hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Manage
            </Button>
          </Link>
          <Link href="/resumes" className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-slate-700/60 bg-slate-800/40 text-xs text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
