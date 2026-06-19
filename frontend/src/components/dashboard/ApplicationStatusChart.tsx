'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Loader2 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { ApplicationStatusOverview } from '@/hooks/useDashboard';
import { EmptyState } from './EmptyState';

interface ApplicationStatusChartProps {
  status: ApplicationStatusOverview | undefined;
  isLoading: boolean;
}

const STATUS_CONFIG = [
  { key: 'pending', label: 'Pending', color: '#f59e0b' },
  { key: 'reviewing', label: 'Reviewing', color: '#3b82f6' },
  { key: 'shortlisted', label: 'Shortlisted', color: '#10b981' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
  { key: 'hired', label: 'Hired', color: '#06b6d4' },
  { key: 'withdrawn', label: 'Withdrawn', color: '#6b7280' },
];

/**
 * Custom tooltip for the pie chart.
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/95 px-3 py-2 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: item.payload.fill }}
        />
        <span className="text-xs font-medium text-slate-200">{item.name}</span>
        <span className="text-xs font-bold text-white">{item.value}</span>
      </div>
    </div>
  );
}

/**
 * Custom legend rendered below the chart.
 */
function CustomLegend({
  payload,
}: {
  payload?: Array<{ value: string; color: string }>;
}) {
  if (!payload) return null;

  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[11px] text-slate-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Application status pie chart visualization.
 * Uses Recharts PieChart to display application counts by status.
 */
export function ApplicationStatusChart({
  status,
  isLoading,
}: ApplicationStatusChartProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <BarChart3 className="h-4.5 w-4.5 text-violet-400" />
            Application Status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  // Check for empty state
  const total = status
    ? status.pending +
      status.reviewing +
      status.shortlisted +
      status.rejected +
      status.hired +
      status.withdrawn
    : 0;

  if (total === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-7 w-7 text-slate-500" />}
        title="No Applications Yet"
        description="Apply to jobs to see your application status breakdown here."
        actionLabel="Browse Jobs"
        actionHref="/jobs"
      />
    );
  }

  // Build chart data from status overview
  const chartData = STATUS_CONFIG.map((config) => ({
    name: config.label,
    value: status ? status[config.key as keyof ApplicationStatusOverview] : 0,
    fill: config.color,
  })).filter((d) => d.value > 0);

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <BarChart3 className="h-4.5 w-4.5 text-violet-400" />
          Application Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Total count display in center concept via text */}
        <div className="mt-1 text-center">
          <span className="text-xs text-slate-500">
            Total: <span className="font-semibold text-slate-300">{total}</span>{' '}
            applications
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
