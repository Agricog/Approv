/**
 * Upload Routes
 * File upload endpoints for deliverables and attachments
 */

import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js'
import { createLogger } from '../lib/logger.js'
import { 
  getSignedUploadUrl, 
  getSignedDownloadUrl, 
  deleteFile,
  isStorageConfigured 
} from '../services/storage.js'

const router = Router()
const logger = createLogger('uploads')

// All upload routes require authentication
router.use(requireAuth)

/**
 * GET /api/uploads/status
 * Check if storage is configured
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        configured: isStorageConfigured()
      }
    })
  })
)

/**
 * POST /api/uploads/presign
 * Get a presigned URL for client-side upload
 */
router.post(
  '/presign',
  asyncHandler(async (req, res) => {
    const { filename, contentType, type = 'deliverable', projectId, approvalId } = req.body

    if (!filename || !contentType) {
      throw new ValidationError('filename and contentType are required')
    }

    // Validate content type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    ]

    if (!allowedTypes.includes(contentType)) {
      throw new ValidationError(`File type not allowed: ${contentType}`)
    }

    // Validate file size via filename extension
    const ext = filename.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx']
    
    if (!ext || !allowedExtensions.includes(ext)) {
      throw new ValidationError(`File extension not allowed: ${ext}`)
    }

    const result = await getSignedUploadUrl(filename, contentType, {
      organizationId: req.organizationId!,
      projectId,
      approvalId,
      type: type as 'deliverable' | 'attachment' | 'logo'
    })

    if (!result) {
      throw new ValidationError('Storage not configured')
    }

    logger.info({
      userId: req.user!.id,
      filename,
      type
    }, 'Presigned upload URL generated')

    res.json({
      success: true,
      data: {
        key: result.key,
        uploadUrl: result.uploadUrl
      }
    })
  })
)

/**
 * POST /api/uploads/confirm
 * Confirm upload and get download URL
 */
router.post(
  '/confirm',
  asyncHandler(async (req, res) => {
    const { key } = req.body

    if (!key) {
      throw new ValidationError('key is required')
    }

    // Verify the key belongs to this organization
    if (!key.startsWith(req.organizationId!)) {
      throw new ValidationError('Invalid file key')
    }

    const downloadUrl = await getSignedDownloadUrl(key)

    logger.info({
      userId: req.user!.id,
      key
    }, 'Upload confirmed')

    res.json({
      success: true,
      data: {
        key,
        downloadUrl
      }
    })
  })
)

/**
 * DELETE /api/uploads/:key
 * Delete a file
 */
router.delete(
  '/:key(*)',
  asyncHandler(async (req, res) => {
    const { key } = req.params

    // Verify the key belongs to this organization
    if (!key.startsWith(req.organizationId!)) {
      throw new ValidationError('Invalid file key')
    }

    const deleted = await deleteFile(key)

    if (deleted) {
      logger.info({
        userId: req.user!.id,
        key
      }, 'File deleted')
    }

    res.json({
      success: true,
      data: { deleted }
    })
  })
)

export { router as uploadRoutes }
