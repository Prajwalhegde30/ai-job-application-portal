import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/eventTypes';
import {
  createNotification,
  createBulkNotifications,
} from './notifications.service';
import {
  buildApplicationCreatedNotification,
  buildApplicationWithdrawnNotification,
  buildApplicationStatusChangedNotification,
  buildJobPublishedNotification,
} from './notifications.events';
import { query } from '../../config/database';
import { logger } from '../../utils/logger';

/**
 * Register notification event subscribers on the central EventBus.
 * Decouples other system modules from notification formatting and delivery.
 */
export function registerNotificationHandlers(): void {
  // 1. Candidate Applies -> Notify Recruiter
  eventBus.subscribe(EventType.APPLICATION_CREATED, async (payload) => {
    try {
      logger.info(
        `[NotificationHandler] Handling APPLICATION_CREATED for application ${payload.applicationId}`
      );

      // Query database for candidate name, job title, and recruiter ID
      const result = await query<{
        candidate_name: string;
        job_title: string;
        recruiter_id: string;
      }>(
        `SELECT u.name AS candidate_name, j.title AS job_title, j.posted_by AS recruiter_id
         FROM applications a
         JOIN users u ON u.id = a.user_id
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = $1`,
        [payload.applicationId]
      );

      if (result.rows.length === 0) {
        logger.warn(
          `[NotificationHandler] Application not found during notification build: ${payload.applicationId}`
        );
        return;
      }

      const { candidate_name, job_title, recruiter_id } = result.rows[0];

      const notification = buildApplicationCreatedNotification({
        candidateName: candidate_name,
        jobTitle: job_title,
        jobId: payload.jobId,
      });

      await createNotification(recruiter_id, notification);
    } catch (err) {
      logger.error(
        '[NotificationHandler] Failed to process APPLICATION_CREATED event:',
        err
      );
    }
  });

  // 2. Candidate Withdraws -> Notify Recruiter
  eventBus.subscribe(EventType.APPLICATION_WITHDRAWN, async (payload) => {
    try {
      logger.info(
        `[NotificationHandler] Handling APPLICATION_WITHDRAWN for application ${payload.applicationId}`
      );

      // Query database for candidate name, job title, and recruiter ID
      const result = await query<{
        candidate_name: string;
        job_title: string;
        recruiter_id: string;
      }>(
        `SELECT u.name AS candidate_name, j.title AS job_title, j.posted_by AS recruiter_id
         FROM applications a
         JOIN users u ON u.id = a.user_id
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = $1`,
        [payload.applicationId]
      );

      if (result.rows.length === 0) {
        logger.warn(
          `[NotificationHandler] Application not found during notification build: ${payload.applicationId}`
        );
        return;
      }

      const { candidate_name, job_title, recruiter_id } = result.rows[0];

      const notification = buildApplicationWithdrawnNotification({
        candidateName: candidate_name,
        jobTitle: job_title,
        jobId: payload.jobId,
      });

      await createNotification(recruiter_id, notification);
    } catch (err) {
      logger.error(
        '[NotificationHandler] Failed to process APPLICATION_WITHDRAWN event:',
        err
      );
    }
  });

  // 3. Recruiter Updates Application Status -> Notify Candidate
  eventBus.subscribe(EventType.APPLICATION_STATUS_CHANGED, async (payload) => {
    try {
      // Don't notify candidate if candidate withdrew their own application
      if (
        payload.newStatus === 'WITHDRAWN' &&
        payload.actorType === 'USER' &&
        payload.userId === payload.performedBy
      ) {
        logger.info(
          `[NotificationHandler] Skipping candidate notification for self-withdrawal of application ${payload.applicationId}`
        );
        return;
      }

      logger.info(
        `[NotificationHandler] Event: APPLICATION_STATUS_CHANGED. Notifying Candidate ${payload.userId}`
      );

      // Query job title
      const result = await query<{ job_title: string }>(
        `SELECT j.title AS job_title
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE a.id = $1`,
        [payload.applicationId]
      );

      if (result.rows.length === 0) {
        logger.warn(
          `[NotificationHandler] Application not found during notification build: ${payload.applicationId}`
        );
        return;
      }

      const { job_title } = result.rows[0];

      const notification = buildApplicationStatusChangedNotification({
        applicationId: payload.applicationId,
        jobTitle: job_title,
        newStatus: payload.newStatus,
      });

      await createNotification(payload.userId, notification);
    } catch (err) {
      logger.error(
        '[NotificationHandler] Failed to process APPLICATION_STATUS_CHANGED event:',
        err
      );
    }
  });

  // 4. Recruiter Publishes a New Job -> Notify All Registered Job Seekers (Bulk)
  eventBus.subscribe(EventType.JOB_PUBLISHED, async (payload) => {
    try {
      logger.info(
        `[NotificationHandler] Event: JOB_PUBLISHED. Broadcasting new job ${payload.jobId}`
      );

      // Query job details
      const result = await query<{
        title: string;
        company: string;
      }>('SELECT title, company FROM jobs WHERE id = $1', [payload.jobId]);

      if (result.rows.length === 0) {
        logger.warn(
          `[NotificationHandler] Job not found during notification build: ${payload.jobId}`
        );
        return;
      }

      const { title, company } = result.rows[0];

      const notification = buildJobPublishedNotification({
        jobId: payload.jobId,
        title,
        company,
      });

      // Fetch all candidate IDs (role = 'USER')
      const candidates = await query<{ id: string }>(
        "SELECT id FROM users WHERE role = 'USER'",
        []
      );
      const candidateIds = candidates.rows.map((row) => row.id);

      if (candidateIds.length > 0) {
        await createBulkNotifications(candidateIds, notification);
        logger.info(
          `[NotificationHandler] Dispatched bulk job notifications to ${candidateIds.length} users`
        );
      }
    } catch (err) {
      logger.error(
        '[NotificationHandler] Failed to process JOB_PUBLISHED event:',
        err
      );
    }
  });
}
