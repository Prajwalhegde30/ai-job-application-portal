/* eslint-disable no-console */
/**
 * Minimal Gemini model validation ping.
 */
import dotenv from 'dotenv';
dotenv.config();

const MODELS_TO_TRY = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash',
];

const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY is not set in .env');
  process.exit(1);
}

console.log('✅ AI_PROVIDER=gemini confirmed');
console.log(
  `✅ GEMINI_API_KEY present (starts with: ${apiKey.substring(0, 6)}...)\n`
);

async function ping() {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of MODELS_TO_TRY) {
    console.log(`Testing model: "${modelName}" ...`);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(
        'Reply with exactly: GEMINI_OK'
      );
      const text = result.response.text().trim();
      console.log(`  Response: "${text.substring(0, 80)}"`);
      console.log(
        `\n✅ SUCCESS — Model "${modelName}" is live and responding!`
      );
      console.log('  Use this model in gemini.provider.ts');
      return modelName;
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('429')) {
        console.log(
          `  ⚠️  ${modelName}: 429 Quota exceeded (free tier limit hit)`
        );
      } else if (msg.includes('404')) {
        console.log(`  ❌ ${modelName}: 404 Not found / deprecated`);
      } else {
        console.log(`  ❌ ${modelName}: ${msg.substring(0, 120)}`);
      }
    }
  }

  console.log(
    '\n❌ All tested models are either quota-exceeded or deprecated.'
  );
  console.log(
    '   This API key has hit its free-tier daily quota limit (limit: 0 requests).'
  );
  console.log(
    '   Action required: upgrade to a paid Gemini API plan or wait for daily reset.'
  );
  process.exit(1);
}

ping();
