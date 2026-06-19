'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowDown,
  Bell,
  Briefcase,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  FileText,
  Inbox,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AnalyticsRange,
  ApplicationTrendPoint,
  RecentApplication,
  TopJob,
  useAnalyticsSummary,
  useApplicationTrends,
  useHiringFunnel,
  useRecentApplications,
  useTopJobs,
} from '@/hooks/useAnalytics';
import { APPLICATION_STATUS_CONFIG } from '@/lib/validators/application';
import { JOB_STATUS_LABELS } from '@/lib/validators/job';
import type { JobStatus } from '@/lib/validators/job';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type SortKey = 'title' | 'applicationCount' | 'status' | 'createdAt';

const EMPTY_TRENDS: ApplicationTrendPoint[] = [];
const EMPTY_TOP_JOBS: TopJob[] = [];
const EMPTY_RECENT_APPLICATIONS: RecentApplication[] = [];

const ranges: { label: string; value: AnalyticsRange }[] = [
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
}

function fullDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusClass(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'DRAFT':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'CLOSED':
      return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
    default:
      return 'border-slate-700 bg-slate-900 text-slate-300';
  }
}

function applicationStatusClass(status: string) {
  const config =
    APPLICATION_STATUS_CONFIG[status] || APPLICATION_STATUS_CONFIG.PENDING;
  return `${config.bgColor} ${config.borderColor} ${config.color}`;
}

function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900/20 p-8 text-center">
      <Icon className="mb-3 h-9 w-9 text-slate-600" />
      <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function AdminAnalyticsDashboardPage() {
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [sortKey, setSortKey] = useState<SortKey>('applicationCount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const summaryQuery = useAnalyticsSummary();
  const trendsQuery = useApplicationTrends(range);
  const funnelQuery = useHiringFunnel();
  const topJobsQuery = useTopJobs();
  const recentApplicationsQuery = useRecentApplications();

  const summary = summaryQuery.data;
  const trends = trendsQuery.data ?? EMPTY_TRENDS;
  const funnel = funnelQuery.data;
  const topJobs = topJobsQuery.data ?? EMPTY_TOP_JOBS;
  const recentApplications =
    recentApplicationsQuery.data ?? EMPTY_RECENT_APPLICATIONS;

  const hasNoJobs = !summaryQuery.isLoading && (summary?.totalJobs ?? 0) === 0;
  const hasNoApplications =
    !summaryQuery.isLoading && (summary?.totalApplications ?? 0) === 0;

  const summaryCards = [
    {
      label: 'Total Jobs',
      value: summary?.totalJobs ?? 0,
      icon: Briefcase,
      color: 'text-sky-300',
    },
    {
      label: 'Published Jobs',
      value: summary?.publishedJobs ?? 0,
      icon: Activity,
      color: 'text-emerald-300',
    },
    {
      label: 'Applications',
      value: summary?.totalApplications ?? 0,
      icon: Users,
      color: 'text-cyan-300',
    },
    {
      label: 'Shortlisted',
      value: summary?.shortlistedApplications ?? 0,
      icon: Trophy,
      color: 'text-amber-300',
    },
    {
      label: 'Hired',
      value: summary?.hiredApplications ?? 0,
      icon: CheckCircle2,
      color: 'text-lime-300',
    },
    {
      label: 'Unread',
      value: summary?.unreadNotifications ?? 0,
      icon: Bell,
      color: 'text-rose-300',
    },
  ];

  const funnelChartData = useMemo(
    () => [
      { stage: 'Pending', applications: funnel?.pending ?? 0 },
      { stage: 'Reviewing', applications: funnel?.reviewing ?? 0 },
      { stage: 'Shortlisted', applications: funnel?.shortlisted ?? 0 },
      { stage: 'Hired', applications: funnel?.hired ?? 0 },
    ],
    [funnel]
  );

  const trendChartData = useMemo(
    () =>
      trends.map((point) => ({
        ...point,
        label: formatDate(point.date),
      })),
    [trends]
  );

  const sortedTopJobs = useMemo(() => {
    return [...topJobs].sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (sortKey === 'applicationCount') {
        return ((aValue as number) - (bValue as number)) * direction;
      }

      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  }, [sortDirection, sortKey, topJobs]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDirection(key === 'applicationCount' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-2xl font-bold text-white">Recruiter Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Track job performance, candidate flow, and recent recruiting
            activity.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-1">
          {ranges.map((item) => (
            <Button
              key={item.value}
              variant="ghost"
              size="sm"
              onClick={() => setRange(item.value)}
              className={`h-8 rounded-md px-3 text-xs ${
                range === item.value
                  ? 'bg-slate-100 text-slate-950 hover:bg-white hover:text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {hasNoJobs && (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          message="Create a job posting to start building your recruiter analytics dashboard."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <Card
            key={card.label}
            className="rounded-lg border-slate-800 bg-slate-900/40"
          >
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {summaryQuery.isLoading ? '...' : card.value}
                </p>
              </div>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
        <Card className="rounded-lg border-slate-800 bg-slate-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <TrendingUp className="h-4 w-4 text-cyan-300" />
              Application Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendsQuery.isLoading ? (
              <div className="h-72 animate-pulse rounded-lg bg-slate-800/40" />
            ) : hasNoApplications ? (
              <EmptyState
                icon={FileText}
                title="No application data"
                message="Trend lines will appear as candidates apply to your jobs."
              />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        color: '#e2e8f0',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="applications"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#22d3ee' }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-800 bg-slate-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Activity className="h-4 w-4 text-emerald-300" />
              Hiring Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {funnelQuery.isLoading ? (
              <div className="h-72 animate-pulse rounded-lg bg-slate-800/40" />
            ) : hasNoApplications ? (
              <EmptyState
                icon={Inbox}
                title="No funnel data"
                message="The funnel will populate as applications move through review."
              />
            ) : (
              <div className="space-y-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelChartData}>
                      <CartesianGrid stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="stage"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <YAxis
                        allowDecimals={false}
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                      />
                      <Tooltip
                        cursor={{ fill: '#1e293b55' }}
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: 8,
                          color: '#e2e8f0',
                        }}
                      />
                      <Bar
                        dataKey="applications"
                        fill="#34d399"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                    <p className="text-xs text-red-300">Rejected</p>
                    <p className="mt-1 text-xl font-bold text-white">
                      {funnel?.rejected ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-600/30 bg-slate-800/40 p-3">
                    <p className="text-xs text-slate-300">Withdrawn</p>
                    <p className="mt-1 text-xl font-bold text-white">
                      {funnel?.withdrawn ?? 0}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                  <span>Pending</span>
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span>Reviewing</span>
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span>Shortlisted</span>
                  <ArrowDown className="h-3.5 w-3.5" />
                  <span>Hired</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="rounded-lg border-slate-800 bg-slate-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Trophy className="h-4 w-4 text-amber-300" />
              Top Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topJobsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-12 animate-pulse rounded-lg bg-slate-800/40"
                  />
                ))}
              </div>
            ) : topJobs.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No jobs to rank"
                message="Your top jobs table will show the roles generating the most applications."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr className="border-b border-slate-800">
                      <SortableHeader
                        label="Job Title"
                        active={sortKey === 'title'}
                        onClick={() => handleSort('title')}
                      />
                      <SortableHeader
                        label="Applications"
                        active={sortKey === 'applicationCount'}
                        onClick={() => handleSort('applicationCount')}
                      />
                      <SortableHeader
                        label="Status"
                        active={sortKey === 'status'}
                        onClick={() => handleSort('status')}
                      />
                      <SortableHeader
                        label="Created"
                        active={sortKey === 'createdAt'}
                        onClick={() => handleSort('createdAt')}
                      />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTopJobs.map((job) => (
                      <tr
                        key={job.jobId}
                        className="border-b border-slate-800/60 last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/admin/jobs/${job.jobId}/edit`}
                            className="font-medium text-white hover:text-cyan-300"
                          >
                            {job.title}
                          </Link>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {job.applicationCount}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(job.status)}`}
                          >
                            {JOB_STATUS_LABELS[job.status as JobStatus] ||
                              job.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {fullDate(job.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border-slate-800 bg-slate-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Clock className="h-4 w-4 text-rose-300" />
              Recent Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentApplicationsQuery.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-14 animate-pulse rounded-lg bg-slate-800/40"
                  />
                ))}
              </div>
            ) : recentApplications.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No applications yet"
                message="New candidate activity will appear here as soon as applications arrive."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr className="border-b border-slate-800">
                      <th className="pb-2 font-medium">Candidate</th>
                      <th className="pb-2 font-medium">Job</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Applied</th>
                      <th className="pb-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {recentApplications.map((application) => (
                      <tr
                        key={application.applicationId}
                        className="border-b border-slate-800/60 last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <p className="font-medium text-white">
                            {application.candidateName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {application.candidateEmail}
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-slate-300">
                          {application.jobTitle}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${applicationStatusClass(application.status)}`}
                          >
                            {APPLICATION_STATUS_CONFIG[application.status]
                              ?.label || application.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">
                          {fullDate(application.appliedAt)}
                        </td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/applications/${application.applicationId}`}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-cyan-300 hover:bg-slate-800 hover:text-cyan-200"
                            >
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <th className="pr-4 pb-2 font-medium">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1 text-xs ${
          active ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        {label}
        <ChevronsUpDown className="h-3 w-3" />
      </button>
    </th>
  );
}
