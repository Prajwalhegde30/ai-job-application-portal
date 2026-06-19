import { Request, Response, NextFunction } from 'express';
import { query } from '../../config/database';
import { supabase } from '../../config/supabase';
import { env } from '../../config/env';
import { sendSuccess } from '../../utils/response';

/**
 * GET /live
 * Lightweight live check. Checks if the HTTP server is running.
 */
export function liveCheck(_req: Request, res: Response): void {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
}

/**
 * GET /ready
 * Readiness check. Verifies external dependencies (Neon Database & Supabase Storage).
 */
export async function readyCheck(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const checks: { database: string; storage: string } = {
      database: 'down',
      storage: 'down',
    };

    // 1. Check database connection
    try {
      await query('SELECT 1');
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    // 2. Check Supabase storage connectivity if initialized
    if (env.NODE_ENV === 'test' || !supabase) {
      checks.storage = 'mock_ok';
    } else {
      try {
        // Path is the first parameter in Supabase's list call
        const { error } = await supabase.storage
          .from(env.SUPABASE_BUCKET)
          .list(undefined, { limit: 1 });
        if (error) throw error;
        checks.storage = 'ok';
      } catch {
        checks.storage = 'error';
      }
    }

    const isHealthy = checks.database === 'ok' && checks.storage !== 'error';

    if (isHealthy) {
      sendSuccess(res, {
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks,
      });
    } else {
      res.status(503).json({
        success: false,
        error: {
          code: 'DEPENDENCY_FAILURE',
          message: 'One or more downstream services are unhealthy',
          checks,
        },
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /health
 * Detailed health status combining resource metrics, dependency check, and state.
 */
export async function healthCheck(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const stats = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
      nodeVersion: process.version,
      uptime: `${Math.floor(uptime)}s`,
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      },
      aiProvider: env.AI_PROVIDER,
    };

    // Double check database connectivity
    try {
      await query('SELECT 1');
    } catch {
      stats.status = 'unhealthy';
    }

    if (stats.status === 'ok') {
      sendSuccess(res, stats);
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'SYSTEM_UNHEALTHY',
          message: 'System database is currently unreachable',
          stats,
        },
      });
    }
  } catch (err) {
    next(err);
  }
}
