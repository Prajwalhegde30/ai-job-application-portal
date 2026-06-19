import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as resumesService from './resumes.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AppError } from '../../utils/appError';
import { uploadResumeSchema, updateResumeSchema } from './resumes.validators';
import { ResumeRow } from './resumes.types';

// Configure Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // 1. MIME type validation
    if (file.mimetype !== 'application/pdf') {
      return cb(
        new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE')
      );
    }

    // 2. Extension validation
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf') {
      return cb(
        new AppError('Only PDF files are allowed', 400, 'INVALID_FILE_TYPE')
      );
    }

    cb(null, true);
  },
}).single('file');

/**
 * Middleware wrapper for Multer upload.
 * Catches file size and validation errors, returning structured responses.
 * Also performs a binary signature (magic bytes) check to confirm it is a genuine PDF.
 */
export function handleFileUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(
            res,
            400,
            'INVALID_FILE_SIZE',
            'File size must not exceed 5 MB'
          );
        }
        return sendError(res, 400, 'UPLOAD_ERROR', err.message);
      }
      if (err instanceof AppError) {
        return sendError(res, err.statusCode, err.code, err.message);
      }
      return sendError(res, 400, 'UPLOAD_ERROR', (err as Error).message);
    }

    // 3. Binary signature (magic bytes) validation
    if (req.file) {
      const buffer = req.file.buffer;
      if (
        buffer.length < 4 ||
        buffer[0] !== 0x25 || // %
        buffer[1] !== 0x50 || // P
        buffer[2] !== 0x44 || // D
        buffer[3] !== 0x46 // F
      ) {
        return sendError(
          res,
          400,
          'INVALID_FILE_SIGNATURE',
          'Only genuine PDF files are allowed'
        );
      }
    }

    next();
  });
}

// Map database row to standard camelCase API response envelope
function mapResumeToResponse(resume: ResumeRow) {
  return {
    id: resume.id,
    userId: resume.user_id,
    fileName: resume.file_name,
    fileUrl: resume.file_url,
    storagePath: resume.storage_path,
    isActive: resume.is_active,
    fileSize: resume.file_size,
    fileType: resume.file_type,
    resumeTitle: resume.resume_title,
    resumeText: resume.resume_text,
    parsedAt: resume.parsed_at,
    createdAt: resume.created_at,
    updatedAt: resume.updated_at,
  };
}

// =============================================================================
// POST /api/v1/resumes — Upload a resume
// =============================================================================

export async function uploadResume(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      sendError(res, 400, 'MISSING_FILE', 'No file uploaded');
      return;
    }

    // Parse validator
    const body = uploadResumeSchema.parse(req.body);

    const resume = await resumesService.uploadResume(
      req.user!.userId,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype,
      req.file.size,
      body.resumeTitle
    );

    sendSuccess(
      res,
      { resume: mapResumeToResponse(resume) },
      'Resume uploaded successfully',
      201
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// GET /api/v1/resumes — List user resumes
// =============================================================================

export async function listResumes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resumes = await resumesService.listResumes(req.user!.userId);
    sendSuccess(res, { resumes: resumes.map(mapResumeToResponse) });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// GET /api/v1/resumes/:resumeId — View (generate signed URL)
// =============================================================================

export async function getResumeDownloadUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resumeId = req.params.resumeId as string;
    if (!isValidUUID(resumeId)) {
      sendError(res, 400, 'INVALID_RESUME_ID', 'Invalid resume ID format');
      return;
    }

    const signedUrl = await resumesService.getResumeDownloadUrl(
      resumeId,
      req.user!.userId
    );
    sendSuccess(res, { signedUrl });
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// PATCH /api/v1/resumes/:resumeId/activate — Toggle active status
// =============================================================================

export async function activateResume(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resumeId = req.params.resumeId as string;
    if (!isValidUUID(resumeId)) {
      sendError(res, 400, 'INVALID_RESUME_ID', 'Invalid resume ID format');
      return;
    }

    const resume = await resumesService.activateResume(
      resumeId,
      req.user!.userId
    );
    sendSuccess(
      res,
      { resume: mapResumeToResponse(resume) },
      'Resume activated successfully'
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// PUT /api/v1/resumes/:resumeId — Replace resume file
// =============================================================================

export async function replaceResume(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resumeId = req.params.resumeId as string;
    if (!isValidUUID(resumeId)) {
      sendError(res, 400, 'INVALID_RESUME_ID', 'Invalid resume ID format');
      return;
    }

    if (!req.file) {
      sendError(res, 400, 'MISSING_FILE', 'No replacement file uploaded');
      return;
    }

    const body = updateResumeSchema.parse(req.body);

    const resume = await resumesService.replaceResume(
      resumeId,
      req.user!.userId,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype,
      req.file.size,
      body.resumeTitle
    );

    sendSuccess(
      res,
      { resume: mapResumeToResponse(resume) },
      'Resume replaced successfully'
    );
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// DELETE /api/v1/resumes/:resumeId — Delete resume
// =============================================================================

export async function deleteResume(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const resumeId = req.params.resumeId as string;
    if (!isValidUUID(resumeId)) {
      sendError(res, 400, 'INVALID_RESUME_ID', 'Invalid resume ID format');
      return;
    }

    await resumesService.deleteResume(resumeId, req.user!.userId);
    sendSuccess(res, null, 'Resume deleted successfully');
  } catch (err) {
    next(err);
  }
}

// =============================================================================
// UTIL
// =============================================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}
