import fs from 'fs';
import path from 'path';
import { supabase } from '../../config/supabase';
import { env } from '../../config/env';
import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';

const MOCK_STORAGE_DIR = path.join(process.cwd(), 'storage_mock');

/**
 * Ensures the mock storage directory exists when in test mode or local mode.
 */
function ensureMockDirectory(storagePath: string) {
  const fullPath = path.join(MOCK_STORAGE_DIR, storagePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return fullPath;
}

/**
 * Upload a file to Supabase storage (or fallback mock folder in tests).
 * Returns the storage path.
 */
export async function uploadFile(
  storagePath: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (env.NODE_ENV === 'test' || !supabase) {
    logger.info(
      `[Mock Storage] Uploading file to ${storagePath} (${buffer.length} bytes)`
    );
    const fullPath = ensureMockDirectory(storagePath);
    fs.writeFileSync(fullPath, buffer);
    return `http://localhost:${env.PORT}/mock-storage/${storagePath}`;
  }

  // Actual Supabase call
  const { data, error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    logger.error('Supabase upload error:', error);
    throw new AppError(
      `File upload failed: ${error.message}`,
      500,
      'STORAGE_UPLOAD_ERROR'
    );
  }

  // Return public URL or key
  const { data: urlData } = supabase.storage
    .from(env.SUPABASE_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete a file from Supabase storage (or fallback mock folder in tests).
 */
export async function deleteFile(storagePath: string): Promise<void> {
  if (env.NODE_ENV === 'test' || !supabase) {
    logger.info(`[Mock Storage] Deleting file from ${storagePath}`);
    const fullPath = path.join(MOCK_STORAGE_DIR, storagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return;
  }

  const { error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .remove([storagePath]);

  if (error) {
    logger.error('Supabase delete error:', error);
    throw new AppError(
      `File deletion failed: ${error.message}`,
      500,
      'STORAGE_DELETE_ERROR'
    );
  }
}

/**
 * Generate a signed URL for secure file download/viewing.
 */
export async function getSignedUrl(
  storagePath: string,
  expirySeconds: number = 900 // 15 minutes default
): Promise<string> {
  if (env.NODE_ENV === 'test' || !supabase) {
    logger.info(
      `[Mock Storage] Generating signed URL for ${storagePath} (expiry: ${expirySeconds}s)`
    );
    const fullPath = path.join(MOCK_STORAGE_DIR, storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new AppError('File not found in storage', 404, 'FILE_NOT_FOUND');
    }
    return `http://localhost:${env.PORT}/mock-storage/${storagePath}?token=mock-signature&expires=${Date.now() + expirySeconds * 1000}`;
  }

  const { data, error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .createSignedUrl(storagePath, expirySeconds);

  if (error) {
    logger.error('Supabase signed URL error:', error);
    throw new AppError(
      `Failed to generate signed URL: ${error.message}`,
      500,
      'STORAGE_SIGNED_URL_ERROR'
    );
  }

  return data.signedUrl;
}
