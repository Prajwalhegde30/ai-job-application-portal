import { Request } from 'express';

/**
 * Augment Express Request to include authenticated user info.
 * Used by auth middleware once implemented.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'ADMIN' | 'USER';
        name: string;
      };
    }
  }
}

export { Request };
