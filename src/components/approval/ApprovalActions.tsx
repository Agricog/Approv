/**
 * ApprovalActions Component
 * Approve and Request Changes buttons with confirmation modal
 */

import { useState } from 'react'
import { CheckCircle, MessageSquare, AlertTriangle, X } from 'lucide-react'
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
// CONFIRMATION MODAL COMPONENT
// =============================================================================

interface ConfirmApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting: boolean
  approvalStage: string
}

function ConfirmApprovalModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting,
  approvalStage
}: ConfirmApprovalModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Confirm Your Approval
            </h3>
            <p className="text-gray-600 mb-4">
              You are about to approve <strong>{approvalStage}</strong>.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <p className="text-sm text-amber-800">
                <strong>Please confirm:</strong>
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1">
                <li>• You have reviewed all the plans/documents</li>
                <li>• You are satisfied with the work as presented</li>
                <li>• You authorise proceeding to the next stage</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Go Back & Review
            </Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              isLoading={isSubmitting}
              loadingText="Approving..."
              leftIcon={<CheckCircle size={18} />}
              className="flex-1"
            >
              Yes, I Approve
            </Button>
          </div>

          {/* Footer note */}
          <p className="text-xs text-gray-500 text-center mt-4">
            This action cannot be undone. If you need changes, click "Go Back & Review".
          </p>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ApprovalActions({
  onApprove,
  onRequestChanges,
  isSubmitting,
  error,
  approvalStage
}: ApprovalActionsProps) {
  const [showChangesModal, setShowChangesModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleApproveClick = () => {
    setShowConfirmModal(true)
  }

  const handleConfirmApprove = async () => {
    const success = await onApprove()
    if (success) {
      setShowConfirmModal(false)
    }
  }

  const handleRequestChanges = async (notes: string): Promise<boolean> => {
    const success = await onRequestChanges(notes)
    if (success) {
      setShowChangesModal(false)
    }
    return success
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

      {/* Main action buttons */}
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

      {/* Confirmation modal for approval */}
      <ConfirmApprovalModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmApprove}
        isSubmitting={isSubmitting}
        approvalStage={approvalStage}
      />

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
