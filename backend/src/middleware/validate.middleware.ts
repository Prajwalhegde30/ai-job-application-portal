import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Factory middleware for Zod request body validation.
 * Returns 400 with structured validation errors on failure.
 * @param schema - Zod schema to validate request body against
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: err.issues.map((issue) => ({
              field: issue.path.map(String).join('.'),
              message: issue.message,
            })),
          },
        });
        return;
      }
      next(err);
    }
  };
}
