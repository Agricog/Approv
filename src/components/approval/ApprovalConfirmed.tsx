/**
 * ApprovalConfirmed Component
 * Displayed when an approval has already been responded to
 */

import { CheckCircle, MessageSquare, Calendar, ArrowRight } from 'lucide-react'
import { formatDateTime } from '../../utils/formatters'
import type { ApprovalStatus } from '../../types'

// =============================================================================
// TYPES
// =============================================================================

export interface ApprovalConfirmedProps {
  projectName: string
  approvalStage: string
  status: ApprovalStatus
  respondedAt: string | null
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ApprovalConfirmed({
  projectName,
  approvalStage,
  status,
  respondedAt
}: ApprovalConfirmedProps) {
  const isApproved = status === 'approved'
  const isChangesRequested = status === 'changes_requested'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Main card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Status banner */}
          <div 
            className={`px-6 py-8 text-center ${
              isApproved 
                ? 'bg-green-600' 
                : isChangesRequested 
                  ? 'bg-amber-500' 
                  : 'bg-gray-600'
            }`}
          >
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
              {isApproved ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <MessageSquare className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              {isApproved ? 'Approved!' : 'Changes Requested'}
            </h1>
            <p className="text-white/90">
              {isApproved 
                ? 'Thank you for your approval'
                : 'Your feedback has been submitted'
              }
            </p>
          </div>

          {/* Details */}
          <div className="px-6 py-6 space-y-4">
            {/* Project info */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {projectName}
              </h2>
              <p className="text-gray-600">{approvalStage}</p>
            </div>

            {/* Response time */}
            {respondedAt && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} />
                <span>Responded on {formatDateTime(respondedAt)}</span>
              </div>
            )}

            {/* Status message */}
            <div 
              className={`p-4 rounded-lg ${
                isApproved 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              {isApproved ? (
                <div className="text-green-800">
                  <p className="font-medium mb-1">What happens next?</p>
                  <p className="text-sm">
                    The project team has been notified of your approval and will 
                    proceed with the next stage. You'll receive another notification 
                    when the next deliverable is ready for review.
                  </p>
                </div>
              ) : (
                <div className="text-amber-800">
                  <p className="font-medium mb-1">What happens next?</p>
                  <p className="text-sm">
                    The project team has received your feedback and will make the 
                    requested changes. You'll receive a new approval request once 
                    the amendments are complete.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              This approval has been recorded and cannot be changed. 
              If you need to make amendments, please contact the project team directly.
            </p>
          </div>
        </div>

        {/* Branding */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Powered by{' '}
          <a 
            href="https://approv.co.uk"
            className="text-green-600 hover:text-green-700 font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Approv
          </a>
        </p>
      </div>
    </div>
  )
}

// =============================================================================
// SUCCESS REDIRECT VARIANT
// =============================================================================

export interface ApprovalSuccessProps {
  action: 'approved' | 'changes_requested'
  projectName: string
  onContinue?: () => void
}

export function ApprovalSuccess({
  action,
  projectName,
  onContinue
}: ApprovalSuccessProps) {
  const isApproved = action === 'approved'

  return (
    <div className="text-center py-12 px-4">
      <div 
        className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
          isApproved ? 'bg-green-100' : 'bg-amber-100'
        }`}
      >
        {isApproved ? (
          <CheckCircle className={`w-10 h-10 text-green-600`} />
        ) : (
          <MessageSquare className={`w-10 h-10 text-amber-600`} />
        )}
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isApproved ? 'Successfully Approved!' : 'Changes Requested'}
      </h2>

      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
        {isApproved 
          ? `Your approval for ${projectName} has been recorded.`
          : `Your feedback for ${projectName} has been submitted.`
        }
      </p>

      {onContinue && (
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
        >
          <span>View all projects</span>
          <ArrowRight size={18} />
        </button>
      )}
    </div>
  )
}

export default ApprovalConfirmed
