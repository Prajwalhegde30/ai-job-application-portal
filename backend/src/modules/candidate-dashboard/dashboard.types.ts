/**
 * Candidate Dashboard module type definitions.
 * Used across service, controller, and route layers.
 */

// =============================================================================
// Dashboard Summary
// =============================================================================

/** Aggregated dashboard summary returned by GET /dashboard/summary */
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

// =============================================================================
// Application Status Overview
// =============================================================================

/** Per-status counts returned by GET /dashboard/application-status */
export interface ApplicationStatusOverview {
  pending: number;
  reviewing: number;
  shortlisted: number;
  rejected: number;
  hired: number;
  withdrawn: number;
}

// =============================================================================
// Recent Applications
// =============================================================================

/** Slim application record for the recent applications list */
export interface RecentApplication {
  applicationId: string;
  jobTitle: string;
  company: string;
  status: string;
  appliedAt: Date;
}

// =============================================================================
// Recent Notifications
// =============================================================================

/** Slim notification record for the notification preview */
export interface RecentNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

// =============================================================================
// Resume Summary
// =============================================================================

/** Resume summary returned by GET /dashboard/resume-summary */
export interface ResumeSummary {
  totalResumes: number;
  activeResume: boolean;
  activeResumeTitle: string | null;
  activeResumeUpdatedAt: Date | null;
}
