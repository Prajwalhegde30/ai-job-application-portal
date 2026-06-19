'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Zap,
  User,
  FileText,
  Briefcase,
  ClipboardList,
  Bell,
} from 'lucide-react';

const QUICK_ACTIONS = [
  {
    label: 'Edit Profile',
    href: '/profile',
    icon: User,
    color: 'text-blue-400',
    hoverBg: 'hover:bg-blue-500/10 hover:border-blue-500/40',
  },
  {
    label: 'Manage Resumes',
    href: '/resumes',
    icon: FileText,
    color: 'text-emerald-400',
    hoverBg: 'hover:bg-emerald-500/10 hover:border-emerald-500/40',
  },
  {
    label: 'Browse Jobs',
    href: '/jobs',
    icon: Briefcase,
    color: 'text-violet-400',
    hoverBg: 'hover:bg-violet-500/10 hover:border-violet-500/40',
  },
  {
    label: 'View Applications',
    href: '/applications',
    icon: ClipboardList,
    color: 'text-amber-400',
    hoverBg: 'hover:bg-amber-500/10 hover:border-amber-500/40',
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: Bell,
    color: 'text-rose-400',
    hoverBg: 'hover:bg-rose-500/10 hover:border-rose-500/40',
  },
];

/**
 * Quick actions panel with navigation shortcuts for candidates.
 */
export function QuickActionsPanel() {
  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <Zap className="h-4.5 w-4.5 text-amber-400" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.label} href={action.href}>
              <Button
                variant="outline"
                className={`h-auto w-full flex-col gap-2 border-slate-700/60 bg-slate-800/30 py-4 text-slate-300 transition-all ${action.hoverBg}`}
              >
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-[11px] font-medium">{action.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
