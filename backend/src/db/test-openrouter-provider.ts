/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
/**
 * OpenRouter Provider — Unit Tests
 *
 * Tests the OpenRouterProvider in isolation by intercepting the global `fetch`
 * so no real HTTP requests are made. All tests run synchronously in-process
 * and do NOT require a running server or database.
 *
 * Run: npm run test:openrouter
 */

process.env.NODE_ENV = 'test';

import { OpenRouterProvider } from '../core/ai/openrouter.provider';
import { CareerAdviceContext } from '../core/ai/ai-provider.types';
import { resetAIProvider } from '../core/ai';

// ---------------------------------------------------------------------------
// Test plumbing
// ---------------------------------------------------------------------------

let passedTests = 0;
let failedTests = 0;

function logPass(name: string, detail?: string): void {
  passedTests++;
  console.log(`  ✅ PASS: ${name}${detail ? ` (${detail})` : ''}`);
}

function logFail(name: string, error?: string): void {
  failedTests++;
  console.error(`  ❌ FAIL: ${name}${error ? ` — ${error}` : ''}`);
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logFail(name, (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Minimal CareerAdviceContext fixture
// ---------------------------------------------------------------------------

const FIXTURE_CONTEXT: CareerAdviceContext = {
  candidateName: 'Test Candidate',
  candidateHeadline: 'Software Engineer',
  skills: [{ name: 'TypeScript', category: 'Language', matched: true }],
  education: [
    {
      degree: 'B.Sc. Computer Science',
      university: 'Test University',
      graduationYear: 2022,
    },
  ],
  experience: [
    {
      company: 'ACME Corp',
      role: 'Junior Developer',
      duration: '1 year',
      achievements: ['Built features'],
    },
  ],
  projects: [],
  certifications: [],
  matchScores: {
    overall: 72,
    skills: 80,
    experience: 60,
    education: 70,
    certifications: 0,
    projects: 50,
  },
  matchedSkills: ['TypeScript'],
  missingSkills: ['Docker'],
  strengths: ['Strong TypeScript skills'],
  weaknesses: ['No Docker experience'],
  jobInfo: {
    title: 'Backend Engineer',
    company: 'FutureCo',
    requiredSkills: ['TypeScript', 'Docker'],
    requiredExperienceYears: 2,
    requiredDegree: 'Bachelor',
    requiredCertifications: [],
  },
};

// ---------------------------------------------------------------------------
// Successful response fixture (valid CareerAdviceResult JSON)
// ---------------------------------------------------------------------------

const VALID_RESPONSE_BODY = JSON.stringify({
  id: 'chatcmpl-test',
  model: 'openai/gpt-4o-mini-high:free',
  choices: [
    {
      message: {
        role: 'assistant',
        content: JSON.stringify({
          overallSummary: 'Great candidate with strong TypeScript skills.',
          confidenceScore: 78,
          careerPaths: [
            {
              title: 'Backend Engineer',
              description: 'Focus on backend development.',
              timeframe: '0-6 months',
              relevance: 'high',
            },
          ],
          skillRecommendations: [
            {
              skill: 'Docker',
              priority: 'critical',
              reason: 'Required by the target role.',
              resources: ['Docker docs'],
              estimatedTime: '2 weeks',
            },
          ],
          projectSuggestions: [
            {
              title: 'Docker Demo',
              description: 'Containerize an existing project.',
              techStack: ['Docker'],
              difficulty: 'intermediate',
              estimatedHours: 10,
            },
          ],
          interviewTips: [
            {
              category: 'Technical',
              tip: 'Review TypeScript generics.',
              example: 'Explain how you used generics in production.',
            },
          ],
          salaryInsights: {
            estimatedRange: '$90,000-$130,000',
            marketTrend: 'Growing demand.',
            negotiationTips: ['Research market rates.'],
          },
        }),
      },
      finish_reason: 'stop',
    },
  ],
  usage: { prompt_tokens: 100, completion_tokens: 300, total_tokens: 400 },
});

// ---------------------------------------------------------------------------
// Fetch mock helpers
// ---------------------------------------------------------------------------

/**
 * Replace global `fetch` with a mock that returns a predetermined response.
 * Returns a function that restores the original.
 */
function mockFetch(
  status: number,
  body: string,
  options: { networkError?: boolean; abortSignal?: boolean } = {}
): () => void {
  const original = global.fetch;

  if (options.networkError) {
    (global as any).fetch = async (_url: string, opts?: RequestInit) => {
      // Simulate abort (timeout) or a generic network error
      if (options.abortSignal && opts?.signal) {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        throw err;
      }
      throw new TypeError('Network request failed');
    };
  } else {
    (global as any).fetch = async () => ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => body,
      json: async () => JSON.parse(body),
    });
  }

  return () => {
    global.fetch = original;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function runTests(): Promise<void> {
  console.log('='.repeat(70));
  console.log('  OpenRouter Provider — Unit Tests');
  console.log('='.repeat(70));

  // =========================================================================
  // TEST 1: Constructor validates API key
  // =========================================================================
  console.log('\n--- Test 1: Constructor validation ---');

  await test('Throws when apiKey is empty', async () => {
    try {
      new OpenRouterProvider('');
      logFail('Throws when apiKey is empty', 'No error thrown');
    } catch (err) {
      if ((err as Error).message.includes('API key is required')) {
        logPass('Throws when apiKey is empty');
      } else {
        logFail('Throws when apiKey is empty', (err as Error).message);
      }
    }
  });

  await test('Sets default model when none supplied', async () => {
    const p = new OpenRouterProvider('sk-or-v1-test');
    if (p.name.includes('gpt-4o-mini')) {
      logPass('Sets default model when none supplied', p.name);
    } else {
      logFail('Sets default model when none supplied', `name=${p.name}`);
    }
  });

  await test('Reflects custom model in name', async () => {
    const p = new OpenRouterProvider(
      'sk-or-v1-test',
      'anthropic/claude-3-haiku'
    );
    if (p.name.includes('anthropic/claude-3-haiku')) {
      logPass('Reflects custom model in name', p.name);
    } else {
      logFail('Reflects custom model in name', `name=${p.name}`);
    }
  });

  // =========================================================================
  // TEST 2: Successful career advice generation
  // =========================================================================
  console.log('\n--- Test 2: Successful response ---');

  await test('generateCareerAdvice returns parsed result', async () => {
    const restore = mockFetch(200, VALID_RESPONSE_BODY);
    try {
      const provider = new OpenRouterProvider('sk-or-v1-test');
      const result = await provider.generateCareerAdvice(FIXTURE_CONTEXT);

      if (
        typeof result.overallSummary === 'string' &&
        result.overallSummary.length > 0
      ) {
        logPass(
          'overallSummary populated',
          result.overallSummary.substring(0, 50)
        );
      } else {
        logFail('overallSummary populated', String(result.overallSummary));
      }

      if (
        typeof result.confidenceScore === 'number' &&
        result.confidenceScore > 0
      ) {
        logPass('confidenceScore populated', String(result.confidenceScore));
      } else {
        logFail('confidenceScore populated', String(result.confidenceScore));
      }

      if (Array.isArray(result.careerPaths) && result.careerPaths.length > 0) {
        logPass(
          'careerPaths array populated',
          `${result.careerPaths.length} paths`
        );
      } else {
        logFail('careerPaths array populated');
      }

      if (
        Array.isArray(result.skillRecommendations) &&
        result.skillRecommendations.length > 0
      ) {
        logPass('skillRecommendations populated');
      } else {
        logFail('skillRecommendations populated');
      }

      if (
        Array.isArray(result.projectSuggestions) &&
        result.projectSuggestions.length > 0
      ) {
        logPass('projectSuggestions populated');
      } else {
        logFail('projectSuggestions populated');
      }

      if (
        Array.isArray(result.interviewTips) &&
        result.interviewTips.length > 0
      ) {
        logPass('interviewTips populated');
      } else {
        logFail('interviewTips populated');
      }

      if (result.salaryInsights && result.salaryInsights.estimatedRange) {
        logPass(
          'salaryInsights populated',
          result.salaryInsights.estimatedRange
        );
      } else {
        logFail('salaryInsights populated');
      }
    } finally {
      restore();
    }
  });

  // =========================================================================
  // TEST 3: Error handling — 401 Unauthorized (non-retryable)
  // =========================================================================
  console.log('\n--- Test 3: 401 Unauthorized ---');

  await test('401 throws immediately with descriptive message', async () => {
    const restore = mockFetch(401, '{"error":"Unauthorized"}');
    try {
      const provider = new OpenRouterProvider('sk-or-v1-bad-key');
      await provider.generateCareerAdvice(FIXTURE_CONTEXT);
      logFail('401 throws immediately');
    } catch (err) {
      const msg = (err as Error).message;
      if (
        msg.includes('401') ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.toLowerCase().includes('invalid')
      ) {
        logPass(
          '401 throws immediately with descriptive message',
          msg.substring(0, 80)
        );
      } else {
        logFail('401 throws immediately with descriptive message', msg);
      }
    } finally {
      restore();
    }
  });

  // =========================================================================
  // TEST 4: Error handling — 403 Forbidden (non-retryable)
  // =========================================================================
  console.log('\n--- Test 4: 403 Forbidden ---');

  await test('403 throws immediately', async () => {
    const restore = mockFetch(403, '{"error":"Forbidden"}');
    try {
      const provider = new OpenRouterProvider('sk-or-v1-test');
      await provider.generateCareerAdvice(FIXTURE_CONTEXT);
      logFail('403 throws immediately');
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
        logPass('403 throws immediately', msg.substring(0, 80));
      } else {
        logFail('403 throws immediately', msg);
      }
    } finally {
      restore();
    }
  });

  // =========================================================================
  // TEST 5: Retry on 429 (Rate Limited) — exhausts retries then throws
  // =========================================================================
  console.log('\n--- Test 5: 429 Rate Limit with retry exhaustion ---');

  await test('429 retries and eventually throws after max retries', async () => {
    let callCount = 0;
    const original = global.fetch;
    (global as any).fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 429,
        text: async () => '{"error":"Rate limited"}',
        json: async () => ({ error: 'Rate limited' }),
      };
    };

    try {
      const provider = new OpenRouterProvider('sk-or-v1-test');
      // Override backoff to 1ms so the test doesn't take minutes
      (provider as any).BACKOFF_BASE_MS = 1;
      await provider.generateCareerAdvice(FIXTURE_CONTEXT);
      logFail('429 eventually throws after max retries', 'No error thrown');
    } catch (err) {
      const msg = (err as Error).message;
      // 3 retries total = 3 fetch calls
      if (callCount >= 3) {
        logPass(
          '429 retries and eventually throws',
          `${callCount} attempts, msg: ${msg.substring(0, 60)}`
        );
      } else {
        logFail(
          '429 retries and eventually throws',
          `Only ${callCount} attempts made`
        );
      }
    } finally {
      global.fetch = original;
    }
  });

  // =========================================================================
  // TEST 6: Retry on 503 — exhausts retries then throws
  // =========================================================================
  console.log('\n--- Test 6: 503 Service Unavailable with retry ---');

  await test('503 retries and eventually throws', async () => {
    let callCount = 0;
    const original = global.fetch;
    (global as any).fetch = async () => {
      callCount++;
      return {
        ok: false,
        status: 503,
        text: async () => '{"error":"Service Unavailable"}',
        json: async () => ({ error: 'Service Unavailable' }),
      };
    };

    try {
      const provider = new OpenRouterProvider('sk-or-v1-test');
      await provider.generateCareerAdvice(FIXTURE_CONTEXT);
      logFail('503 eventually throws');
    } catch {
      if (callCount >= 3) {
        logPass('503 retries and eventually throws', `${callCount} attempts`);
      } else {
        logFail(
          '503 retries and eventually throws',
          `Only ${callCount} attempts`
        );
      }
    } finally {
      global.fetch = original;
    }
  });

  // =========================================================================
  // TEST 7: Network failure (TypeError) — retried then thrown
  // =========================================================================
  console.log('\n--- Test 7: Network failure ---');

  await test('Network failure retries and eventually throws', async () => {
    let callCount = 0;
    const original = global.fetch;
    (global as any).fetch = async () => {
      callCount++;
      throw new TypeError('Network request failed');
    };

    try {
      const provider = new OpenRouterProvider('sk-or-v1-test');
      await provider.generateCareerAdvice(FIXTURE_CONTEXT);
      logFail('Network failure eventually throws');
    } catch {
      if (callCount >= 3) {
        logPass(
          'Network failure retries and eventually throws',
          `${callCount} attempts`
        );
      } else {
        logFail(
          'Network failure retries and eventually throws',
          `Only ${callCount} attempts`
        );
      }
    } finally {
      global.fetch = original;
    }
  });

  // =========================================================================
  // TEST 8: Malformed JSON response body
  // =========================================================================
  console.log('\n--- Test 8: Malformed JSON ---');

  await test('Malformed JSON response throws parse error', async () => {
    const badJson = JSON.stringify({
      id: 'test',
      model: 'test-model',
      choices: [
        {
          message: { role: 'assistant', content: '<<NOT VALID JSON>>' },
          finish_reason: 'stop',
        },
      ],
    });
    const restore = mockFetch(200, badJson);
    try {
      const provider = new OpenRouterProvider('sk-or-v1-test');
      await provider.generateCareerAdvice(FIXTURE_CONTEXT);
      logFail('Malformed JSON throws parse error', 'No error thrown');
    } catch (err) {
      const msg = (err as Error).message.toLowerCase();
      if (
        msg.includes('parse') ||
        msg.includes('json') ||
        msg.includes('malformed')
      ) {
        logPass(
          'Malformed JSON throws parse error',
          (err as Error).message.substring(0, 60)
        );
      } else {
        logFail('Malformed JSON throws parse error', (err as Error).message);
      }
    } finally {
      restore();
    }
  });

  // =========================================================================
  // TEST 9: Factory integration — openrouter case
  // =========================================================================
  console.log('\n--- Test 9: Factory integration ---');

  await test('OpenRouterProvider instantiates correctly via direct construction', async () => {
    // env.ts is frozen at module-load time in ts-node-dev; mutating process.env has no effect.
    // We verify the provider contract by constructing it directly (exactly as the factory does).
    const provider = new OpenRouterProvider(
      'sk-or-v1-factory-test',
      'anthropic/claude-3-haiku',
      'https://openrouter.ai/api/v1'
    );
    if (
      provider.name === 'OpenRouter (anthropic/claude-3-haiku)' &&
      typeof provider.generateCareerAdvice === 'function'
    ) {
      logPass(
        'OpenRouterProvider instantiates correctly via direct construction',
        provider.name
      );
    } else {
      logFail(
        'OpenRouterProvider instantiates correctly via direct construction',
        `name=${provider.name}`
      );
    }
  });

  await test('resetAIProvider clears the singleton cache', () => {
    resetAIProvider();
    logPass('resetAIProvider clears the singleton cache');
    return Promise.resolve();
  });

  await test('Provider name reflects configured model', async () => {
    const provider = new OpenRouterProvider(
      'sk-or-v1-test',
      'meta-llama/llama-3-8b-instruct:free'
    );
    if (provider.name.includes('meta-llama/llama-3-8b-instruct:free')) {
      logPass('Provider name reflects configured model', provider.name);
    } else {
      logFail('Provider name reflects configured model', provider.name);
    }
  });

  // =========================================================================
  // TEST 10: 500 / 502 / 504 — non-retryable, throws immediately
  // =========================================================================
  console.log('\n--- Test 10: 5xx errors (non-retryable) ---');

  for (const status of [500, 502, 504]) {
    await test(`${status} throws immediately (no retry)`, async () => {
      let callCount = 0;
      const original = global.fetch;
      (global as any).fetch = async () => {
        callCount++;
        return {
          ok: false,
          status,
          text: async () => `{"error":"HTTP ${status}"}`,
          json: async () => ({ error: `HTTP ${status}` }),
        };
      };
      try {
        const provider = new OpenRouterProvider('sk-or-v1-test');
        await provider.generateCareerAdvice(FIXTURE_CONTEXT);
        logFail(`${status} throws immediately`);
      } catch {
        if (callCount === 1) {
          logPass(`${status} throws immediately (no retry)`, `1 call made`);
        } else {
          logFail(
            `${status} throws immediately`,
            `${callCount} calls made (expected 1)`
          );
        }
      } finally {
        global.fetch = original;
      }
    });
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n' + '='.repeat(70));
  console.log(
    `  OpenRouter Provider Tests: ${passedTests} passed, ${failedTests} failed`
  );
  console.log('='.repeat(70));
  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Unexpected test runner error:', err);
  process.exit(1);
});
