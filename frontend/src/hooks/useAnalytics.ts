'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type AnalyticsRange = '7d' | '30d' | '90d';

export interface DashboardSummary {
  totalJobs: number;
  draftJobs: number;
  publishedJobs: number;
  closedJobs: number;
  totalApplications: number;
  reviewingApplications: number;
  shortlistedApplications: number;
  hiredApplications: number;
  rejectedApplications: number;
  unreadNotifications: number;
}

export interface ApplicationTrendPoint {
  date: string;
  applications: number;
}

export interface HiringFunnel {
  pending: number;
  reviewing: number;
  shortlisted: number;
  hired: number;
  rejected: number;
  withdrawn: number;
}

export interface TopJob {
  jobId: string;
  title: string;
  slug: string | null;
  status: string;
  createdAt: string;
  applicationCount: number;
}

export interface JobPerformance {
  applications: number;
  reviewing: number;
  shortlisted: number;
  hired: number;
  rejected: number;
  withdrawn: number;
  conversionRate: number;
  hireRate: number;
}

export interface RecentApplication {
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  status: string;
  appliedAt: string;
}

const analyticsKeys = {
  all: ['analytics'] as const,
  summary: () => [...analyticsKeys.all, 'summary'] as const,
  trends: (range: AnalyticsRange) =>
    [...analyticsKeys.all, 'trends', range] as const,
  funnel: () => [...analyticsKeys.all, 'funnel'] as const,
  topJobs: () => [...analyticsKeys.all, 'top-jobs'] as const,
  jobPerformance: (jobId: string) =>
    [...analyticsKeys.all, 'job-performance', jobId] as const,
  recentApplications: () =>
    [...analyticsKeys.all, 'recent-applications'] as const,
};

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: analyticsKeys.summary(),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { summary: DashboardSummary };
      }>('/analytics/summary');
      return data.data.summary;
    },
    refetchInterval: 30000,
  });
}

export function useApplicationTrends(range: AnalyticsRange) {
  return useQuery({
    queryKey: analyticsKeys.trends(range),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { trends: ApplicationTrendPoint[] };
      }>('/analytics/application-trends', { params: { range } });
      return data.data.trends;
    },
    refetchInterval: 30000,
  });
}

export function useHiringFunnel() {
  return useQuery({
    queryKey: analyticsKeys.funnel(),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { funnel: HiringFunnel };
      }>('/analytics/hiring-funnel');
      return data.data.funnel;
    },
    refetchInterval: 30000,
  });
}

export function useTopJobs() {
  return useQuery({
    queryKey: analyticsKeys.topJobs(),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { jobs: TopJob[] };
      }>('/analytics/top-jobs');
      return data.data.jobs;
    },
    refetchInterval: 30000,
  });
}

export function useJobPerformance(jobId: string) {
  return useQuery({
    queryKey: analyticsKeys.jobPerformance(jobId),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { performance: JobPerformance };
      }>(`/analytics/job-performance/${jobId}`);
      return data.data.performance;
    },
    enabled: !!jobId,
  });
}

export function useRecentApplications() {
  return useQuery({
    queryKey: analyticsKeys.recentApplications(),
    queryFn: async () => {
      const { data } = await api.get<{
        success: boolean;
        data: { applications: RecentApplication[] };
      }>('/analytics/recent-applications');
      return data.data.applications;
    },
    refetchInterval: 30000,
  });
}
