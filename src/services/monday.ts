/**
 * Monday.com Integration Service
 * GraphQL client for Monday.com API
 * Handles project sync, board updates, and webhooks
 */

import { captureError } from '../utils/errorTracking'

// =============================================================================
// CONFIGURATION
// =============================================================================

const MONDAY_API_URL = 'https://api.monday.com/v2'
const MONDAY_API_VERSION = '2024-01'

// =============================================================================
// TYPES
// =============================================================================

export interface MondayConfig {
  apiToken: string
  boardId: string
  groupId?: string
}

export interface MondayItem {
  id: string
  name: string
  state: string
  column_values: MondayColumnValue[]
  created_at: string
  updated_at: string
}

export interface MondayColumnValue {
  id: string
  title: string
  text: string | null
  value: string | null
  type: string
}

export interface MondayBoard {
  id: string
  name: string
  columns: MondayColumn[]
  groups: MondayGroup[]
}

export interface MondayColumn {
  id: string
  title: string
  type: string
  settings_str: string
}

export interface MondayGroup {
  id: string
  title: string
  color: string
}

export interface MondayWebhook {
  id: string
  board_id: string
  event: string
  config: string
}

export interface MondayResponse<T> {
  data: T
  errors?: Array<{ message: string; locations?: Array<{ line: number; column: number }> }>
  account_id?: number
}

// =============================================================================
// MONDAY CLIENT CLASS
// =============================================================================

export class MondayClient {
  private apiToken: string
  private boardId: string
  private groupId?: string

  constructor(config: MondayConfig) {
    this.apiToken = config.apiToken
    this.boardId = config.boardId
    this.groupId = config.groupId
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<MondayResponse<T>> {
    try {
      const response = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.apiToken,
          'API-Version': MONDAY_API_VERSION
        },
        body: JSON.stringify({ query, variables })
      })

      if (!response.ok) {
        throw new Error(`Monday API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.errors && data.errors.length > 0) {
        const errorMessage = data.errors.map((e: { message: string }) => e.message).join(', ')
        throw new Error(`Monday GraphQL error: ${errorMessage}`)
      }

      return data
    } catch (error) {
      captureError(error as Error, { context: 'monday_api', query })
      throw error
    }
  }

  // ---------------------------------------------------------------------------
  // BOARD OPERATIONS
  // ---------------------------------------------------------------------------

  async getBoard(): Promise<MondayBoard> {
    const query = `
      query GetBoard($boardId: ID!) {
        boards(ids: [$boardId]) {
          id
          name
          columns {
            id
            title
            type
            settings_str
          }
          groups {
            id
            title
            color
          }
        }
      }
    `

    const response = await this.query<{ boards: MondayBoard[] }>(query, {
      boardId: this.boardId
    })

    if (!response.data.boards[0]) {
      throw new Error(`Board ${this.boardId} not found`)
    }

    return response.data.boards[0]
  }

  // ---------------------------------------------------------------------------
  // ITEM OPERATIONS
  // ---------------------------------------------------------------------------

  async getItems(limit = 100): Promise<MondayItem[]> {
    const query = `
      query GetItems($boardId: ID!, $limit: Int!) {
        boards(ids: [$boardId]) {
          items_page(limit: $limit) {
            items {
              id
              name
              state
              created_at
              updated_at
              column_values {
                id
                title
                text
                value
                type
              }
            }
          }
        }
      }
    `

    const response = await this.query<{ boards: Array<{ items_page: { items: MondayItem[] } }> }>(
      query,
      { boardId: this.boardId, limit }
    )

    return response.data.boards[0]?.items_page?.items || []
  }

  async getItem(itemId: string): Promise<MondayItem | null> {
    const query = `
      query GetItem($itemId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          state
          created_at
          updated_at
          column_values {
            id
            title
            text
            value
            type
          }
        }
      }
    `

    const response = await this.query<{ items: MondayItem[] }>(query, { itemId })
    return response.data.items[0] || null
  }

  async createItem(
    name: string,
    columnValues?: Record<string, unknown>
  ): Promise<{ id: string }> {
    const query = `
      mutation CreateItem($boardId: ID!, $groupId: String, $itemName: String!, $columnValues: JSON) {
        create_item(
          board_id: $boardId
          group_id: $groupId
          item_name: $itemName
          column_values: $columnValues
        ) {
          id
        }
      }
    `

    const response = await this.query<{ create_item: { id: string } }>(query, {
      boardId: this.boardId,
      groupId: this.groupId,
      itemName: name,
      columnValues: columnValues ? JSON.stringify(columnValues) : null
    })

    return response.data.create_item
  }

  async updateItem(
    itemId: string,
    columnValues: Record<string, unknown>
  ): Promise<{ id: string }> {
    const query = `
      mutation UpdateItem($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          board_id: $boardId
          item_id: $itemId
          column_values: $columnValues
        ) {
          id
        }
      }
    `

    const response = await this.query<{ change_multiple_column_values: { id: string } }>(query, {
      boardId: this.boardId,
      itemId,
      columnValues: JSON.stringify(columnValues)
    })

    return response.data.change_multiple_column_values
  }

  async updateColumn(
    itemId: string,
    columnId: string,
    value: unknown
  ): Promise<{ id: string }> {
    const query = `
      mutation UpdateColumn($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
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

    const response = await this.query<{ change_column_value: { id: string } }>(query, {
      boardId: this.boardId,
      itemId,
      columnId,
      value: JSON.stringify(value)
    })

    return response.data.change_column_value
  }

  // ---------------------------------------------------------------------------
  // STATUS COLUMN HELPERS
  // ---------------------------------------------------------------------------

  async updateStatus(
    itemId: string,
    columnId: string,
    status: string
  ): Promise<{ id: string }> {
    return this.updateColumn(itemId, columnId, { label: status })
  }

  // ---------------------------------------------------------------------------
  // WEBHOOK OPERATIONS
  // ---------------------------------------------------------------------------

  async createWebhook(
    url: string,
    event: 'change_column_value' | 'create_item' | 'change_status_column_value'
  ): Promise<{ id: string }> {
    const query = `
      mutation CreateWebhook($boardId: ID!, $url: String!, $event: WebhookEventType!) {
        create_webhook(
          board_id: $boardId
          url: $url
          event: $event
        ) {
          id
          board_id
        }
      }
    `

    const response = await this.query<{ create_webhook: { id: string; board_id: string } }>(query, {
      boardId: this.boardId,
      url,
      event
    })

    return { id: response.data.create_webhook.id }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    const query = `
      mutation DeleteWebhook($webhookId: ID!) {
        delete_webhook(id: $webhookId) {
          id
        }
      }
    `

    await this.query(query, { webhookId })
  }

  // ---------------------------------------------------------------------------
  // SYNC HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Sync approval status back to Monday.com
   */
  async syncApprovalStatus(
    itemId: string,
    approvalColumnId: string,
    status: 'Pending' | 'Approved' | 'Changes Requested' | 'Expired',
    dateColumnId?: string,
    responseDate?: string
  ): Promise<void> {
    const columnValues: Record<string, unknown> = {
      [approvalColumnId]: { label: status }
    }

    if (dateColumnId && responseDate) {
      columnValues[dateColumnId] = { date: responseDate.split('T')[0] }
    }

    await this.updateItem(itemId, columnValues)
  }

  /**
   * Create update/comment on item
   */
  async addUpdate(itemId: string, body: string): Promise<{ id: string }> {
    const query = `
      mutation AddUpdate($itemId: ID!, $body: String!) {
        create_update(item_id: $itemId, body: $body) {
          id
        }
      }
    `

    const response = await this.query<{ create_update: { id: string } }>(query, {
      itemId,
      body
    })

    return response.data.create_update
  }
}

// =============================================================================
// WEBHOOK PAYLOAD PARSER
// =============================================================================

export interface MondayWebhookPayload {
  event: {
    type: string
    triggerTime: string
    subscriptionId: number
    userId: number
    boardId: number
    pulseId: number
    pulseName?: string
    groupId?: string
    columnId?: string
    columnType?: string
    value?: {
      label?: { text: string }
      date?: string
      text?: string
    }
    previousValue?: {
      label?: { text: string }
    }
  }
  challenge?: string
}

export function parseMondayWebhook(payload: unknown): MondayWebhookPayload | null {
  try {
    if (typeof payload === 'string') {
      return JSON.parse(payload)
    }
    return payload as MondayWebhookPayload
  } catch {
    return null
  }
}

/**
 * Verify Monday.com webhook challenge
 */
export function handleWebhookChallenge(payload: MondayWebhookPayload): { challenge: string } | null {
  if (payload.challenge) {
    return { challenge: payload.challenge }
  }
  return null
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createMondayClient(config: MondayConfig): MondayClient {
  return new MondayClient(config)
}

export default MondayClient
