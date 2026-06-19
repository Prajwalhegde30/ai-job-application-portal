'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface DashboardSummary {
  profileCompletion: number;
  totalApplications: number;
  pendingApplications: number;
  reviewingApplications: number;
  shortlistedApplications: number;
  rejectedApplications: number;
  hiredApplications: number;
  unreadNotifications: number;
  totalResumes: number;
  activeResume: boolean;
}

export interface ApplicationStatusOverview {
  pending: number;
  reviewing: number;
  shortlisted: number;
  rejected: number;
  hired: number;
  withdrawn: number;
}

export interface RecentApplication {
  applicationId: string;
  jobTitle: string;
  company: string;
  status: string;
  appliedAt: string;
}

export interface RecentNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ResumeSummary {
  totalResumes: number;
  activeResume: boolean;
  activeResumeTitle: string | null;
  activeResumeUpdatedAt: string | null;
}

// =============================================================================
// Query Keys
// =============================================================================

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  applicationStatus: () =>
    [...dashboardKeys.all, 'application-status'] as const,
  recentApplications: () =>
    [...dashboardKeys.all, 'recent-applications'] as const,
  recentNotifications: () =>
    [...dashboardKeys.all, 'recent-notifications'] as const,
  resumeSummary: () => [...dashboardKeys.all, 'resume-summary'] as const,
};

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch aggregated dashboard summary.
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { summary: DashboardSummary };
      }>('/dashboard/summary');
      return data.data.summary;
    },
    refetchInterval: 30000,
  });
}

/**
 * Fetch application status overview (count per status).
 */
export function useApplicationStatus() {
  return useQuery({
    queryKey: dashboardKeys.applicationStatus(),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { status: ApplicationStatusOverview };
      }>('/dashboard/application-status');
      return data.data.status;
    },
    refetchInterval: 30000,
  });
}

/**
 * Fetch the 5 most recent applications.
 */
export function useDashboardRecentApplications() {
  return useQuery({
    queryKey: dashboardKeys.recentApplications(),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { applications: RecentApplication[] };
      }>('/dashboard/recent-applications');
      return data.data.applications;
    },
    refetchInterval: 30000,
  });
}

/**
 * Fetch the 5 most recent notifications.
 */
export function useDashboardRecentNotifications() {
  return useQuery({
    queryKey: dashboardKeys.recentNotifications(),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { notifications: RecentNotification[] };
      }>('/dashboard/recent-notifications');
      return data.data.notifications;
    },
    refetchInterval: 30000,
  });
}

/**
 * Fetch resume summary.
 */
export function useDashboardResumeSummary() {
  return useQuery({
    queryKey: dashboardKeys.resumeSummary(),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { resumeSummary: ResumeSummary };
      }>('/dashboard/resume-summary');
      return data.data.resumeSummary;
    },
    refetchInterval: 30000,
  });
}
