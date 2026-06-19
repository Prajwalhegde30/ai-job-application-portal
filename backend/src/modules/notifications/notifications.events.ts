import { NotificationType } from './notifications.types';

export interface NotificationDetails {
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}

/**
 * Generates notification details when a candidate applies.
 * Sent to the recruiter who posted the job.
 */
export function buildApplicationCreatedNotification(data: {
  candidateName: string;
  jobTitle: string;
  jobId: string;
}): NotificationDetails {
  return {
    type: 'APPLICATION_CREATED',
    title: 'New Application Received',
    message: `${data.candidateName} successfully applied for "${data.jobTitle}".`,
    link: `/admin/applications?jobId=${data.jobId}`,
  };
}

/**
 * Generates notification details when a candidate withdraws their application.
 * Sent to the recruiter who posted the job.
 */
export function buildApplicationWithdrawnNotification(data: {
  candidateName: string;
  jobTitle: string;
  jobId: string;
}): NotificationDetails {
  return {
    type: 'APPLICATION_WITHDRAWN',
    title: 'Application Withdrawn',
    message: `${data.candidateName} has withdrawn their application for "${data.jobTitle}".`,
    link: `/admin/applications?jobId=${data.jobId}`,
  };
}

/**
 * Generates notification details when a recruiter updates candidate's application status.
 * Sent to the candidate.
 */
export function buildApplicationStatusChangedNotification(data: {
  applicationId: string;
  jobTitle: string;
  newStatus: string;
}): NotificationDetails {
  let type: NotificationType = 'SYSTEM';
  let title = 'Application Update';
  let message = `Your application for "${data.jobTitle}" status has been updated.`;

  switch (data.newStatus) {
    case 'REVIEWING':
      type = 'APPLICATION_REVIEWING';
      title = 'Application Under Review';
      message = `Your application for "${data.jobTitle}" is now under review.`;
      break;
    case 'SHORTLISTED':
      type = 'APPLICATION_SHORTLISTED';
      title = 'Application Shortlisted';
      message = `You have been shortlisted for "${data.jobTitle}".`;
      break;
    case 'REJECTED':
      type = 'APPLICATION_REJECTED';
      title = 'Application Status Update';
      message = `Your application for "${data.jobTitle}" was not selected.`;
      break;
    case 'HIRED':
      type = 'APPLICATION_HIRED';
      title = 'Congratulations! Hired';
      message = `Congratulations! You have been hired for "${data.jobTitle}".`;
      break;
    case 'WITHDRAWN':
      type = 'APPLICATION_WITHDRAWN';
      title = 'Application Withdrawn';
      message = `Your application for "${data.jobTitle}" has been successfully withdrawn.`;
      break;
  }

  return {
    type,
    title,
    message,
    link: `/applications/${data.applicationId}`,
  };
}

/**
 * Generates notification details when a job is published.
 * Sent to job seekers or system users.
 */
export function buildJobPublishedNotification(data: {
  jobId: string;
  title: string;
  company: string;
}): NotificationDetails {
  return {
    type: 'JOB_PUBLISHED',
    title: 'New Job Posted',
    message: `A new job "${data.title}" has been published at ${data.company}.`,
    link: `/jobs/${data.jobId}`,
  };
}
