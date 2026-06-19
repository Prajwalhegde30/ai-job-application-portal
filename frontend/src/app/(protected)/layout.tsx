'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  LogOut,
  Bell,
  Menu,
  X,
  Sparkles,
  Settings,
  Users,
  Shield,
} from 'lucide-react';

/**
 * Protected Layout
 * Wraps dashboard and other protected sections in AuthGuard.
 * Renders a role-aware responsive sidebar layout with a global header.
 *
 * Navigation is role-filtered:
 *   - USER sees: Dashboard, Jobs, Applications, Resumes, Profile
 *   - ADMIN sees: Dashboard, Jobs, My Jobs (admin), Applicants, Profile
 *
 * NOTE: Client-side navigation filtering is a UX convenience only.
 * Backend requireRole() enforces authorization on all API routes.
 */
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isAdmin, isUser } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount({ refetchInterval: 30000 });

  /** Navigation items shown to all authenticated users */
  const commonNav = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      disabled: false,
    },
    { name: 'Jobs', href: '/jobs', icon: Briefcase, disabled: false },
  ];

  /** Navigation items shown only to ADMIN role */
  const adminNav = [
    { name: 'My Jobs', href: '/admin/jobs', icon: Settings, disabled: false },
    {
      name: 'Applications',
      href: '/admin/applications',
      icon: Users,
      disabled: false,
    },
  ];

  /** Navigation items shown only to USER role */
  const userNav = [
    {
      name: 'My Applications',
      href: '/applications',
      icon: FileText,
      disabled: false,
    },
    { name: 'Resumes', href: '/resumes', icon: FileText, disabled: false },
  ];

  /** Profile — shown to all roles */
  const profileNav = [
    { name: 'Profile', href: '/profile', icon: User, disabled: false },
  ];

  // Compose navigation based on role
  const navigation = [
    ...commonNav,
    ...(isAdmin ? adminNav : []),
    ...(isUser ? userNav : []),
    ...profileNav,
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
        {/* Mobile sidebar backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-md transition-transform duration-300 lg:static lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo / Brand */}
          <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 font-bold text-white shadow-lg shadow-blue-500/20">
                AI
              </div>
              <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                CareerPortal
              </span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Role Badge */}
          <div className="px-6 pt-4">
            <div
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                isAdmin
                  ? 'border border-violet-800/50 bg-violet-950/60 text-violet-300'
                  : 'border border-blue-800/50 bg-blue-950/60 text-blue-300'
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>{isAdmin ? 'Admin' : 'Job Seeker'}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.name}>
                  {item.disabled ? (
                    <div className="flex cursor-not-allowed items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-500">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                      <span className="ml-auto rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-normal text-slate-400">
                        Soon
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                        isActive
                          ? 'border-l-2 border-blue-500 bg-gradient-to-r from-blue-600/10 to-violet-600/10 text-blue-400'
                          : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                      }`}
                    >
                      <item.icon
                        className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User profile footer */}
          <div className="border-t border-slate-800 bg-slate-900/80 p-4">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-sm font-medium text-white">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name || 'User'}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {user?.email || 'email@example.com'}
                </p>
              </div>
            </div>
            <Separator className="my-3 bg-slate-800" />
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-3 text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Content Wrapper */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/30 px-6 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="hover:bg-slate-850 rounded-lg p-1.5 text-slate-400 hover:text-white lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-400 sm:flex">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-blue-400" />
                <span>Phase 9 Active: Notification System</span>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/notifications"
                className="relative rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="View notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white ring-1 ring-slate-950">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <div className="h-6 w-px bg-slate-800" />

              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-slate-400 md:inline-block">
                  Role:{' '}
                  <span
                    className={`font-semibold ${isAdmin ? 'text-violet-400' : 'text-blue-400'}`}
                  >
                    {user?.role || 'USER'}
                  </span>
                </span>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
