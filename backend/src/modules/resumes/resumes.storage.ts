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
  const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey =
    env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  const bucketName =
    env.SUPABASE_BUCKET || process.env.SUPABASE_BUCKET || 'resumes';

  console.error('[SUPABASE_DEBUG] Storage Upload Config Check:', {
    supabaseUrl: supabaseUrl
      ? supabaseUrl.replace(/:\/\/([^@]+@)/, '://***@')
      : 'MISSING',
    bucket: bucketName,
    hasServiceKey: !!serviceKey,
    keyPrefix: serviceKey ? serviceKey.slice(0, 12) : 'NONE',
    nodeEnv: env.NODE_ENV,
    isSupabaseClientInit: !!supabase,
  });

  if (env.NODE_ENV === 'test' || !supabase) {
    logger.info(
      `[Mock Storage] Uploading file to ${storagePath} (${buffer.length} bytes)`
    );
    const fullPath = ensureMockDirectory(storagePath);
    fs.writeFileSync(fullPath, buffer);
    return `http://localhost:${env.PORT}/mock-storage/${storagePath}`;
  }

  // Actual Supabase call
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      const errWithDetails = error as Error & { cause?: unknown };
      console.error('[SUPABASE_DEBUG] Upload Error Object:', error);
      console.error(
        '[SUPABASE_DEBUG] Upload Error Cause:',
        errWithDetails.cause ?? null
      );
      console.error(
        '[SUPABASE_DEBUG] Upload Error Stack:',
        errWithDetails.stack ?? null
      );

      const causeMsg = errWithDetails.cause
        ? ` (${errWithDetails.cause instanceof Error ? errWithDetails.cause.message : JSON.stringify(errWithDetails.cause)})`
        : '';
      throw new AppError(
        `File upload failed: ${error.message}${causeMsg}`,
        500,
        'STORAGE_UPLOAD_ERROR'
      );
    }

    // Return the storage path key (not a public URL — bucket is private).
    // Signed URLs are generated on-demand via getSignedUrl().
    return data.path;
  } catch (err) {
    if (err instanceof AppError) throw err;
    const errorObj = err as Error & { cause?: unknown };
    console.error('[SUPABASE_DEBUG] Exception Object:', errorObj);
    console.error('[SUPABASE_DEBUG] Exception Cause:', errorObj.cause ?? null);
    console.error('[SUPABASE_DEBUG] Exception Stack:', errorObj.stack);

    const causeMsg = errorObj.cause
      ? ` (${errorObj.cause instanceof Error ? errorObj.cause.message : JSON.stringify(errorObj.cause)})`
      : '';
    throw new AppError(
      `File upload failed: ${errorObj.message}${causeMsg}`,
      500,
      'STORAGE_UPLOAD_ERROR'
    );
  }
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

/**
 * Download a file from storage and return its buffer.
 */
export async function downloadFile(storagePath: string): Promise<Buffer> {
  if (env.NODE_ENV === 'test' || !supabase) {
    const fullPath = path.join(MOCK_STORAGE_DIR, storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new AppError('File not found in storage', 404, 'FILE_NOT_FOUND');
    }
    return fs.readFileSync(fullPath);
  }

  const { data, error } = await supabase.storage
    .from(env.SUPABASE_BUCKET)
    .download(storagePath);

  if (error) {
    logger.error('Supabase download error:', error);
    throw new AppError(
      `File download failed: ${error.message}`,
      500,
      'STORAGE_DOWNLOAD_ERROR'
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
