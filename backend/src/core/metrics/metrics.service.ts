import { env } from '../../config/env';
import { eventBus } from '../events/eventBus';
import { EventType } from '../events/eventTypes';
import { logger } from '../../utils/logger';

export class MetricsService {
  private static instance: MetricsService;

  // HTTP Metrics
  private requestCount = 0;
  private responseTimeSum = 0;
  private errorCount = 0;

  // AI API Call Count
  private aiRequests: Record<string, number> = {
    mock: 0,
    openai: 0,
    gemini: 0,
  };

  // Business Metrics
  private applicationCount = 0;
  private notificationCount = 0;

  private constructor() {
    this.registerEventSubscriptions();
  }

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Automatically hook business events from the EventBus to increment metrics
   */
  private registerEventSubscriptions(): void {
    try {
      eventBus.subscribe(EventType.APPLICATION_CREATED, () => {
        this.incrementApplicationCount();
      });
      logger.info(
        '📊 MetricsService registered to EventBus: APPLICATION_CREATED'
      );
    } catch (err) {
      logger.error(
        'Failed to register EventBus subscriptions in MetricsService:',
        err
      );
    }
  }

  public incrementRequestCount(): void {
    this.requestCount++;
  }

  public recordResponseTime(ms: number): void {
    this.responseTimeSum += ms;
  }

  public incrementErrorCount(): void {
    this.errorCount++;
  }

  public incrementAIRequest(provider: string): void {
    const key = provider.toLowerCase();
    if (key === 'mock' || key === 'openai' || key === 'gemini') {
      this.aiRequests[key]++;
    } else {
      this.aiRequests[key] = (this.aiRequests[key] || 0) + 1;
    }
  }

  public incrementApplicationCount(): void {
    this.applicationCount++;
  }

  public incrementNotificationCount(): void {
    this.notificationCount++;
  }

  public getMetrics() {
    const avgResponseTime =
      this.requestCount > 0
        ? Math.round((this.responseTimeSum / this.requestCount) * 100) / 100
        : 0;

    return {
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        errorRate:
          this.requestCount > 0
            ? `${Math.round((this.errorCount / this.requestCount) * 10000) / 100}%`
            : '0%',
        avgResponseTimeMs: avgResponseTime,
      },
      aiRequests: this.aiRequests,
      businessMetrics: {
        applicationsSubmitted: this.applicationCount,
        notificationsDispatched: this.notificationCount,
      },
    };
  }
}

export const metricsService = MetricsService.getInstance();
