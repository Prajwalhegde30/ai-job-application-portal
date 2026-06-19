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
  createdAt: Date;
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
  appliedAt: Date;
}
