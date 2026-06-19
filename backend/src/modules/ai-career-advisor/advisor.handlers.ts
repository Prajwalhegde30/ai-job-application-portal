import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/eventTypes';
import * as advisorService from './advisor.service';
import { logger } from '../../utils/logger';

/**
 * Register EventBus subscribers for the Career Advisor.
 * Generates career advice in the background after an application is created.
 * NOTE: This fires after match-engine has already been triggered by the same event.
 * A small delay ensures match analysis is available for the context builder.
 */
export function registerCareerAdvisorHandlers(): void {
  logger.info('[Career Advisor] Registering EventBus handlers');

  eventBus.subscribe(EventType.APPLICATION_CREATED, async (payload) => {
    logger.info(
      `[Career Advisor] Auto-triggering career advice for new application: ${payload.applicationId}`
    );

    // Delay slightly to allow match analysis to complete first
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await advisorService.generateCareerAdvice(
        payload.applicationId,
        payload.userId
      );
      logger.info(
        `[Career Advisor] Auto-career advice completed for application: ${payload.applicationId}`
      );
    } catch (err) {
      logger.error(
        `[Career Advisor] Failed to auto-generate career advice for application ${payload.applicationId}:`,
        err
      );
    }
  });
}
