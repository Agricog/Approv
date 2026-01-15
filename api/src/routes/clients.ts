/**
 * Clients Routes
 * Client management endpoints (authenticated)
 */

import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { createLogger, logAudit } from '../lib/logger.js'
import { 
  asyncHandler, 
  NotFoundError,
  ConflictError,
  ValidationError
} from '../middleware/errorHandler.js'
import { getClientIp } from '../middleware/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const logger = createLogger('clients')

// All client routes require authentication
router.use(requireAuth)

// =============================================================================
// LIST & GET
// =============================================================================

/**
 * GET /api/clients
 * List all clients for the organization
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req

    const clients = await prisma.client.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({ 
      items: clients, 
      total: clients.length 
    })
  })
)

/**
 * GET /api/clients/:id
 * Get single client by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req
    const { id } = req.params

    const client = await prisma.client.findFirst({
      where: {
        id,
        organizationId
      }
    })

    if (!client) {
      throw new NotFoundError('Client')
    }

    res.json(client)
  })
)

// =============================================================================
// CREATE & UPDATE
// =============================================================================

/**
 * POST /api/clients
 * Create a new client
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId, user } = req
    const { firstName, lastName, email, phone, company, address, notes } = req.body

    // Validate required fields
    if (!firstName || !lastName || !email) {
      throw new ValidationError('firstName, lastName, and email are required')
    }

    // Check if client with this email already exists in org
    const existing = await prisma.client.findFirst({
      where: {
        email,
        organizationId
      }
    })

    if (existing) {
      throw new ConflictError('A client with this email already exists')
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        organizationId: organizationId!,
        createdBy: user!.id,
        firstName,
        lastName,
        email,
        phone: phone || null,
        company: company || null,
        address: address || null,
        notes: notes || null
      }
    })

    // Log audit
    logAudit({
      action: 'client.created',
      entityType: 'client',
      entityId: client.id,
      organizationId: organizationId!,
      userId: user!.id,
      ipAddress: getClientIp(req),
      newState: { firstName, lastName, email, company }
    })

    logger.info({
      clientId: client.id,
      email,
      userId: user!.id
    }, 'Client created')

    res.status(201).json(client)
  })
)

/**
 * PUT /api/clients/:id
 * Update client
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId, user } = req
    const { id } = req.params
    const { firstName, lastName, email, phone, company, address, notes } = req.body

    // Check client exists and belongs to org
    const existing = await prisma.client.findFirst({
      where: {
        id,
        organizationId
      }
    })

    if (!existing) {
      throw new NotFoundError('Client')
    }

    // If updating email, check it's not taken by another client
    if (email && email !== existing.email) {
      const duplicate = await prisma.client.findFirst({
        where: {
          email,
          organizationId,
          id: { not: id }
        }
      })

      if (duplicate) {
        throw new ConflictError('Another client with this email already exists')
      }
    }

    // Prepare update data
    const data: any = {}
    if (firstName !== undefined) data.firstName = firstName
    if (lastName !== undefined) data.lastName = lastName
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = phone
    if (company !== undefined) data.company = company
    if (address !== undefined) data.address = address
    if (notes !== undefined) data.notes = notes

    // Update client
    const client = await prisma.client.update({
      where: { id },
      data
    })

    // Log audit
    logAudit({
      action: 'client.updated',
      entityType: 'client',
      entityId: id,
      organizationId: organizationId!,
      userId: user!.id,
      ipAddress: getClientIp(req),
      previousState: {
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email
      },
      newState: data
    })

    logger.info({
      clientId: id,
      userId: user!.id
    }, 'Client updated')

    res.json(client)
  })
)

/**
 * DELETE /api/clients/delete-all
 * Delete all clients for the organization (must come before :id route)
 */
router.delete(
  '/delete-all',
  asyncHandler(async (req, res) => {
    const { organizationId, user } = req

    // Get count before deletion
    const clientCount = await prisma.client.count({
      where: { organizationId }
    })

    if (clientCount === 0) {
      return res.json({
        success: true,
        deleted: 0,
        message: 'No clients to delete'
      })
    }

    // First delete all approvals for clients in this org
    await prisma.approval.deleteMany({
      where: {
        client: {
          organizationId
        }
      }
    })

    // Delete all projects for clients in this org
    await prisma.project.deleteMany({
      where: {
        client: {
          organizationId
        }
      }
    })

    // Delete all clients
    const result = await prisma.client.deleteMany({
      where: { organizationId }
    })

    // Log audit
    logAudit({
      action: 'clients.deleted_all',
      entityType: 'client',
      entityId: 'all',
      organizationId: organizationId!,
      userId: user!.id,
      ipAddress: getClientIp(req),
      metadata: { deletedCount: result.count }
    })

    logger.info({
      deletedCount: result.count,
      userId: user!.id,
      organizationId
    }, 'All clients deleted')

    res.json({
      success: true,
      deleted: result.count,
      message: result.count + ' client(s) deleted successfully'
    })
  })
)

/**
 * DELETE /api/clients/:id
 * Delete single client (only if no projects exist)
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId, user } = req
    const { id } = req.params

    // Check client exists and belongs to org
    const client = await prisma.client.findFirst({
      where: {
        id,
        organizationId
      }
    })

    if (!client) {
      throw new NotFoundError('Client')
    }

    // Check if client has any projects
    const projectCount = await prisma.project.count({
      where: { clientId: id }
    })

    if (projectCount > 0) {
      throw new ValidationError(
        'Cannot delete client with ' + projectCount + ' project(s). Archive projects first.'
      )
    }

    // Delete client
    await prisma.client.delete({
      where: { id }
    })

    // Log audit
    logAudit({
      action: 'client.deleted',
      entityType: 'client',
      entityId: id,
      organizationId: organizationId!,
      userId: user!.id,
      ipAddress: getClientIp(req),
      previousState: {
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email
      }
    })

    logger.info({
      clientId: id,
      userId: user!.id
    }, 'Client deleted')

    res.json({ 
      success: true, 
      message: 'Client deleted successfully' 
    })
  })
)

export { router as clientRoutes }
