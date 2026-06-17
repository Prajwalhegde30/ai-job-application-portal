import { Request, Response, NextFunction } from 'express';
import * as profileService from './profile.service';
import { sendSuccess, sendError } from '../../utils/response';

/**
 * GET /api/v1/profile
 * Returns the authenticated user's own profile with completion percentage.
 */
export async function getOwnProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { profile, completionPercentage } =
      await profileService.getProfileByUserId(req.user!.userId);
    sendSuccess(res, { profile, completionPercentage });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/profile
 * Updates the authenticated user's own profile.
 * Only fields present in the request body are updated.
 */
export async function updateOwnProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { profile, completionPercentage } =
      await profileService.updateProfile(req.user!.userId, req.body);
    sendSuccess(
      res,
      { profile, completionPercentage },
      'Profile updated successfully'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/profile/:userId
 * Returns any user's profile by user ID (ADMIN only).
 * Includes all fields including phone.
 */
export async function getProfileByUserIdAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.params.userId as string;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      sendError(res, 400, 'INVALID_USER_ID', 'Invalid user ID format');
      return;
    }

    const { profile, completionPercentage } =
      await profileService.getProfileByUserId(userId);
    sendSuccess(res, { profile, completionPercentage });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/profile/public/:userId
 * Returns a public-safe profile for any user.
 * Excludes phone, email, and internal identifiers.
 * Authenticated — available to any logged-in user.
 */
export async function getPublicProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.params.userId as string;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      sendError(res, 400, 'INVALID_USER_ID', 'Invalid user ID format');
      return;
    }

    const { profile, completionPercentage } =
      await profileService.getPublicProfile(userId);
    sendSuccess(res, { profile, completionPercentage });
  } catch (err) {
    next(err);
  }
}
