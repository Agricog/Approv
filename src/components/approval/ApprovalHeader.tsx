/**
 * ApprovalHeader Component
 * Displays project name, client, stage, and timing info
 */

import { Calendar, Clock, User, FileText } from 'lucide-react'
import { formatDate, formatRelativeTime, getDaysPending } from '../../utils/formatters'
import { StatusBadge } from '../common'

// =============================================================================
// TYPES
// =============================================================================

export interface ApprovalHeaderProps {
  projectName: string
  clientName: string
  approvalStage: string
  createdAt: string
  expiresAt: string
  companyLogo?: string
  companyName?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ApprovalHeader({
  projectName,
  clientName,
  approvalStage,
  createdAt,
  expiresAt,
  companyLogo,
  companyName
}: ApprovalHeaderProps) {
  const daysPending = getDaysPending(createdAt)
  const daysUntilExpiry = getDaysPending(new Date().toISOString()) - getDaysPending(expiresAt)
  const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0

  return (
    <div className="space-y-4">
      {/* Company branding (if provided) */}
      {(companyLogo || companyName) && (
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          {companyLogo && (
            <img
              src={companyLogo}
              alt={companyName || 'Company logo'}
              className="h-10 w-auto"
            />
          )}
          {companyName && !companyLogo && (
            <span className="text-xl font-semibold text-gray-900">
              {companyName}
            </span>
          )}
        </div>
      )}

      {/* Main header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          {/* Project name */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {projectName}
          </h1>

          {/* Stage badge */}
          <div className="flex items-center gap-2">
            <StatusBadge status="pending" label={approvalStage} size="md" />
          </div>
        </div>

        {/* Expiry warning */}
        {isExpiringSoon && (
          <div className="flex-shrink-0">
            <StatusBadge 
              status="warning" 
              label={`Expires ${formatRelativeTime(expiresAt)}`}
              size="md"
            />
          </div>
        )}
      </div>

      {/* Meta information */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
        {/* Client name */}
        <div className="flex items-center gap-2">
          <User size={16} className="text-gray-400" aria-hidden="true" />
          <span>
            <span className="sr-only">Client: </span>
            {clientName}
          </span>
        </div>

        {/* Stage */}
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-gray-400" aria-hidden="true" />
          <span>
            <span className="sr-only">Stage: </span>
            {approvalStage}
          </span>
        </div>

        {/* Sent date */}
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" aria-hidden="true" />
          <span>
            <span className="sr-only">Sent on: </span>
            Sent {formatDate(createdAt)}
          </span>
        </div>

        {/* Days pending */}
        {daysPending > 0 && (
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" aria-hidden="true" />
            <span>
              <span className="sr-only">Pending for: </span>
              {daysPending} {daysPending === 1 ? 'day' : 'days'} pending
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
        <p className="text-green-800 text-sm">
          <strong>Action required:</strong> Please review the document below and either approve to proceed, 
          or request changes if amendments are needed.
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

export interface ApprovalHeaderCompactProps {
  projectName: string
  approvalStage: string
  status: 'pending' | 'approved' | 'changes_requested' | 'expired'
}

export function ApprovalHeaderCompact({
  projectName,
  approvalStage,
  status
}: ApprovalHeaderCompactProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{projectName}</h1>
        <p className="text-sm text-gray-600">{approvalStage}</p>
      </div>
      <StatusBadge status={status} size="md" />
    </div>
  )
}

export default ApprovalHeader
