/**
 * Settings Page
 * Organization settings and integrations
 */

import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { 
  Settings as SettingsIcon, 
  Link2, 
  Unlink,
  ExternalLink,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { DashboardLayout, PageHeader, ContentCard } from '../../components/layout'
import { Button, ErrorMessage } from '../../components/common'
import { useApi } from '../../hooks'

// =============================================================================
// TYPES
// =============================================================================

interface IntegrationStatus {
  connected: boolean
  boardId?: string | null
}

// =============================================================================
// COMPONENT
// =============================================================================

export function Settings() {
  return (
    <DashboardLayout>
      <Helmet>
        <title>Settings | Approv</title>
      </Helmet>

      <PageHeader
        title="Settings"
        description="Manage your organization and integrations"
      />

      <div className="space-y-6">
        <ContentCard title="Integrations" description="Connect external services">
          <div className="space-y-4">
            <DropboxIntegration />
            <hr className="border-gray-200" />
            <MondayIntegration />
          </div>
        </ContentCard>
      </div>
    </DashboardLayout>
  )
}

// =============================================================================
// DROPBOX INTEGRATION
// =============================================================================

function DropboxIntegration() {
  const { data, isLoading, error, execute } = useApi<IntegrationStatus>()
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    execute('/api/dropbox/status')
  }, [execute])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://airy-fascination-production-00ba.up.railway.app'}/api/dropbox/auth`,
        {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${await getToken()}`
          }
        }
      )
      const result = await response.json()
      if (result.success && result.data.authUrl) {
        window.location.href = result.data.authUrl
      }
    } catch (err) {
      console.error('Failed to get auth URL', err)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Dropbox? Files will no longer sync.')) return
    
    setDisconnecting(true)
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'https://airy-fascination-production-00ba.up.railway.app'}/api/dropbox`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${await getToken()}`
          }
        }
      )
      execute('/api/dropbox/status')
    } catch (err) {
      console.error('Failed to disconnect', err)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L6 6.5L12 11L6 15.5L12 20L18 15.5L12 11L18 6.5L12 2Z" />
          </svg>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Dropbox</h3>
          <p className="text-sm text-gray-500">
            {data?.connected 
              ? 'Connected - approved files sync automatically' 
              : 'Sync approved files to your Dropbox'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {data?.connected && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle size={16} />
            Connected
          </span>
        )}
        
        {data?.connected ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
            leftIcon={disconnecting ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleConnect}
            disabled={connecting || isLoading}
            leftIcon={connecting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// MONDAY INTEGRATION
// =============================================================================

function MondayIntegration() {
  const { data, isLoading, error, execute } = useApi<IntegrationStatus>()
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    execute('/api/monday/status')
  }, [execute])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://airy-fascination-production-00ba.up.railway.app'}/api/monday/auth`,
        {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${await getToken()}`
          }
        }
      )
      const result = await response.json()
      if (result.success && result.data.authUrl) {
        window.location.href = result.data.authUrl
      }
    } catch (err) {
      console.error('Failed to get auth URL', err)
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Monday.com? Projects will no longer sync.')) return
    
    setDisconnecting(true)
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'https://airy-fascination-production-00ba.up.railway.app'}/api/monday`,
        {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${await getToken()}`
          }
        }
      )
      execute('/api/monday/status')
    } catch (err) {
      console.error('Failed to disconnect', err)
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="6" cy="12" r="3" />
            <circle cx="12" cy="12" r="3" />
            <circle cx="18" cy="12" r="3" />
          </svg>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">Monday.com</h3>
          <p className="text-sm text-gray-500">
            {data?.connected 
              ? 'Connected - projects sync with your board' 
              : 'Two-way sync with Monday.com boards'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {data?.connected && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle size={16} />
            Connected
          </span>
        )}
        
        {data?.connected ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
            leftIcon={disconnecting ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleConnect}
            disabled={connecting || isLoading}
            leftIcon={connecting ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  )
}

// Helper to get Clerk token
async function getToken(): Promise<string> {
  // @ts-ignore - Clerk exposes this globally
  const clerk = window.Clerk
  if (clerk?.session) {
    return await clerk.session.getToken() || ''
  }
  return ''
}

export default Settings
