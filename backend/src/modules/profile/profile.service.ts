import { query } from '../../config/database';
import { AppError } from '../../utils/appError';
import { UpdateProfileInput } from './profile.validators';

/**
 * Profile row returned from the database.
 */
interface ProfileRow {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  skills: string[];
  experience: unknown[];
  education: unknown[];
  profile_completion: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Public profile response — excludes sensitive fields (phone, internal IDs).
 */
interface PublicProfileRow {
  headline: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  skills: string[];
  experience: unknown[];
  education: unknown[];
  profile_completion: number;
  user_name: string;
  user_role: string;
}

/**
 * Calculate profile completion percentage (0–100).
 *
 * Weights:
 *   headline      → 15%
 *   bio           → 15%
 *   skills ≥ 1    → 15%
 *   education ≥ 1 → 15%
 *   experience ≥ 1→ 15%
 *   social links  → 10% (at least one of linkedin, github, website)
 *   location      → 5%
 *   phone         → 5%
 *   website       → 5%
 */
export function calculateProfileCompletion(
  profile: Partial<ProfileRow>
): number {
  let score = 0;

  if (profile.headline && profile.headline.trim().length > 0) score += 15;
  if (profile.bio && profile.bio.trim().length > 0) score += 15;
  if (Array.isArray(profile.skills) && profile.skills.length > 0) score += 15;
  if (Array.isArray(profile.education) && profile.education.length > 0)
    score += 15;
  if (Array.isArray(profile.experience) && profile.experience.length > 0)
    score += 15;

  // Social links — at least one of linkedin, github, website
  const hasSocial =
    (profile.linkedin_url && profile.linkedin_url.trim().length > 0) ||
    (profile.github_url && profile.github_url.trim().length > 0) ||
    (profile.website && profile.website.trim().length > 0);
  if (hasSocial) score += 10;

  if (profile.location && profile.location.trim().length > 0) score += 5;
  if (profile.phone && profile.phone.trim().length > 0) score += 5;

  // Website counts separately from the social bundle
  if (profile.website && profile.website.trim().length > 0) score += 5;

  return Math.min(score, 100);
}

/**
 * Get the full profile for an authenticated user by their user_id.
 */
export async function getProfileByUserId(
  userId: string
): Promise<{ profile: ProfileRow; completionPercentage: number }> {
  const result = await query<ProfileRow>(
    `SELECT id, user_id, headline, bio, location, phone, website,
            linkedin_url, github_url, skills, experience, education,
            profile_completion, created_at, updated_at
     FROM profiles
     WHERE user_id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  const profile = result.rows[0];
  const completionPercentage = calculateProfileCompletion(profile);

  return { profile, completionPercentage };
}

/**
 * Get a public-safe profile by user_id.
 * Excludes: phone, email, internal IDs (user_id, profile id).
 * Includes: user name and role from the users table for display.
 */
export async function getPublicProfile(
  userId: string
): Promise<{ profile: PublicProfileRow; completionPercentage: number }> {
  const result = await query<PublicProfileRow>(
    `SELECT p.headline, p.bio, p.location, p.website,
            p.linkedin_url, p.github_url, p.skills, p.experience,
            p.education, p.profile_completion,
            u.name AS user_name, u.role AS user_role
     FROM profiles p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1 AND u.is_active = TRUE`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  const profile = result.rows[0];
  const completionPercentage = calculateProfileCompletion(profile);

  return { profile, completionPercentage };
}

/**
 * Update a user's profile with only the fields present in `data`.
 * Recalculates and persists profile_completion automatically.
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<{ profile: ProfileRow; completionPercentage: number }> {
  // Build SET clause dynamically from provided fields
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  const fieldMap: Record<string, unknown> = {
    headline: data.headline,
    bio: data.bio,
    location: data.location,
    phone: data.phone,
    website: data.website,
    linkedin_url: data.linkedin_url,
    github_url: data.github_url,
    skills: data.skills,
    experience: data.experience,
    education: data.education,
  };

  for (const [column, value] of Object.entries(fieldMap)) {
    if (value !== undefined) {
      // JSONB columns need to be serialized
      if (
        column === 'skills' ||
        column === 'experience' ||
        column === 'education'
      ) {
        setClauses.push(`${column} = $${paramIndex}::jsonb`);
        params.push(JSON.stringify(value));
      } else {
        setClauses.push(`${column} = $${paramIndex}`);
        params.push(value);
      }
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    // Nothing to update — return current profile
    return getProfileByUserId(userId);
  }

  // Add user_id as the final parameter for the WHERE clause
  params.push(userId);

  const updateSql = `
    UPDATE profiles
    SET ${setClauses.join(', ')}
    WHERE user_id = $${paramIndex}
    RETURNING id, user_id, headline, bio, location, phone, website,
              linkedin_url, github_url, skills, experience, education,
              profile_completion, created_at, updated_at
  `;

  const result = await query<ProfileRow>(updateSql, params);

  if (result.rows.length === 0) {
    throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  const profile = result.rows[0];
  const completionPercentage = calculateProfileCompletion(profile);

  // Persist the computed completion percentage
  await query(
    'UPDATE profiles SET profile_completion = $1 WHERE user_id = $2',
    [completionPercentage, userId]
  );

  profile.profile_completion = completionPercentage;

  return { profile, completionPercentage };
}
