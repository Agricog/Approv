/**
 * Storage Service
 * Handles file uploads to Cloudflare R2
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createLogger } from '../lib/logger.js'
import { randomUUID } from 'crypto'

const logger = createLogger('storage')

// =============================================================================
// CONFIGURATION
// =============================================================================

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'approv-files'

const s3Client = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })
  : null

// =============================================================================
// TYPES
// =============================================================================

export interface UploadResult {
  key: string
  url: string
  size: number
  contentType: string
}

export interface FileMetadata {
  organizationId: string
  projectId?: string
  approvalId?: string
  type: 'deliverable' | 'attachment' | 'logo'
}

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Check if storage is configured
 */
export function isStorageConfigured(): boolean {
  return s3Client !== null
}

/**
 * Upload a file to R2
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
  metadata: FileMetadata
): Promise<UploadResult | null> {
  if (!s3Client) {
    logger.warn('R2 storage not configured - file upload skipped')
    return null
  }

  const ext = filename.split('.').pop() || 'bin'
  const key = `${metadata.organizationId}/${metadata.type}/${randomUUID()}.${ext}`

  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        originalName: filename,
        organizationId: metadata.organizationId,
        projectId: metadata.projectId || '',
        approvalId: metadata.approvalId || '',
      },
    }))

    logger.info({ key, size: buffer.length, contentType }, 'File uploaded to R2')

    return {
      key,
      url: await getSignedDownloadUrl(key),
      size: buffer.length,
      contentType,
    }
  } catch (err) {
    logger.error({ err, key }, 'Failed to upload file to R2')
    return null
  }
}

/**
 * Get a signed URL for downloading a file
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  if (!s3Client) {
    throw new Error('R2 storage not configured')
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}

/**
 * Get a signed URL for uploading a file (client-side upload)
 */
export async function getSignedUploadUrl(
  filename: string,
  contentType: string,
  metadata: FileMetadata
): Promise<{ key: string; uploadUrl: string } | null> {
  if (!s3Client) {
    logger.warn('R2 storage not configured')
    return null
  }

  const ext = filename.split('.').pop() || 'bin'
  const key = `${metadata.organizationId}/${metadata.type}/${randomUUID()}.${ext}`

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600,
      signableHeaders: new Set(['content-type', 'host'])
    })

    logger.info({ key, contentType }, 'Signed upload URL generated')

    return { key, uploadUrl }
  } catch (err) {
    logger.error({ err }, 'Failed to generate signed upload URL')
    return null
  }
}
/**
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<boolean> {
  if (!s3Client) {
    logger.warn('R2 storage not configured')
    return false
  }

  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    }))

    logger.info({ key }, 'File deleted from R2')
    return true
  } catch (err) {
    logger.error({ err, key }, 'Failed to delete file from R2')
    return false
  }
}

export default {
  isStorageConfigured,
  uploadFile,
  getSignedDownloadUrl,
  getSignedUploadUrl,
  deleteFile,
}
