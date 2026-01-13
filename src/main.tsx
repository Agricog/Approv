import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ClerkProvider } from '@clerk/clerk-react'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'

// Clerk publishable key
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('Missing VITE_CLERK_PUBLISHABLE_KEY - authentication will not work')
}

// Initialize Sentry error tracking
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true
      })
    ],
    beforeSend(event) {
      // SECURITY: Filter out sensitive data before sending to Sentry
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['X-CSRF-Token']
        delete event.request.headers['Cookie']
      }
      // Remove any potential PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data?.url) {
            // Strip query params that might contain tokens
            try {
              const url = new URL(breadcrumb.data.url)
              url.search = ''
              breadcrumb.data.url = url.toString()
            } catch {
              // Invalid URL, leave as is
            }
          }
          return breadcrumb
        })
      }
      return event
    }
  })
}

// Error fallback component
interface ErrorFallbackProps {
  error: Error
}

function ErrorFallback({ error }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg 
            className="w-8 h-8 text-red-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-4">
          We've been notified and are working on a fix.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          Refresh Page
        </button>
        {import.meta.env.DEV && (
          <pre className="mt-4 p-3 bg-gray-100 rounded text-left text-xs text-red-600 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  )
}

// Get root element with type safety
const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found. Check index.html has <div id="root"></div>')
}

const root = createRoot(container)
root.render(
  <StrictMode>
    <Sentry.ErrorBoundary 
      fallback={({ error }) => (
        <ErrorFallback error={error instanceof Error ? error : new Error(String(error))} />
      )}
    >
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY || ''}>
        <HelmetProvider>
          <App />
        </HelmetProvider>
      </ClerkProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>
)
