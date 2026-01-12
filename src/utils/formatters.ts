/**
 * Formatter Utilities
 * Date, currency, and display formatting
 * All dates use UK locale (en-GB)
 */

import {
  format,
  formatDistanceToNow,
  formatDistance,
  parseISO,
  isValid,
  differenceInDays,
  differenceInHours,
  addDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isToday,
  isYesterday,
  isTomorrow,
  isPast,
  isFuture
} from 'date-fns'
import { enGB } from 'date-fns/locale'

// =============================================================================
// DATE FORMATTING
// =============================================================================

/**
 * Parse a date string safely
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null
  
  try {
    const parsed = parseISO(dateString)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Format date: "12 Jan 2026"
 */
export function formatDate(date: string | Date | null | undefined): string {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return '-'
  
  return format(parsed, 'd MMM yyyy', { locale: enGB })
}

/**
 * Format date with day: "Monday, 12 Jan 2026"
 */
export function formatDateFull(date: string | Date | null | undefined): string {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return '-'
  
  return format(parsed, 'EEEE, d MMM yyyy', { locale: enGB })
}

/**
 * Format date short: "12/01/26"
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return '-'
  
  return format(parsed, 'dd/MM/yy', { locale: enGB })
}

/**
 * Format datetime: "12 Jan 2026, 14:32"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return '-'
  
  return format(parsed, "d MMM yyyy, HH:mm", { locale: enGB })
}

/**
 * Format time only: "14:32"
 */
export function formatTime(date: string | Date | null | undefined): string {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return '-'
  
  return format(parsed, 'HH:mm', { locale: enGB })
}

/**
 * Format relative time: "2 hours ago", "in 3 days"
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return '-'
  
  return formatDistanceToNow(parsed, { addSuffix: true, locale: enGB })
}

/**
 * Format smart date: "Today", "Yesterday", "Monday", or "12 Jan"
 */
export function formatSmartDate(date: string | Date | null | undefined): string {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return '-'
  
  if (isToday(parsed)) return 'Today'
  if (isYesterday(parsed)) return 'Yesterday'
  if (isTomorrow(parsed)) return 'Tomorrow'
  
  const daysAgo = differenceInDays(new Date(), parsed)
  
  // Within last 7 days, show day name
  if (daysAgo > 0 && daysAgo < 7) {
    return format(parsed, 'EEEE', { locale: enGB })
  }
  
  // Otherwise show date
  return format(parsed, 'd MMM', { locale: enGB })
}

/**
 * Format duration between two dates
 */
export function formatDuration(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string {
  const startParsed = typeof start === 'string' ? parseDate(start) : start
  const endParsed = typeof end === 'string' ? parseDate(end) : end
  
  if (!startParsed || !endParsed || !isValid(startParsed) || !isValid(endParsed)) {
    return '-'
  }
  
  return formatDistance(startParsed, endParsed, { locale: enGB })
}

// =============================================================================
// TIME CALCULATIONS
// =============================================================================

/**
 * Get days pending (from date to now)
 */
export function getDaysPending(date: string | Date | null | undefined): number {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return 0
  
  return Math.max(0, differenceInDays(new Date(), parsed))
}

/**
 * Get hours pending
 */
export function getHoursPending(date: string | Date | null | undefined): number {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return 0
  
  return Math.max(0, differenceInHours(new Date(), parsed))
}

/**
 * Check if date is expired
 */
export function isExpired(date: string | Date | null | undefined): boolean {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return false
  
  return isPast(parsed)
}

/**
 * Check if date is upcoming
 */
export function isUpcoming(date: string | Date | null | undefined): boolean {
  const parsed = typeof date === 'string' ? parseDate(date) : date
  if (!parsed || !isValid(parsed)) return false
  
  return isFuture(parsed)
}

/**
 * Get expiry date (add days to now)
 */
export function getExpiryDate(days: number): Date {
  return addDays(new Date(), days)
}

// =============================================================================
// DATE RANGE HELPERS
// =============================================================================

export interface DateRange {
  start: Date
  end: Date
}

export function getTodayRange(): DateRange {
  const now = new Date()
  return {
    start: startOfDay(now),
    end: endOfDay(now)
  }
}

export function getThisWeekRange(): DateRange {
  const now = new Date()
  return {
    start: startOfWeek(now, { weekStartsOn: 1, locale: enGB }),
    end: endOfWeek(now, { weekStartsOn: 1, locale: enGB })
  }
}

export function getThisMonthRange(): DateRange {
  const now = new Date()
  return {
    start: startOfMonth(now),
    end: endOfMonth(now)
  }
}

// =============================================================================
// CURRENCY FORMATTING
// =============================================================================

/**
 * Format currency: "£1,234.56"
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'GBP'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-'
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format currency compact: "£1.2k"
 */
export function formatCurrencyCompact(
  amount: number | null | undefined,
  currency: string = 'GBP'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-'
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short'
  }).format(amount)
}

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

/**
 * Format number: "1,234"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }
  
  return new Intl.NumberFormat('en-GB').format(value)
}

/**
 * Format percentage: "85.5%"
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-'
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value / 100)
}

/**
 * Format hours: "24.5 hours" or "2.5 days"
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || isNaN(hours)) {
    return '-'
  }
  
  if (hours < 24) {
    return `${hours.toFixed(1)} hours`
  }
  
  const days = hours / 24
  return `${days.toFixed(1)} days`
}

// =============================================================================
// STRING FORMATTING
// =============================================================================

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Title case: "hello world" -> "Hello World"
 */
export function titleCase(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * Format initials: "John Smith" -> "JS"
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name) return ''
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, maxLength)
    .join('')
}

/**
 * Pluralize: "1 item", "2 items"
 */
export function pluralize(
  count: number,
  singular: string,
  plural?: string
): string {
  const pluralForm = plural || `${singular}s`
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`
}
