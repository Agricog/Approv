/**
 * ChangesModal Component
 * Modal for entering change request notes
 */

import { useState, useEffect, useRef } from 'react'
import { X, Send, AlertCircle } from 'lucide-react'
import { Button, Textarea } from '../common'
import { validateInput } from '../../utils/validation'

// =============================================================================
// TYPES
// =============================================================================

export interface ChangesModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (notes: string) => Promise<boolean> | void
  isSubmitting: boolean
  approvalStage: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ChangesModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  approvalStage
}: ChangesModalProps) {
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNotes('')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate notes
    const trimmedNotes = notes.trim()
    
    if (!trimmedNotes) {
      setError('Please describe the changes you need.')
      return
    }

    if (trimmedNotes.length < 10) {
      setError('Please provide more detail about the changes needed (at least 10 characters).')
      return
    }

    // Validate and sanitize
    const validation = validateInput(trimmedNotes, 'text', 2000)
    if (!validation.isValid) {
      setError(Object.values(validation.errors)[0] || 'Invalid input')
      return
    }

    await onSubmit(validation.sanitized)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="changes-modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className="relative bg-white rounded-lg shadow-xl max-w-lg w-full animate-slide-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 
              id="changes-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              Request Changes
            </h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              <p className="text-gray-600">
                Please describe the changes you need for the <strong>{approvalStage}</strong>. 
                Your feedback will be sent to the project team.
              </p>

              {/* Notes textarea */}
              <Textarea
                ref={textareaRef}
                label="Changes Required"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Please update the dimensions on page 2, and change the window positions on the east elevation..."
                rows={5}
                maxLength={2000}
                required
                error={error || undefined}
                disabled={isSubmitting}
              />

              {/* Character count */}
              <div className="flex justify-between text-sm text-gray-500">
                <span>Be as specific as possible</span>
                <span>{notes.length}/2000</span>
              </div>

              {/* Tips */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Tips for useful feedback:</p>
                    <ul className="list-disc list-inside space-y-1 text-amber-700">
                      <li>Reference specific pages or sections</li>
                      <li>Describe what you'd like changed</li>
                      <li>Explain why if it helps clarify</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                loadingText="Submitting..."
                leftIcon={<Send size={18} />}
                className="w-full sm:w-auto"
              >
                Submit Request
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangesModal
