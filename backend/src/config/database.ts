import { Pool } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * PostgreSQL connection pool with retry logic.
 * Centralized database instance for the entire application.
 */
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl:
    env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

/**
 * Attempts to connect to the database with exponential backoff retry.
 * @param retries - Number of retry attempts (default: 5)
 * @param delay - Initial delay in ms between retries (default: 2000)
 */
export async function connectDatabase(
  retries = 5,
  delay = 2000
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await pool.connect();
      logger.info('✅ Database connected successfully');
      client.release();
      return;
    } catch (err) {
      logger.warn(
        `Database connection attempt ${attempt}/${retries} failed. Retrying in ${delay}ms...`
      );
      if (attempt === retries) {
        logger.error('❌ Failed to connect to database after all retries', err);
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

export { pool as db };
