/**
 * ApprovalActions Component
 * Approve and Request Changes buttons with confirmation
 */

import { useState } from 'react'
import { CheckCircle, MessageSquare } from 'lucide-react'
import { Button, ErrorMessage } from '../common'
import { ChangesModal } from './ChangesModal'

// =============================================================================
// TYPES
// =============================================================================

export interface ApprovalActionsProps {
  onApprove: () => Promise<boolean>
  onRequestChanges: (notes: string) => Promise<boolean>
  isSubmitting: boolean
  error: string | null
  approvalStage: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ApprovalActions({
  onApprove,
  onRequestChanges,
  isSubmitting,
  error,
  approvalStage
}: ApprovalActionsProps) {
  const [showChangesModal, setShowChangesModal] = useState(false)
  const [showConfirmApprove, setShowConfirmApprove] = useState(false)

  const handleApproveClick = () => {
    setShowConfirmApprove(true)
  }

  const handleConfirmApprove = async () => {
    const success = await onApprove()
    if (success) {
      setShowConfirmApprove(false)
    }
  }

  const handleRequestChanges = async (notes: string) => {
    const success = await onRequestChanges(notes)
    if (success) {
      setShowChangesModal(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Error message */}
      {error && (
        <ErrorMessage
          message={error}
          variant="error"
          dismissible
        />
      )}

      {/* Approval confirmation */}
      {showConfirmApprove && !showChangesModal && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Confirm Approval
          </h3>
          <p className="text-green-800 mb-4">
            By approving, you confirm that you have reviewed the {approvalStage} and 
            are happy to proceed to the next stage.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              onClick={handleConfirmApprove}
              isLoading={isSubmitting}
              loadingText="Approving..."
              leftIcon={<CheckCircle size={18} />}
            >
              Yes, Approve
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmApprove(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main action buttons */}
      {!showConfirmApprove && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Your Decision
          </h3>
          <p className="text-gray-600 mb-6">
            Please review the document above and select one of the options below.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Approve button */}
            <Button
              variant="primary"
              size="lg"
              onClick={handleApproveClick}
              disabled={isSubmitting}
              leftIcon={<CheckCircle size={20} />}
              className="flex-1 sm:flex-initial"
            >
              Approve
            </Button>

            {/* Request changes button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowChangesModal(true)}
              disabled={isSubmitting}
              leftIcon={<MessageSquare size={20} />}
              className="flex-1 sm:flex-initial"
            >
              Request Changes
            </Button>
          </div>

          {/* Help text */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              What do these options mean?
            </h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Approve:</strong> You're happy with the deliverable and give 
                  permission to proceed to the next stage.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Request Changes:</strong> You'd like amendments made before 
                  giving approval. You'll be able to describe the changes needed.
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Changes modal */}
      <ChangesModal
        isOpen={showChangesModal}
        onClose={() => setShowChangesModal(false)}
        onSubmit={handleRequestChanges}
        isSubmitting={isSubmitting}
        approvalStage={approvalStage}
      />
    </div>
  )
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

export interface ApprovalActionsCompactProps {
  onApprove: () => void
  onRequestChanges: () => void
  isSubmitting: boolean
}

export function ApprovalActionsCompact({
  onApprove,
  onRequestChanges,
  isSubmitting
}: ApprovalActionsCompactProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant="primary"
        size="sm"
        onClick={onApprove}
        disabled={isSubmitting}
        leftIcon={<CheckCircle size={16} />}
      >
        Approve
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onRequestChanges}
        disabled={isSubmitting}
        leftIcon={<MessageSquare size={16} />}
      >
        Changes
      </Button>
    </div>
  )
}

export default ApprovalActions
