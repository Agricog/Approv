/**
 * Dropbox Service
 * OAuth and file sync for architect Dropbox accounts
 */

import { createLogger } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'

const logger = createLogger('dropbox')

const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET
const APP_URL = process.env.APP_URL || 'https://approv.co.uk'
const REDIRECT_URI = `${APP_URL}/dashboard/settings/dropbox/callback`

// =============================================================================
// OAUTH
// =============================================================================

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(state: string): string {
  if (!DROPBOX_APP_KEY) {
    throw new Error('Dropbox not configured')
  }

  const params = new URLSearchParams({
    client_id: DROPBOX_APP_KEY,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    state: state,
    token_access_type: 'offline'
  })

  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
}

/**
 * Exchange auth code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: Date
} | null> {
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    throw new Error('Dropbox not configured')
  }

  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET
      })
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error({ error }, 'Failed to exchange Dropbox code')
      return null
    }

    const data = await response.json()
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000))
    }
  } catch (err) {
    logger.error({ err }, 'Error exchanging Dropbox code')
    return null
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: Date
} | null> {
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    throw new Error('Dropbox not configured')
  }

  try {
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET
      })
    })

    if (!response.ok) {
      logger.error('Failed to refresh Dropbox token')
      return null
    }

    const data = await response.json()
    
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + (data.expires_in * 1000))
    }
  } catch (err) {
    logger.error({ err }, 'Error refreshing Dropbox token')
    return null
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidToken(organizationId: string): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      dropboxAccessToken: true,
      dropboxRefreshToken: true,
      dropboxTokenExpiry: true
    }
  })

  if (!org?.dropboxAccessToken || !org?.dropboxRefreshToken) {
    return null
  }

  // Check if token is expired (with 5 min buffer)
  if (org.dropboxTokenExpiry && org.dropboxTokenExpiry > new Date(Date.now() + 300000)) {
    return org.dropboxAccessToken
  }

  // Refresh token
  const refreshed = await refreshAccessToken(org.dropboxRefreshToken)
  if (!refreshed) {
    return null
  }

  // Update stored token
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      dropboxAccessToken: refreshed.accessToken,
      dropboxTokenExpiry: refreshed.expiresAt
    }
  })

  return refreshed.accessToken
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Upload file to Dropbox
 */
export async function uploadFile(
  organizationId: string,
  filePath: string,
  fileBuffer: Buffer
): Promise<boolean> {
  const accessToken = await getValidToken(organizationId)
  
  if (!accessToken) {
    logger.warn({ organizationId }, 'No valid Dropbox token')
    return false
  }

  try {
    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: filePath,
          mode: 'add',
          autorename: true,
          mute: false
        })
      },
      body: fileBuffer
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error({ error, filePath }, 'Failed to upload to Dropbox')
      return false
    }

    logger.info({ filePath, organizationId }, 'File uploaded to Dropbox')
    return true
  } catch (err) {
    logger.error({ err, filePath }, 'Error uploading to Dropbox')
    return false
  }
}

/**
 * Create folder in Dropbox
 */
export async function createFolder(
  organizationId: string,
  folderPath: string
): Promise<boolean> {
  const accessToken = await getValidToken(organizationId)
  
  if (!accessToken) {
    return false
  }

  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: folderPath,
        autorename: false
      })
    })

    // 409 means folder already exists - that's fine
    if (!response.ok && response.status !== 409) {
      return false
    }

    return true
  } catch (err) {
    logger.error({ err, folderPath }, 'Error creating Dropbox folder')
    return false
  }
}

/**
 * Sync approved file to Dropbox
 * Path: /Approv/{ProjectName}/{Stage}/v{Version}_{status}.pdf
 */
export async function syncApprovalToDropbox(
  organizationId: string,
  projectName: string,
  stageName: string,
  version: number,
  status: string,
  fileBuffer: Buffer,
  fileExtension: string = 'pdf'
): Promise<boolean> {
  // Sanitize names for folder/file paths
  const safeName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '_').trim()
  
  const folderPath = `/Approv/${safeName(projectName)}/${safeName(stageName)}`
  const fileName = `v${version}_${status.toLowerCase()}.${fileExtension}`
  const filePath = `${folderPath}/${fileName}`

  // Ensure folder exists
  await createFolder(organizationId, `/Approv`)
  await createFolder(organizationId, `/Approv/${safeName(projectName)}`)
  await createFolder(organizationId, folderPath)

  // Upload file
  return uploadFile(organizationId, filePath, fileBuffer)
}

/**
 * Check if Dropbox is connected for organization
 */
export async function isDropboxConnected(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { dropboxRefreshToken: true }
  })

  return !!org?.dropboxRefreshToken
}

/**
 * Disconnect Dropbox
 */
export async function disconnectDropbox(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      dropboxAccessToken: null,
      dropboxRefreshToken: null,
      dropboxTokenExpiry: null
    }
  })

  logger.info({ organizationId }, 'Dropbox disconnected')
}

export default {
  getAuthUrl,
  exchangeCodeForTokens,
  getValidToken,
  uploadFile,
  createFolder,
  syncApprovalToDropbox,
  isDropboxConnected,
  disconnectDropbox
}
