/**
 * Augment Express Request to include authenticated user info.
 * Populated by the authenticate() middleware from JWT payload.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: 'ADMIN' | 'USER';
      };
    }
  }
}

export {};
