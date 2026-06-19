'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserCircle,
  FileText,
  Clock,
  Star,
  Trophy,
  Bell,
  Loader2,
} from 'lucide-react';
import type { DashboardSummary } from '@/hooks/useDashboard';

interface SummaryCardsProps {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  isLoading: boolean;
}

function StatCard({
  label,
  value,
  icon,
  gradient,
  iconBg,
  isLoading,
}: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden border-slate-800 bg-slate-900/40 backdrop-blur-sm transition-all duration-300 hover:border-slate-700 hover:shadow-lg hover:shadow-slate-950/50">
      {/* Subtle top gradient line */}
      <div className={`absolute inset-x-0 top-0 h-0.5 ${gradient}`} />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          {label}
        </CardTitle>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        ) : (
          <p className="text-2xl font-bold tracking-tight text-white">
            {typeof value === 'number' && label === 'Profile Completion'
              ? `${value}%`
              : value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Summary stat cards grid for the candidate dashboard.
 * Displays 6 cards: Profile %, Applications, Under Review, Shortlisted, Hired, Notifications.
 */
export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Profile Completion',
      value: summary?.profileCompletion ?? 0,
      icon: <UserCircle className="h-4.5 w-4.5 text-blue-400" />,
      gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
      iconBg: 'bg-blue-500/10 ring-1 ring-blue-500/20',
    },
    {
      label: 'Applications',
      value: summary?.totalApplications ?? 0,
      icon: <FileText className="h-4.5 w-4.5 text-violet-400" />,
      gradient: 'bg-gradient-to-r from-violet-500 to-violet-600',
      iconBg: 'bg-violet-500/10 ring-1 ring-violet-500/20',
    },
    {
      label: 'Under Review',
      value: summary?.reviewingApplications ?? 0,
      icon: <Clock className="h-4.5 w-4.5 text-amber-400" />,
      gradient: 'bg-gradient-to-r from-amber-500 to-amber-600',
      iconBg: 'bg-amber-500/10 ring-1 ring-amber-500/20',
    },
    {
      label: 'Shortlisted',
      value: summary?.shortlistedApplications ?? 0,
      icon: <Star className="h-4.5 w-4.5 text-emerald-400" />,
      gradient: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-500/10 ring-1 ring-emerald-500/20',
    },
    {
      label: 'Hired',
      value: summary?.hiredApplications ?? 0,
      icon: <Trophy className="h-4.5 w-4.5 text-sky-400" />,
      gradient: 'bg-gradient-to-r from-sky-500 to-sky-600',
      iconBg: 'bg-sky-500/10 ring-1 ring-sky-500/20',
    },
    {
      label: 'Unread Notifications',
      value: summary?.unreadNotifications ?? 0,
      icon: <Bell className="h-4.5 w-4.5 text-rose-400" />,
      gradient: 'bg-gradient-to-r from-rose-500 to-rose-600',
      iconBg: 'bg-rose-500/10 ring-1 ring-rose-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          gradient={card.gradient}
          iconBg={card.iconBg}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
