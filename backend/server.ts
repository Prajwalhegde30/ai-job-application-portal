import app from './src/app';
import { env } from './src/config/env';
import { connectDatabase, disconnectDatabase } from './src/config/database';
import { logger } from './src/utils/logger';

/**
 * Server entry point.
 * Connects to the database before starting the Express HTTP server.
 * Registers graceful shutdown handlers for SIGTERM and SIGINT.
 */
const PORT = env.PORT;

async function startServer(): Promise<void> {
  try {
    // Connect to database before accepting requests
    await connectDatabase();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('🛑 HTTP server closed');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error(
        '🔥 Unhandled Promise Rejection:',
        reason instanceof Error ? reason : new Error(String(reason))
      );
    });

    process.on('uncaughtException', (err: Error) => {
      logger.error('🔥 Uncaught Exception:', err);
      // Exit process to let orchestrator (Railway / Docker) restart it in a clean state
      process.exit(1);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
