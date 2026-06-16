import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

/**
 * JWT access token payload structure.
 * Encoded into every access token for route authorization.
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

/**
 * Sign a JWT access token with a 15-minute expiry.
 * Uses HS256 with the JWT_SECRET environment variable.
 * @param payload - User data to encode (userId, email, role)
 * @returns Signed JWT string
 */
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });
}

/**
 * Verify and decode a JWT access token.
 * @param token - JWT string to verify
 * @returns Decoded payload
 * @throws JsonWebTokenError if token is invalid or expired
 */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

/**
 * Generate a cryptographically secure random refresh token.
 * @returns 64-byte hex string (128 characters)
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Create a SHA-256 hash of a token for secure database storage.
 * Raw refresh tokens are never stored; only their hashes.
 * @param token - Raw token string
 * @returns SHA-256 hex digest
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
