import { query, getClient } from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/hash';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from '../../utils/jwt';
import { AppError } from '../../utils/appError';
import { RegisterInput, LoginInput } from './auth.validators';

/**
 * Public user data returned in API responses (no password_hash).
 */
interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

/**
 * Token pair returned after login/register/refresh.
 */
interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new user account.
 * - Always creates with role USER (ADMIN via seed/controlled onboarding)
 * - Auto-creates an empty profile (transaction)
 * - Returns user + token pair
 */
export async function register(
  data: RegisterInput
): Promise<{ user: UserResponse } & AuthTokens> {
  // Check email uniqueness
  const existing = await query('SELECT id FROM users WHERE email = $1', [
    data.email,
  ]);
  if (existing.rows.length > 0) {
    throw new AppError('Email is already registered', 409, 'EMAIL_EXISTS');
  }

  const passwordHash = await hashPassword(data.password);

  // Transaction: create user + profile
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'USER')
       RETURNING id, email, name, role`,
      [data.email, passwordHash, data.name]
    );
    const user = userResult.rows[0];

    // Auto-create empty profile (FR-PROF-03)
    await client.query(`INSERT INTO profiles (user_id) VALUES ($1)`, [user.id]);

    await client.query('COMMIT');

    // Generate tokens
    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await saveRefreshToken(user.id, tokenHash, expiresAt);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Authenticate a user with email and password.
 * Returns user data + token pair on success.
 */
export async function login(
  data: LoginInput
): Promise<{ user: UserResponse } & AuthTokens> {
  const result = await query(
    'SELECT id, email, password_hash, name, role, is_active FROM users WHERE email = $1',
    [data.email]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
  }

  const passwordValid = await comparePassword(
    data.password,
    user.password_hash
  );
  if (!passwordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await saveRefreshToken(user.id, tokenHash, expiresAt);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

/**
 * Rotate refresh tokens.
 * - Validates the old refresh token
 * - Revokes it
 * - Issues a new token pair
 */
export async function refreshTokens(
  rawRefreshToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const tokenHash = hashToken(rawRefreshToken);

  const result = await query(
    `SELECT rt.id, rt.user_id, rt.is_revoked, rt.expires_at,
            u.email, u.role, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  const storedToken = result.rows[0];

  if (storedToken.is_revoked) {
    throw new AppError('Refresh token has been revoked', 401, 'TOKEN_REVOKED');
  }

  if (new Date(storedToken.expires_at) < new Date()) {
    throw new AppError('Refresh token has expired', 401, 'TOKEN_EXPIRED');
  }

  if (!storedToken.is_active) {
    throw new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED');
  }

  // Revoke the old token
  await revokeRefreshToken(tokenHash);

  // Issue new token pair
  const accessToken = signAccessToken({
    userId: storedToken.user_id,
    email: storedToken.email,
    role: storedToken.role,
  });

  const newRefreshToken = generateRefreshToken();
  const newTokenHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await saveRefreshToken(storedToken.user_id, newTokenHash, expiresAt);

  return { accessToken, refreshToken: newRefreshToken };
}

/**
 * Logout by revoking the provided refresh token.
 */
export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await revokeRefreshToken(tokenHash);
}

/**
 * Get the current authenticated user by ID.
 * Returns public user data (no password_hash).
 */
export async function getCurrentUser(userId: string): Promise<UserResponse> {
  const result = await query<UserResponse>(
    'SELECT id, name, email, role FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return result.rows[0];
}

/**
 * Store a hashed refresh token in the database.
 */
async function saveRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

/**
 * Mark a refresh token as revoked by its hash.
 */
async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await query(
    'UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1',
    [tokenHash]
  );
}
