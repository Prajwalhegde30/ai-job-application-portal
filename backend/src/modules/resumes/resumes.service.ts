import { query } from '../../config/database';
import { AppError } from '../../utils/appError';
import { ResumeRow } from './resumes.types';
import * as storageService from './resumes.storage';
import { logger } from '../../utils/logger';
import { eventBus } from '../../core/events/eventBus';
import { EventType } from '../../core/events/eventTypes';

// Helper to generate a unique storage path for a user
function getStoragePath(userId: string, originalName: string): string {
  const cleanName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `resumes/${userId}/${timestamp}_${random}_${cleanName}`;
}

// =============================================================================
// UPLOAD
// =============================================================================

export async function uploadResume(
  userId: string,
  fileName: string,
  buffer: Buffer,
  fileType: string,
  fileSize: number,
  resumeTitle: string
): Promise<ResumeRow> {
  // 1. Check if user has other resumes to determine active status
  const existingCountRes = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM resumes WHERE user_id = $1',
    [userId]
  );
  const existingCount = parseInt(existingCountRes.rows[0].count, 10);

  // Rule: First uploaded resume automatically becomes active
  const isActive = existingCount === 0;

  // 2. Upload to storage
  const storagePath = getStoragePath(userId, fileName);
  const fileUrl = await storageService.uploadFile(
    storagePath,
    buffer,
    fileType
  );

  // 3. Save to database (populate both legacy and new columns for backward compatibility)
  const insertRes = await query<ResumeRow>(
    `INSERT INTO resumes (
       user_id, name, file_url, file_key, is_default,
       file_name, storage_path, is_active, file_size, file_type,
       resume_title
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      userId,
      fileName, // name (legacy)
      fileUrl, // file_url (legacy)
      storagePath, // file_key (legacy)
      isActive, // is_default (legacy)
      fileName, // file_name
      storagePath, // storage_path
      isActive, // is_active
      fileSize, // file_size
      fileType, // file_type
      resumeTitle, // resume_title
    ]
  );

  const inserted = insertRes.rows[0];
  eventBus.publish(EventType.RESUME_UPLOADED, {
    resumeId: inserted.id,
    userId: inserted.user_id,
  });

  return inserted;
}

// =============================================================================
// LIST
// =============================================================================

export async function listResumes(userId: string): Promise<ResumeRow[]> {
  const result = await query<ResumeRow>(
    'SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

// =============================================================================
// VIEW (SIGNED URL)
// =============================================================================

export async function getResumeDownloadUrl(
  resumeId: string,
  userId: string,
  userRole?: string
): Promise<string> {
  const result = await query<ResumeRow>(
    'SELECT user_id, storage_path FROM resumes WHERE id = $1',
    [resumeId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
  }

  // Ownership enforcement: allow owner OR any ADMIN
  if (result.rows[0].user_id !== userId && userRole !== 'ADMIN') {
    throw new AppError('You do not own this resume', 403, 'FORBIDDEN');
  }

  // Generate short-lived signed URL (15 min)
  return storageService.getSignedUrl(result.rows[0].storage_path, 900);
}

// =============================================================================
// ACTIVATE
// =============================================================================

export async function activateResume(
  resumeId: string,
  userId: string
): Promise<ResumeRow> {
  // 1. Verify existence and ownership
  const verify = await query<ResumeRow>(
    'SELECT id, user_id FROM resumes WHERE id = $1',
    [resumeId]
  );

  if (verify.rows.length === 0) {
    throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
  }

  if (verify.rows[0].user_id !== userId) {
    throw new AppError('You do not own this resume', 403, 'FORBIDDEN');
  }

  // 2. Database transaction: deactivate all other resumes and activate the selected one
  await query('BEGIN');
  try {
    await query(
      'UPDATE resumes SET is_active = FALSE, is_default = FALSE WHERE user_id = $1',
      [userId]
    );

    const result = await query<ResumeRow>(
      `UPDATE resumes 
       SET is_active = TRUE, is_default = TRUE, updated_at = NOW() 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [resumeId, userId]
    );
    await query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }
}

// =============================================================================
// DELETE
// =============================================================================

export async function deleteResume(
  resumeId: string,
  userId: string
): Promise<void> {
  // 1. Retrieve the resume to check ownership and active status
  const check = await query<ResumeRow>(
    'SELECT user_id, storage_path, is_active FROM resumes WHERE id = $1',
    [resumeId]
  );

  if (check.rows.length === 0) {
    throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
  }

  if (check.rows[0].user_id !== userId) {
    throw new AppError('You do not own this resume', 403, 'FORBIDDEN');
  }

  const { storage_path, is_active } = check.rows[0];

  // 1b. Check if the resume is attached to an active application (status IN ('PENDING', 'REVIEWING', 'SHORTLISTED'))
  const activeApps = await query<{ id: string }>(
    `SELECT id FROM applications 
     WHERE resume_id = $1 AND status IN ('PENDING', 'REVIEWING', 'SHORTLISTED')`,
    [resumeId]
  );

  if (activeApps.rows.length > 0) {
    throw new AppError(
      'Cannot delete resume attached to an active application',
      400,
      'ACTIVE_APPLICATION_CONSTRAINT'
    );
  }

  // 2. Perform DB deletion in transaction
  await query('BEGIN');
  try {
    await query('DELETE FROM resumes WHERE id = $1 AND user_id = $2', [
      resumeId,
      userId,
    ]);

    // Rule: If active resume is deleted and other resumes exist, activate the newest remaining resume
    if (is_active) {
      const remaining = await query<ResumeRow>(
        `SELECT id FROM resumes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      if (remaining.rows.length > 0) {
        const nextActiveId = remaining.rows[0].id;
        await query(
          `UPDATE resumes SET is_active = TRUE, is_default = TRUE WHERE id = $1`,
          [nextActiveId]
        );
      }
    }
    await query('COMMIT');
  } catch (err) {
    await query('ROLLBACK');
    throw err;
  }

  // 3. Clean up storage file
  try {
    await storageService.deleteFile(storage_path);
  } catch (err) {
    // Log storage deletion error but don't fail user request since database is clean
    logger.error(`Failed to clean up storage path ${storage_path}:`, err);
  }
}

// =============================================================================
// REPLACE
// =============================================================================

export async function replaceResume(
  resumeId: string,
  userId: string,
  fileName: string,
  buffer: Buffer,
  fileType: string,
  fileSize: number,
  resumeTitle?: string
): Promise<ResumeRow> {
  // 1. Verify ownership and get old storage path
  const check = await query<ResumeRow>(
    'SELECT user_id, storage_path, resume_title FROM resumes WHERE id = $1',
    [resumeId]
  );

  if (check.rows.length === 0) {
    throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
  }

  if (check.rows[0].user_id !== userId) {
    throw new AppError('You do not own this resume', 403, 'FORBIDDEN');
  }

  const oldStoragePath = check.rows[0].storage_path;
  const newStoragePath = getStoragePath(userId, fileName);
  const finalTitle = resumeTitle || check.rows[0].resume_title;

  // 2. Upload new file to storage
  const fileUrl = await storageService.uploadFile(
    newStoragePath,
    buffer,
    fileType
  );

  // 3. Update database record in transaction (setting resume_text and parsed_at to NULL to trigger re-analysis)
  const result = await query<ResumeRow>(
    `UPDATE resumes 
     SET name = $1, file_url = $2, file_key = $3,
         file_name = $4, storage_path = $5, file_size = $6, file_type = $7,
         resume_title = $8, resume_text = NULL, parsed_at = NULL, updated_at = NOW()
     WHERE id = $9 AND user_id = $10
     RETURNING *`,
    [
      fileName, // name (legacy)
      fileUrl, // file_url (legacy)
      newStoragePath, // file_key (legacy)
      fileName, // file_name
      newStoragePath, // storage_path
      fileSize, // file_size
      fileType, // file_type
      finalTitle, // resume_title
      resumeId,
      userId,
    ]
  );

  // 4. Clean up old storage file
  try {
    await storageService.deleteFile(oldStoragePath);
  } catch (err) {
    logger.error(
      `Failed to delete replaced storage path ${oldStoragePath}:`,
      err
    );
  }

  const updated = result.rows[0];
  eventBus.publish(EventType.RESUME_REPLACED, {
    resumeId: updated.id,
    userId: updated.user_id,
  });

  return updated;
}
