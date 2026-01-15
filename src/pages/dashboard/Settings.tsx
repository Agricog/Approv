/**
 * Settings Page
 * Organization settings, branding, and integrations
 */

import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { 
  Link2, 
  Unlink,
  CheckCircle,
  Loader2,
  Palette,
  Image,
  Save,
  Building2
} from 'lucide-react'
import { DashboardLayout, PageHeader, ContentCard } from '../../components/layout'
import { Button } from '../../components/common'
import { useApi } from '../../hooks'

// =============================================================================
// TYPES
// =============================================================================

interface IntegrationStatus {
  connected: boolean
  boardId?: string | null
}

interface OrganizationSettings {
  id: string
  name: string
  logo: string | null
  primaryColor: string | null
  emailFooterText: string | null
  website: string | null
  phone: string | null
  address: string | null
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
        <ContentCard title="Branding" description="Customize your organization's appearance in emails">
          <BrandingSettings />
        </ContentCard>

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
// BRANDING SETTINGS
// =============================================================================

function BrandingSettings() {
  const { data, isLoading, error, execute } = useApi<OrganizationSettings>()
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    logo: '',
    primaryColor: '#16a34a',
    emailFooterText: '',
    website: '',
    phone: '',
    address: ''
  })

  // Load current settings
  useEffect(() => {
    execute('/api/organizations/current')
  }, [execute])

  // Populate form when data loads
  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        logo: data.logo || '',
        primaryColor: data.primaryColor || '#16a34a',
        emailFooterText: data.emailFooterText || '',
        website: data.website || '',
        phone: data.phone || '',
        address: data.address || ''
      })
    }
  }, [data])

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
    setSaveError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)

    try {
      const token = await getToken()
      const csrfToken = await getCsrfToken()
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://airy-fascination-production-00ba.up.railway.app'}/api/organizations/current`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            name: formData.name || undefined,
            logo: formData.logo || null,
            primaryColor: formData.primaryColor || null,
            emailFooterText: formData.emailFooterText || null,
            website: formData.website || null,
            phone: formData.phone || null,
            address: formData.address || null
          })
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error?.message || 'Failed to save settings')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 py-4">
        Failed to load settings. Please refresh the page.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Company Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          <Building2 className="w-4 h-4 inline mr-1" />
          Company Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Your Architecture Practice"
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Appears in email headers and footers</p>
      </div>

      {/* Logo URL */}
      <div>
        <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-1">
          <Image className="w-4 h-4 inline mr-1" />
          Logo URL
        </label>
        <input
          type="url"
          id="logo"
          value={formData.logo}
          onChange={(e) => handleChange('logo', e.target.value)}
          placeholder="https://example.com/logo.png"
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Recommended: 200x50px PNG with transparent background</p>
        
        {/* Logo Preview */}
        {formData.logo && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Preview:</p>
            <img 
              src={formData.logo} 
              alt="Logo preview" 
              className="max-h-12 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* Primary Color */}
      <div>
        <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-1">
          <Palette className="w-4 h-4 inline mr-1" />
          Brand Color
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            id="primaryColor"
            value={formData.primaryColor}
            onChange={(e) => handleChange('primaryColor', e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border border-gray-300"
          />
          <input
            type="text"
            value={formData.primaryColor}
            onChange={(e) => handleChange('primaryColor', e.target.value)}
            placeholder="#16a34a"
            pattern="^#[0-9A-Fa-f]{6}$"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Used for buttons and links in emails</p>
        
        {/* Color Preview */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">Preview:</span>
          <span 
            className="px-3 py-1 text-white text-sm rounded"
            style={{ backgroundColor: formData.primaryColor }}
          >
            Approve
          </span>
        </div>
      </div>

      {/* Email Footer Text */}
      <div>
        <label htmlFor="emailFooterText" className="block text-sm font-medium text-gray-700 mb-1">
          Email Footer Text
        </label>
        <textarea
          id="emailFooterText"
          value={formData.emailFooterText}
          onChange={(e) => handleChange('emailFooterText', e.target.value)}
          placeholder="© 2026 Your Practice. All rights reserved.&#10;123 High Street, London, UK"
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">Appears at the bottom of all emails</p>
      </div>

      {/* Contact Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            type="url"
            id="website"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://yourpractice.com"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+44 20 1234 5678"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        >
          {saving ? 'Saving...' : 'Save Branding'}
        </Button>
        
        {saveSuccess && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" />
            Settings saved
          </span>
        )}
        
        {saveError && (
          <span className="text-sm text-red-600">{saveError}</span>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// DROPBOX INTEGRATION
// =============================================================================

function DropboxIntegration() {
  const { data, isLoading, execute } = useApi<IntegrationStatus>()
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
  const { data, isLoading, execute } = useApi<IntegrationStatus>()
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

// =============================================================================
// HELPERS
// =============================================================================

// Helper to get Clerk token
async function getToken(): Promise<string> {
  // @ts-ignore - Clerk exposes this globally
  const clerk = window.Clerk
  if (clerk?.session) {
    return await clerk.session.getToken() || ''
  }
  return ''
}

// Helper to get CSRF token
async function getCsrfToken(): Promise<string> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL || 'https://airy-fascination-production-00ba.up.railway.app'}/api/csrf-token`,
      {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${await getToken()}`
        }
      }
    )
    const data = await response.json()
    return data.token || ''
  } catch {
    return ''
  }
}

export default Settings
