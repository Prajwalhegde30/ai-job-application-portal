import app from './src/app';
import { env } from './src/config/env';
import { logger } from './src/utils/logger';

/**
 * Server entry point.
 * Starts the Express HTTP server after environment validation.
 */
const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${env.NODE_ENV}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
});
