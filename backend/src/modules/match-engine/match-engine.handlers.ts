import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/eventTypes';
import * as matchEngineService from './match-engine.service';
import { logger } from '../../utils/logger';

/**
 * Register EventBus subscribers for the match score engine.
 */
export function registerMatchEngineHandlers(): void {
  logger.info('[Match-Engine] Registering EventBus handlers');

  // Trigger match analysis in the background when a candidate submits a new application
  eventBus.subscribe(EventType.APPLICATION_CREATED, async (payload) => {
    logger.info(
      `[Match-Engine] Auto-triggering match analysis for new application: ${payload.applicationId}`
    );
    try {
      await matchEngineService.generateMatchAnalysis(
        payload.applicationId,
        payload.userId
      );
      logger.info(
        `[Match-Engine] Auto-match analysis completed for application: ${payload.applicationId}`
      );
    } catch (err) {
      logger.error(
        `[Match-Engine] Failed to auto-generate match analysis for application ${payload.applicationId}:`,
        err
      );
    }
  });
}
