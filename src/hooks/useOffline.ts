/**
 * useOffline Hook
 * Detects online/offline status and provides offline UI state
 */

import { useState, useEffect, useCallback } from 'react'

// =============================================================================
// TYPES
// =============================================================================

export interface OfflineState {
  isOnline: boolean
  isOffline: boolean
  wasOffline: boolean
  lastOnlineAt: Date | null
}

export interface UseOfflineReturn extends OfflineState {
  checkConnection: () => Promise<boolean>
}

// =============================================================================
// HOOK
// =============================================================================

export function useOffline(): UseOfflineReturn {
  const [state, setState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    wasOffline: false,
    lastOnlineAt: null
  })

  // Handle online event
  const handleOnline = useCallback(() => {
    setState(prev => ({
      isOnline: true,
      isOffline: false,
      wasOffline: prev.isOffline, // Track if we were offline
      lastOnlineAt: new Date()
    }))
  }, [])

  // Handle offline event
  const handleOffline = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOnline: false,
      isOffline: true
    }))
  }, [])

  // Manual connection check (useful for verifying actual connectivity)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      return false
    }

    try {
      // Try to fetch a small resource to verify actual connectivity
      // Using a timestamp to prevent caching
      const response = await fetch(`/api/health?t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-store'
      })
      
      const isConnected = response.ok
      
      setState(prev => ({
        isOnline: isConnected,
        isOffline: !isConnected,
        wasOffline: prev.isOffline && isConnected,
        lastOnlineAt: isConnected ? new Date() : prev.lastOnlineAt
      }))
      
      return isConnected
    } catch {
      setState(prev => ({
        ...prev,
        isOnline: false,
        isOffline: true
      }))
      return false
    }
  }, [])

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    if (navigator.onLine) {
      setState(prev => ({
        ...prev,
        lastOnlineAt: new Date()
      }))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [handleOnline, handleOffline])

  return {
    ...state,
    checkConnection
  }
}

// =============================================================================
// OFFLINE BANNER HOOK
// =============================================================================

interface UseOfflineBannerOptions {
  showReconnectedFor?: number // ms to show "back online" message
}

interface UseOfflineBannerReturn {
  showOfflineBanner: boolean
  showReconnectedBanner: boolean
  dismissReconnected: () => void
}

/**
 * Hook for managing offline/reconnected banner display
 */
export function useOfflineBanner(
  options: UseOfflineBannerOptions = {}
): UseOfflineBannerReturn {
  const { showReconnectedFor = 3000 } = options
  const { isOffline, wasOffline } = useOffline()
  const [showReconnected, setShowReconnected] = useState(false)

  // Show reconnected banner when coming back online
  useEffect(() => {
    if (wasOffline && !isOffline) {
      setShowReconnected(true)
      
      const timeout = setTimeout(() => {
        setShowReconnected(false)
      }, showReconnectedFor)
      
      return () => clearTimeout(timeout)
    }
  }, [wasOffline, isOffline, showReconnectedFor])

  const dismissReconnected = useCallback(() => {
    setShowReconnected(false)
  }, [])

  return {
    showOfflineBanner: isOffline,
    showReconnectedBanner: showReconnected,
    dismissReconnected
  }
}

// =============================================================================
// NETWORK STATUS HOOK
// =============================================================================

export interface NetworkStatus {
  isOnline: boolean
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  downlink: number | null
  rtt: number | null
  saveData: boolean
}

/**
 * Hook for detailed network status (where supported)
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => getNetworkStatus())

  useEffect(() => {
    const updateStatus = () => {
      setStatus(getNetworkStatus())
    }

    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    // Listen to connection changes if supported
    const connection = getConnection()
    if (connection) {
      connection.addEventListener('change', updateStatus)
    }

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
      
      if (connection) {
        connection.removeEventListener('change', updateStatus)
      }
    }
  }, [])

  return status
}

// =============================================================================
// HELPERS
// =============================================================================

interface NetworkInformation {
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g'
  downlink: number
  rtt: number
  saveData: boolean
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

function getConnection(): NetworkInformation | null {
  if (typeof navigator === 'undefined') {
    return null
  }
  
  const nav = navigator as unknown as {
    connection?: NetworkInformation
    mozConnection?: NetworkInformation
    webkitConnection?: NetworkInformation
  }
  
  return nav.connection || nav.mozConnection || nav.webkitConnection || null
}

function getNetworkStatus(): NetworkStatus {
  const connection = getConnection()
  
  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: connection?.effectiveType || 'unknown',
    downlink: connection?.downlink || null,
    rtt: connection?.rtt || null,
    saveData: connection?.saveData || false
  }
}
