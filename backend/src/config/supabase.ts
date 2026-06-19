import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from './env';
import { logger } from '../utils/logger';

// Initialize the Supabase Client if the keys are defined.
// If NODE_ENV is not 'test' and variables are missing, env.ts will fail-fast before this runs.
const supabaseUrl = env.SUPABASE_URL || '';
const supabaseServiceKey = env.SUPABASE_SERVICE_KEY || '';

export const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
        },
        realtime: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          transport: WebSocket as any,
        },
      })
    : null;

if (supabase) {
  logger.info('✅ Supabase storage client initialized successfully');
} else {
  logger.warn(
    '⚠️  Supabase storage client not initialized (optional/mock mode enabled)'
  );
}
