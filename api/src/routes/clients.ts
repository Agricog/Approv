/**
 * Clients Routes
 * CRUD operations for client management
 */

import { Router } from 'express'
import { z } from 'zod'
import { db } from '../lib/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createClientSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional()
})

const updateClientSchema = createClientSchema.partial()

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/clients
 * List all clients for the organization
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { orgId } = req.auth

    const clients = await db.client.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        address: true,
        notes: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json({ items: clients, total: clients.length })
  } catch (error) {
    next(error)
  }
})

/**
 * GET /api/clients/:id
 * Get single client by ID
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { orgId } = req.auth
    const { id } = req.params

    const client = await db.client.findFirst({
      where: {
        id,
        organizationId: orgId
      }
    })

    if (!client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Client not found' }
      })
    }

    res.json(client)
  } catch (error) {
    next(error)
  }
})

/**
 * POST /api/clients
 * Create a new client
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { orgId, userId } = req.auth
    
    // Validate request body
    const data = createClientSchema.parse(req.body)

    // Check if client with this email already exists in org
    const existing = await db.client.findFirst({
      where: {
        email: data.email,
        organizationId: orgId
      }
    })

    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE_EMAIL', message: 'A client with this email already exists' }
      })
    }

    // Create client
    const client = await db.client.create({
      data: {
        ...data,
        organizationId: orgId,
        createdBy: userId
      }
    })

    res.status(201).json(client)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }
      })
    }

    next(error)
  }
})

/**
 * PUT /api/clients/:id
 * Update client
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { orgId } = req.auth
    const { id } = req.params

    // Validate request body
    const data = updateClientSchema.parse(req.body)

    // Check client exists and belongs to org
    const existing = await db.client.findFirst({
      where: {
        id,
        organizationId: orgId
      }
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Client not found' }
      })
    }

    // If updating email, check it's not taken by another client
    if (data.email && data.email !== existing.email) {
      const duplicate = await db.client.findFirst({
        where: {
          email: data.email,
          organizationId: orgId,
          id: { not: id }
        }
      })

      if (duplicate) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE_EMAIL', message: 'Another client with this email already exists' }
        })
      }
    }

    // Update client
    const client = await db.client.update({
      where: { id },
      data
    })

    res.json(client)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }
      })
    }

    next(error)
  }
})

/**
 * DELETE /api/clients/:id
 * Delete client (only if no projects exist)
 */
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { orgId } = req.auth
    const { id } = req.params

    // Check client exists and belongs to org
    const client = await db.client.findFirst({
      where: {
        id,
        organizationId: orgId
      }
    })

    if (!client) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Client not found' }
      })
    }

    // Check if client has any projects
    const projectCount = await db.project.count({
      where: { clientId: id }
    })

    if (projectCount > 0) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'HAS_PROJECTS', 
          message: `Cannot delete client with ${projectCount} project(s). Archive projects first.` 
        }
      })
    }

    // Delete client
    await db.client.delete({
      where: { id }
    })

    res.json({ success: true, message: 'Client deleted successfully' })
  } catch (error) {
    next(error)
  }
})

export { router as clientRoutes }
