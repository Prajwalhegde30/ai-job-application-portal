import { Response } from 'express';

/**
 * Standard success response envelope.
 * @param res - Express response object
 * @param data - Response payload
 * @param message - Optional success message
 * @param statusCode - HTTP status code (default: 200)
 * @param meta - Optional pagination metadata
 */
export function sendSuccess(
  res: Response,
  data: unknown,
  message?: string,
  statusCode = 200,
  meta?: { page: number; limit: number; total: number }
): void {
  res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  });
}

/**
 * Standard error response envelope.
 * @param res - Express response object
 * @param statusCode - HTTP status code
 * @param code - Machine-readable error code
 * @param message - Human-readable error message
 * @param details - Optional array of validation error details
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown[]
): void {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  });
}
