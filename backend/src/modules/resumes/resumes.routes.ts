import { Router } from 'express';
import {
  uploadResume,
  listResumes,
  getResumeDownloadUrl,
  activateResume,
  replaceResume,
  deleteResume,
  handleFileUpload,
} from './resumes.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// All resume routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/resumes
 * Upload a new PDF resume.
 */
router.post('/', handleFileUpload, uploadResume);

/**
 * GET /api/v1/resumes
 * List all resumes owned by the logged-in user.
 */
router.get('/', listResumes);

/**
 * GET /api/v1/resumes/:resumeId
 * Generate signed URL for secure resume download/view.
 */
router.get('/:resumeId', getResumeDownloadUrl);

/**
 * PATCH /api/v1/resumes/:resumeId/activate
 * Set a resume as active and deactivate all other resumes for this user.
 */
router.patch('/:resumeId/activate', activateResume);

/**
 * PUT /api/v1/resumes/:resumeId
 * Replace an existing resume's uploaded file.
 */
router.put('/:resumeId', handleFileUpload, replaceResume);

/**
 * DELETE /api/v1/resumes/:resumeId
 * Delete a resume from storage and metadata record from DB.
 */
router.delete('/:resumeId', deleteResume);

export default router;
