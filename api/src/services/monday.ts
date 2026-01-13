/**
 * Monday.com Service
 * OAuth and two-way project sync
 */

import { createLogger } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'

const logger = createLogger('monday')

const MONDAY_CLIENT_ID = process.env.MONDAY_CLIENT_ID
const MONDAY_CLIENT_SECRET = process.env.MONDAY_CLIENT_SECRET
const REDIRECT_URI = 'https://approv.co.uk/dashboard/settings/monday/callback'

// =============================================================================
// OAUTH
// =============================================================================

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(state: string): string {
  if (!MONDAY_CLIENT_ID) {
    throw new Error('Monday.com not configured')
  }

  const params = new URLSearchParams({
    client_id: MONDAY_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: state
  })

  return `https://auth.monday.com/oauth2/authorize?${params.toString()}`
}

/**
 * Exchange auth code for token
 */
export async function exchangeCodeForToken(code: string): Promise<string | null> {
  if (!MONDAY_CLIENT_ID || !MONDAY_CLIENT_SECRET) {
    throw new Error('Monday.com not configured')
  }

  try {
    const response = await fetch('https://auth.monday.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: MONDAY_CLIENT_ID,
        client_secret: MONDAY_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI
      })
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error({ error }, 'Failed to exchange Monday code')
      return null
    }

    const data = await response.json() as { access_token: string }
    return data.access_token
  } catch (err) {
    logger.error({ err }, 'Error exchanging Monday code')
    return null
  }
}

// =============================================================================
// API CALLS
// =============================================================================

/**
 * Make Monday.com GraphQL API call
 */
async function mondayApi(token: string, query: string, variables?: Record<string, unknown>): Promise<any> {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify({ query, variables })
  })

  if (!response.ok) {
    throw new Error(`Monday API error: ${response.status}`)
  }

  const data = await response.json() as { data: any; errors?: any[] }
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'Monday API error')
  }

  return data.data
}

/**
 * Get user's boards
 */
export async function getBoards(token: string): Promise<Array<{ id: string; name: string }>> {
  const query = `
    query {
      boards(limit: 50) {
        id
        name
      }
    }
  `

  const data = await mondayApi(token, query)
  return data.boards || []
}

/**
 * Get board columns
 */
export async function getBoardColumns(token: string, boardId: string): Promise<Array<{ id: string; title: string; type: string }>> {
  const query = `
    query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        columns {
          id
          title
          type
        }
      }
    }
  `

  const data = await mondayApi(token, query, { boardId: [boardId] })
  return data.boards?.[0]?.columns || []
}

/**
 * Get board items (projects)
 */
export async function getBoardItems(token: string, boardId: string): Promise<Array<{
  id: string
  name: string
  column_values: Array<{ id: string; text: string; value: string }>
}>> {
  const query = `
    query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        items_page(limit: 100) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `

  const data = await mondayApi(token, query, { boardId: [boardId] })
  return data.boards?.[0]?.items_page?.items || []
}

/**
 * Update item status column
 */
export async function updateItemStatus(
  token: string,
  boardId: string,
  itemId: string,
  columnId: string,
  status: string
): Promise<boolean> {
  const query = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value(
        board_id: $boardId
        item_id: $itemId
        column_id: $columnId
        value: $value
      ) {
        id
      }
    }
  `

  try {
    await mondayApi(token, query, {
      boardId,
      itemId,
      columnId,
      value: JSON.stringify({ label: status })
    })

    logger.info({ boardId, itemId, status }, 'Monday item status updated')
    return true
  } catch (err) {
    logger.error({ err, itemId, status }, 'Failed to update Monday status')
    return false
  }
}

/**
 * Create item in board
 */
export async function createItem(
  token: string,
  boardId: string,
  name: string,
  columnValues?: Record<string, unknown>
): Promise<string | null> {
  const query = `
    mutation ($boardId: ID!, $name: String!, $columnValues: JSON) {
      create_item(
        board_id: $boardId
        item_name: $name
        column_values: $columnValues
      ) {
        id
      }
    }
  `

  try {
    const data = await mondayApi(token, query, {
      boardId,
      name,
      columnValues: columnValues ? JSON.stringify(columnValues) : undefined
    })

    return data.create_item?.id || null
  } catch (err) {
    logger.error({ err, boardId, name }, 'Failed to create Monday item')
    return null
  }
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Sync approval status to Monday.com
 */
export async function syncApprovalToMonday(
  organizationId: string,
  mondayItemId: string,
  status: 'APPROVED' | 'CHANGES_REQUESTED',
  stageName: string
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      mondayApiToken: true,
      mondayBoardId: true
    }
  })

  if (!org?.mondayApiToken || !org?.mondayBoardId) {
    logger.debug({ organizationId }, 'Monday not connected')
    return false
  }

  // Map Approv status to Monday status label
  const mondayStatus = status === 'APPROVED' ? 'Approved' : 'Changes Requested'

  // Try to update a status column (commonly named "Status" or "Approval Status")
  // This is a simplified approach - in production you'd let users map columns
  const columns = await getBoardColumns(org.mondayApiToken, org.mondayBoardId)
  const statusColumn = columns.find(c => 
    c.type === 'status' && 
    (c.title.toLowerCase().includes('status') || c.title.toLowerCase().includes('approval'))
  )

  if (!statusColumn) {
    logger.warn({ organizationId }, 'No status column found in Monday board')
    return false
  }

  return updateItemStatus(
    org.mondayApiToken,
    org.mondayBoardId,
    mondayItemId,
    statusColumn.id,
    mondayStatus
  )
}

/**
 * Check if Monday is connected
 */
export async function isMondayConnected(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { mondayApiToken: true }
  })

  return !!org?.mondayApiToken
}

/**
 * Disconnect Monday
 */
export async function disconnectMonday(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      mondayApiToken: null,
      mondayBoardId: null,
      mondayWebhookId: null
    }
  })

  logger.info({ organizationId }, 'Monday disconnected')
}

export default {
  getAuthUrl,
  exchangeCodeForToken,
  getBoards,
  getBoardColumns,
  getBoardItems,
  updateItemStatus,
  createItem,
  syncApprovalToMonday,
  isMondayConnected,
  disconnectMonday
}
