export const MARKETING_PERMISSIONS = [
  // Open Site email: see emails, their results and audiences.
  'marketing.access',
  // Write, test, schedule, send, pause and cancel emails.
  'marketing.send'
] as const

export type MarketingPermission = typeof MARKETING_PERMISSIONS[number]

export const MARKETING_PERMISSION_META: Record<MarketingPermission, { title: string, description: string }> = {
  'marketing.access': { title: 'View site email', description: 'See site emails, their results and audience sizes.' },
  'marketing.send': { title: 'Send site email', description: 'Write, test, schedule, send, pause and cancel site emails.' }
}

export const MARKETING_DEFAULT_GRANTS: Record<'member' | 'admin', MarketingPermission[]> = {
  member: [],
  admin: [...MARKETING_PERMISSIONS]
}

declare module '#permissions' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface PermissionRegistry extends Record<MarketingPermission, true> {}
}
