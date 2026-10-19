import type { H3Event } from 'h3'
import { requestHost } from './request'

// Analytics posts must come from pages on this same host.
export function sameOrigin(event: H3Event): void {
  const source = getRequestHeader(event, 'origin') || getRequestHeader(event, 'referer')
  let host = ''
  try {
    host = source ? new URL(source).host.toLowerCase() : ''
  } catch {
    host = ''
  }
  if (!host || host !== requestHost(event)) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
}
