/**
 * useDebounce Hook
 * Debounce values and callbacks for performance optimization
 * Use for: search inputs, API calls, resize handlers
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// =============================================================================
// DEBOUNCE VALUE HOOK
// =============================================================================

/**
 * Debounce a value
 * Returns the debounced value after the specified delay
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 300)
 * 
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     searchApi(debouncedSearch)
 *   }
 * }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delay])

  return debouncedValue
}

// =============================================================================
// DEBOUNCE CALLBACK HOOK
// =============================================================================

/**
 * Debounce a callback function
 * Returns a debounced version of the callback
 * 
 * @example
 * const handleSearch = useDebounceCallback((term: string) => {
 *   searchApi(term)
 * }, 300)
 * 
 * <input onChange={(e) => handleSearch(e.target.value)} />
 */
export function useDebounceCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const callbackRef = useRef(callback)

  // Update callback ref on change
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }, [delay])
}

// =============================================================================
// THROTTLE CALLBACK HOOK
// =============================================================================

/**
 * Throttle a callback function
 * Ensures callback is called at most once per delay period
 * 
 * @example
 * const handleScroll = useThrottleCallback(() => {
 *   trackScrollPosition()
 * }, 100)
 * 
 * window.addEventListener('scroll', handleScroll)
 */
export function useThrottleCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef<number>(0)
  const callbackRef = useRef(callback)

  // Update callback ref on change
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now
      callbackRef.current(...args)
    }
  }, [delay])
}

// =============================================================================
// DEBOUNCED STATE HOOK
// =============================================================================

interface UseDebouncedStateReturn<T> {
  value: T
  debouncedValue: T
  setValue: (value: T) => void
  isPending: boolean
}

/**
 * Combined state and debounced value
 * Provides both immediate value (for input display) and debounced value (for API calls)
 * 
 * @example
 * const { value, debouncedValue, setValue, isPending } = useDebouncedState('', 300)
 * 
 * <input value={value} onChange={(e) => setValue(e.target.value)} />
 * {isPending && <Spinner />}
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number
): UseDebouncedStateReturn<T> {
  const [value, setValue] = useState<T>(initialValue)
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsPending(true)
    }

    const timeoutId = setTimeout(() => {
      setDebouncedValue(value)
      setIsPending(false)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [value, delay, debouncedValue])

  return useMemo(() => ({
    value,
    debouncedValue,
    setValue,
    isPending
  }), [value, debouncedValue, isPending])
}

// =============================================================================
// DEBOUNCED INPUT HOOK
// =============================================================================

interface UseDebouncedInputOptions {
  initialValue?: string
  delay?: number
  minLength?: number
  onDebounce?: (value: string) => void
}

interface UseDebouncedInputReturn {
  value: string
  debouncedValue: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onClear: () => void
  isPending: boolean
  isValid: boolean
}

/**
 * Complete debounced input hook
 * Handles input state, debouncing, and validation
 * 
 * @example
 * const search = useDebouncedInput({
 *   delay: 300,
 *   minLength: 2,
 *   onDebounce: (value) => searchApi(value)
 * })
 * 
 * <input value={search.value} onChange={search.onChange} />
 * <button onClick={search.onClear}>Clear</button>
 */
export function useDebouncedInput(
  options: UseDebouncedInputOptions = {}
): UseDebouncedInputReturn {
  const {
    initialValue = '',
    delay = 300,
    minLength = 0,
    onDebounce
  } = options

  const [value, setValue] = useState(initialValue)
  const debouncedValue = useDebounce(value, delay)
  const [isPending, setIsPending] = useState(false)
  const onDebounceRef = useRef(onDebounce)

  // Update callback ref
  useEffect(() => {
    onDebounceRef.current = onDebounce
  }, [onDebounce])

  // Track pending state
  useEffect(() => {
    if (value !== debouncedValue) {
      setIsPending(true)
    } else {
      setIsPending(false)
    }
  }, [value, debouncedValue])

  // Trigger callback on debounced value change
  useEffect(() => {
    if (debouncedValue.length >= minLength && onDebounceRef.current) {
      onDebounceRef.current(debouncedValue)
    }
  }, [debouncedValue, minLength])

  const onChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValue(e.target.value)
  }, [])

  const onClear = useCallback(() => {
    setValue('')
  }, [])

  const isValid = value.length >= minLength

  return useMemo(() => ({
    value,
    debouncedValue,
    onChange,
    onClear,
    isPending,
    isValid
  }), [value, debouncedValue, onChange, onClear, isPending, isValid])
}

// =============================================================================
// LEADING DEBOUNCE HOOK
// =============================================================================

/**
 * Leading edge debounce - fires immediately, then ignores subsequent calls
 * Use for: preventing double-clicks, rate limiting button presses
 * 
 * @example
 * const handleSubmit = useLeadingDebounce(() => {
 *   submitForm()
 * }, 1000)
 */
export function useLeadingDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const isBlockedRef = useRef(false)
  const callbackRef = useRef(callback)

  // Update callback ref on change
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback((...args: Parameters<T>) => {
    if (isBlockedRef.current) {
      return
    }

    callbackRef.current(...args)
    isBlockedRef.current = true

    timeoutRef.current = setTimeout(() => {
      isBlockedRef.current = false
    }, delay)
  }, [delay])
}
