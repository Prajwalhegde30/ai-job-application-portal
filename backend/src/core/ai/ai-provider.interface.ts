import { CareerAdviceContext, CareerAdviceResult } from './ai-provider.types';

/**
 * AI Provider Interface
 *
 * All AI providers must implement this interface.
 * The rest of the application interacts ONLY through this contract —
 * it never knows which provider is active.
 */
export interface AIProvider {
  /** Human-readable provider name (e.g. "OpenAI GPT-4o-mini", "Google Gemini", "Mock") */
  readonly name: string;

  /**
   * Generate personalized career advice from structured context.
   * The context contains processed intelligence from Phases 12 & 13.
   * Implementations must never request or use raw resume text.
   */
  generateCareerAdvice(
    context: CareerAdviceContext
  ): Promise<CareerAdviceResult>;
}
