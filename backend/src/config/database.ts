import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
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

/**
 * Gracefully closes the database connection pool.
 * Should be called during server shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await pool.end();
    logger.info('🔌 Database pool closed');
  } catch (err) {
    logger.error('Error closing database pool:', err);
  }
}

/**
 * Execute a parameterized SQL query against the pool.
 * @param text - SQL query string with $1, $2, ... placeholders
 * @param params - Array of parameter values
 * @returns QueryResult with typed rows
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;

  logger.debug('Executed query', {
    text: text.substring(0, 80),
    duration: `${duration}ms`,
    rows: result.rowCount,
  });

  return result;
}

/**
 * Acquire a client from the pool for transaction support.
 * Caller is responsible for calling client.release() when done.
 *
 * Usage:
 * ```ts
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   await client.query('INSERT INTO ...');
 *   await client.query('COMMIT');
 * } catch (err) {
 *   await client.query('ROLLBACK');
 *   throw err;
 * } finally {
 *   client.release();
 * }
 * ```
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export { pool as db };
