import { AIProvider } from './ai-provider.interface';
import { MockProvider } from './mock.provider';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { OpenRouterProvider } from './openrouter.provider';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

/**
 * AI Provider Factory
 *
 * Creates the appropriate AI provider based on the AI_PROVIDER environment variable.
 * The singleton instance is cached after first creation.
 *
 * Supported providers:
 *   mock        — deterministic, no external calls (default)
 *   openai      — OpenAI GPT models (requires OPENAI_API_KEY)
 *   gemini      — Google Gemini (requires GEMINI_API_KEY)
 *   openrouter  — OpenRouter gateway (requires OPENROUTER_API_KEY)
 */
let cachedProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = env.AI_PROVIDER || 'mock';

  switch (providerName) {
    case 'openai': {
      if (!env.OPENAI_API_KEY) {
        logger.warn(
          '[AI Factory] OPENAI_API_KEY not set, falling back to Mock provider'
        );
        cachedProvider = new MockProvider();
      } else {
        cachedProvider = new OpenAIProvider(env.OPENAI_API_KEY);
        logger.info('[AI Factory] Initialized OpenAI provider');
      }
      break;
    }
    case 'gemini': {
      if (!env.GEMINI_API_KEY) {
        logger.warn(
          '[AI Factory] GEMINI_API_KEY not set, falling back to Mock provider'
        );
        cachedProvider = new MockProvider();
      } else {
        cachedProvider = new GeminiProvider(env.GEMINI_API_KEY);
        logger.info('[AI Factory] Initialized Gemini provider');
      }
      break;
    }
    case 'openrouter': {
      if (!env.OPENROUTER_API_KEY) {
        logger.warn(
          '[AI Factory] OPENROUTER_API_KEY not set, falling back to Mock provider'
        );
        cachedProvider = new MockProvider();
      } else {
        cachedProvider = new OpenRouterProvider(
          env.OPENROUTER_API_KEY,
          env.OPENROUTER_MODEL,
          env.OPENROUTER_BASE_URL
        );
        logger.info(
          `[AI Factory] Initialized OpenRouter provider (model: ${env.OPENROUTER_MODEL ?? 'default'})`
        );
      }
      break;
    }
    case 'mock':
    default: {
      cachedProvider = new MockProvider();
      logger.info('[AI Factory] Initialized Mock AI provider');
      break;
    }
  }

  return cachedProvider;
}

/**
 * Reset the cached provider (useful for testing).
 */
export function resetAIProvider(): void {
  cachedProvider = null;
}
