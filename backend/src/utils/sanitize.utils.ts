import sanitizeHtml from 'sanitize-html'

/**
 * Sanitization utilities for preventing XSS attacks
 *
 * Usage:
 * - sanitizeText(): For plain text fields (name, email, etc.)
 * - sanitizeRichText(): For rich text fields (comments, descriptions)
 */

/**
 * Sanitize plain text input (removes ALL HTML tags)
 * Use for: names, emails, short text fields
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return ''

  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
  }).trim()
}

/**
 * Sanitize rich text input (allows safe HTML tags only)
 * Use for: feedback messages, descriptions, comments
 */
export function sanitizeRichText(input: string | undefined | null): string {
  if (!input) return ''

  return sanitizeHtml(input, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    allowedAttributes: {
      'a': ['href']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard'
  }).trim()
}

/**
 * Sanitize array of strings
 */
export function sanitizeArray(input: string[] | undefined | null): string[] {
  if (!input || !Array.isArray(input)) return []

  return input.map(item => sanitizeText(item)).filter(item => item.length > 0)
}

/**
 * Sanitize object with string values
 */
export function sanitizeObject<T extends Record<string, any>>(
  input: T,
  fields: (keyof T)[]
): T {
  const sanitized = { ...input }

  for (const field of fields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeText(sanitized[field] as string) as T[keyof T]
    }
  }

  return sanitized
}
