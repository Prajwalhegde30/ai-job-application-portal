import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/eventTypes';
import * as aiAnalysisService from './ai-analysis.service';
import { logger } from '../../utils/logger';

/**
 * Hook up background event subscribers for automatic resume analysis.
 */
export function registerAIAnalysisHandlers(): void {
  logger.info('[AI-Analysis] Registering EventBus handlers');

  // Trigger analysis in background for uploaded resume
  eventBus.subscribe(EventType.RESUME_UPLOADED, async (payload) => {
    logger.info(
      `[AI-Analysis] Auto-triggering analysis for uploaded resume: ${payload.resumeId}`
    );
    try {
      await aiAnalysisService.generateAnalysis(
        payload.resumeId,
        payload.userId
      );
      logger.info(
        `[AI-Analysis] Auto-analysis completed for uploaded resume: ${payload.resumeId}`
      );
    } catch (err) {
      logger.error(
        `[AI-Analysis] Failed to auto-generate analysis for uploaded resume ${payload.resumeId}:`,
        err
      );
    }
  });

  // Force re-analysis in background when resume is replaced
  eventBus.subscribe(EventType.RESUME_REPLACED, async (payload) => {
    logger.info(
      `[AI-Analysis] Auto-triggering analysis for replaced resume: ${payload.resumeId}`
    );
    try {
      await aiAnalysisService.generateAnalysis(
        payload.resumeId,
        payload.userId,
        true
      ); // Force re-analysis
      logger.info(
        `[AI-Analysis] Auto-analysis completed for replaced resume: ${payload.resumeId}`
      );
    } catch (err) {
      logger.error(
        `[AI-Analysis] Failed to auto-generate analysis for replaced resume ${payload.resumeId}:`,
        err
      );
    }
  });
}
