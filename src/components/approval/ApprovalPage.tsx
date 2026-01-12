/**
 * ApprovalPage Component
 * Main client-facing approval page
 * Displays deliverable and approval actions
 */

import { useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useApproval } from '../../hooks'
import { useAnalytics } from '../../hooks/useAnalytics'
import { 
  FullPageLoading, 
  FullPageError 
} from '../common'
import { ApprovalHeader } from './ApprovalHeader'
import { DeliverablePreview } from './DeliverablePreview'
import { ApprovalActions } from './ApprovalActions'
import { ApprovalConfirmed } from './ApprovalConfirmed'
import { ApprovalExpired } from './ApprovalExpired'

// =============================================================================
// COMPONENT
// =============================================================================

export function ApprovalPage() {
  const { token } = useParams<{ token: string }>()
  
  const {
    approval,
    isLoading,
    error,
    isExpired,
    isAlreadyResponded,
    submitApproval,
    isSubmitting,
    submitError
  } = useApproval(token)

  // Track page analytics
  useAnalytics({
    pageName: 'approval',
    trackEngagement: true,
    trackScroll: true
  })

  // Loading state
  if (isLoading) {
    return <FullPageLoading message="Loading approval..." />
  }

  // Error state
  if (error || !approval) {
    return (
      <FullPageError
        title="Approval Not Found"
        message={error || "This approval link is invalid or has been removed."}
        onGoHome={() => window.location.href = '/'}
      />
    )
  }

  // Expired state
  if (isExpired) {
    return (
      <>
        <ApprovalPageMeta 
          projectName={approval.projectName} 
          stage={approval.approvalStage} 
        />
        <ApprovalExpired
          projectName={approval.projectName}
          approvalStage={approval.approvalStage}
          expiresAt={approval.expiresAt}
        />
      </>
    )
  }

  // Already responded state
  if (isAlreadyResponded) {
    return (
      <>
        <ApprovalPageMeta 
          projectName={approval.projectName} 
          stage={approval.approvalStage} 
        />
        <ApprovalConfirmed
          projectName={approval.projectName}
          approvalStage={approval.approvalStage}
          status={approval.status}
          respondedAt={approval.respondedAt}
        />
      </>
    )
  }

  // Main approval view
  return (
    <>
      <ApprovalPageMeta 
        projectName={approval.projectName} 
        stage={approval.approvalStage} 
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <ApprovalHeader
              projectName={approval.projectName}
              clientName={approval.clientName}
              approvalStage={approval.approvalStage}
              createdAt={approval.createdAt}
              expiresAt={approval.expiresAt}
            />
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {/* Deliverable preview */}
            {approval.deliverableUrl && (
              <section aria-labelledby="deliverable-heading">
                <h2 id="deliverable-heading" className="sr-only">
                  Document Preview
                </h2>
                <DeliverablePreview
                  url={approval.deliverableUrl}
                  type={approval.deliverableType}
                  projectName={approval.projectName}
                  stage={approval.approvalStage}
                />
              </section>
            )}

            {/* Approval actions */}
            <section aria-labelledby="actions-heading">
              <h2 id="actions-heading" className="sr-only">
                Approval Actions
              </h2>
              <ApprovalActions
                onApprove={() => submitApproval('approve')}
                onRequestChanges={(notes) => submitApproval('request_changes', notes)}
                isSubmitting={isSubmitting}
                error={submitError}
                approvalStage={approval.approvalStage}
              />
            </section>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <p className="text-sm text-gray-500 text-center">
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
        </footer>
      </div>
    </>
  )
}

// =============================================================================
// META COMPONENT
// =============================================================================

interface ApprovalPageMetaProps {
  projectName: string
  stage: string
}

function ApprovalPageMeta({ projectName, stage }: ApprovalPageMetaProps) {
  const title = `Approval Required: ${projectName} - ${stage}`
  const description = `Please review and approve the ${stage} for ${projectName}.`

  return (
    <Helmet>
      <title>{title} | Approv</title>
      <meta name="description" content={description} />
      <meta name="robots" content="noindex, nofollow" />
      
      {/* Prevent caching of approval pages */}
      <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      <meta httpEquiv="Pragma" content="no-cache" />
      <meta httpEquiv="Expires" content="0" />
    </Helmet>
  )
}

export default ApprovalPage
