/**
 * Organization Routes
 * Organization settings and branding
 */
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createLogger, logAudit } from '../lib/logger.js'
import { 
  asyncHandler, 
  NotFoundError,
  ValidationError
} from '../middleware/errorHandler.js'
import { requireAuth } from '../middleware/auth.js'
import { csrfProtection } from '../middleware/csrf.js'

const router = Router()
const logger = createLogger('organizations')

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/organizations/current
 * Get current user's organization settings
 */
router.get(
  '/current',
  csrfProtection,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = req

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        logo: true,
        primaryColor: true,
        emailFooterText: true,
        website: true,
        phone: true,
        address: true
      }
    })

    if (!organization) {
      throw new NotFoundError('Organization')
    }

    res.json({
      success: true,
      data: organization
    })
  })
)

/**
 * PUT /api/organizations/current
 * Update current user's organization settings
 */
router.put(
  '/current',
  csrfProtection,
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId, user } = req
    const { 
      name, 
      logo, 
      primaryColor, 
      emailFooterText,
      website,
      phone,
      address
    } = req.body

    // Validate primary color if provided
    if (primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      throw new ValidationError('Primary color must be a valid hex color (e.g., #16a34a)')
    }

    // Validate URL if provided
    if (logo && !isValidUrl(logo)) {
      throw new ValidationError('Logo must be a valid URL')
    }

    if (website && !isValidUrl(website)) {
      throw new ValidationError('Website must be a valid URL')
    }

    // Get current state for audit
    const current = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!current) {
      throw new NotFoundError('Organization')
    }

    // Update organization
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(name !== undefined && { name }),
        ...(logo !== undefined && { logo }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(emailFooterText !== undefined && { emailFooterText }),
        ...(website !== undefined && { website }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address })
      },
      select: {
        id: true,
        name: true,
        logo: true,
        primaryColor: true,
        emailFooterText: true,
        website: true,
        phone: true,
        address: true
      }
    })

    // Log audit
    logAudit({
      action: 'organization.updated',
      entityType: 'organization',
      entityId: organizationId!,
      organizationId,
      userId: user!.id,
      previousState: {
        name: current.name,
        logo: current.logo,
        primaryColor: current.primaryColor
      },
      newState: {
        name: updated.name,
        logo: updated.logo,
        primaryColor: updated.primaryColor
      }
    })

    logger.info({
      organizationId,
      updatedFields: Object.keys(req.body)
    }, 'Organization updated')

    res.json({
      success: true,
      data: updated
    })
  })
)

// =============================================================================
// HELPERS
// =============================================================================

function isValidUrl(url: string | undefined | null): boolean {
  if (!url) return true // Allow empty/undefined/null
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export { router as organizationRoutes }
