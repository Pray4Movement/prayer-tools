// Opens an inbox thread from the public site (contact form, story). Follows
// the inbox layer's data contract: a conversation keyed on the sender's
// crm_channels row, with one inbound message. The champion replies from the
// admin app's inbox; the inbox layer's send sweep delivers the reply.
import { randomBytes, randomUUID } from 'node:crypto'
import { sql } from 'kysely'
import { platformConfig } from './config'
import type { Tx } from './db/scope'
import { escapeHtml } from './tiptap'

// The site's inbox address, where replies to its email reach an inbox thread:
// the inbox's contact-address setting when the site set one, else
// `<slug>@<inbox domain>` when every site shares the inbound domain. Runs
// inside the site's org.
export async function siteInboxAddress(tx: Tx, slug: string): Promise<string | null> {
  const row = await sql<{ value: unknown }>`
    select value from core_settings where namespace = 'inbox' and key = 'contact_address'
  `.execute(tx)
  const set = typeof row.rows[0]?.value === 'string' ? (row.rows[0].value as string).trim().toLowerCase() : ''
  if (set) return set
  const { domain, slugAddresses } = platformConfig().inbox
  return slugAddresses && domain ? `${slug}@${domain}` : null
}

export interface InboundThreadInput {
  channelId: string
  fromEmail: string
  fromName: string | null
  subject: string
  body: string
  source: 'contact_form' | 'story'
  tags?: string[]
}

export async function openInboxThread(tx: Tx, input: InboundThreadInput): Promise<{ conversationId: string }> {
  const now = new Date()
  const conversation = await tx
    .insertInto('inbox_conversations')
    .values({
      channel_id: input.channelId,
      subject: input.subject.slice(0, 300),
      status: 'open',
      reply_token: randomBytes(10).toString('hex'),
      needs_review: false,
      source: input.source,
      counterparty_name: input.fromName,
      last_message_at: now,
      last_message_direction: 'inbound',
      tags: input.tags ?? []
    })
    .returning('id')
    .executeTakeFirstOrThrow()
  const html = input.body
    .split(/\n{2,}/)
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
  await tx
    .insertInto('inbox_messages')
    .values({
      conversation_id: conversation.id,
      direction: 'inbound',
      status: 'received',
      from_email: input.fromEmail,
      from_name: input.fromName,
      subject: input.subject.slice(0, 300),
      body_html: html,
      body_stripped_html: html,
      body_text: input.body,
      email_message_id: `<pt-${input.source}-${randomUUID()}@prayer.tools>`,
      authenticated: false
    })
    .execute()
  return { conversationId: conversation.id }
}
