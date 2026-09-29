// The one email transport: every mail the platform sends (reminders,
// transactional, site marketing) goes through `sendMail`. Reminders and
// transactional mail use one sending domain, marketing another, so a bad
// marketing send can't hurt reminder delivery. Providers: Mailgun (HTTP API)
// in production, SMTP (Mailpit on localhost:1025) in development, or `log`.
import nodemailer, { type Transporter } from 'nodemailer'

export type MailStream = 'transactional' | 'marketing'

export interface OutgoingMail {
  stream: MailStream
  to: string
  fromName: string
  // Local part on the stream's sending domain; defaults to `noreply`.
  fromLocal?: string
  replyTo?: string | null
  subject: string
  html: string
  text: string
  // One-click unsubscribe (RFC 8058): List-Unsubscribe + List-Unsubscribe-Post.
  unsubscribeUrl?: string | null
  messageId?: string
  inReplyTo?: string
  references?: string
  headers?: Record<string, string>
  // Provider metadata echoed back on webhooks (org id, kind, …).
  meta?: Record<string, string>
  tags?: string[]
}

export interface SendResult {
  id: string | null
}

function env(name: string, fallback = ''): string {
  const v = process.env[name]
  return v === undefined || v === '' ? fallback : v
}

export function mailProvider(): 'mailgun' | 'smtp' | 'log' {
  const p = env('MAIL_PROVIDER', env('MAILGUN_API_KEY') ? 'mailgun' : 'smtp')
  return p === 'mailgun' || p === 'log' ? p : 'smtp'
}

export function sendingDomain(stream: MailStream): string {
  return stream === 'marketing'
    ? env('MAIL_DOMAIN_MARKETING', env('MAIL_DOMAIN_TRANSACTIONAL', 'news.localhost'))
    : env('MAIL_DOMAIN_TRANSACTIONAL', 'mail.localhost')
}

function cleanName(name: string): string {
  return name.replace(/["<>\r\n]/g, '').trim().slice(0, 80) || 'Prayer.Tools'
}

export function fromHeader(mail: Pick<OutgoingMail, 'stream' | 'fromName' | 'fromLocal'>): string {
  const local = (mail.fromLocal ?? 'noreply').toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'noreply'
  return `"${cleanName(mail.fromName)}" <${local}@${sendingDomain(mail.stream)}>`
}

function buildHeaders(mail: OutgoingMail): Record<string, string> {
  const headers: Record<string, string> = { ...(mail.headers ?? {}) }
  if (mail.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${mail.unsubscribeUrl}>`
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
  }
  if (mail.inReplyTo) headers['In-Reply-To'] = mail.inReplyTo
  if (mail.references) headers.References = mail.references
  return headers
}

let smtp: Transporter | null = null
function smtpTransport(): Transporter {
  if (!smtp) {
    smtp = nodemailer.createTransport({
      host: env('SMTP_HOST', 'localhost'),
      port: Number(env('SMTP_PORT', '1025')),
      secure: env('SMTP_SECURE') === 'true',
      auth: env('SMTP_USER') ? { user: env('SMTP_USER'), pass: env('SMTP_PASS') } : undefined,
      tls: { rejectUnauthorized: false }
    })
  }
  return smtp
}

async function sendMailgun(mail: OutgoingMail): Promise<SendResult> {
  const apiKey = env('MAILGUN_API_KEY')
  const domain = sendingDomain(mail.stream)
  if (!apiKey) throw new Error('MAILGUN_API_KEY is not set')
  const form = new FormData()
  form.append('from', fromHeader(mail))
  form.append('to', mail.to)
  form.append('subject', mail.subject)
  form.append('html', mail.html)
  form.append('text', mail.text)
  if (mail.replyTo) form.append('h:Reply-To', mail.replyTo)
  if (mail.messageId) form.append('h:Message-Id', mail.messageId)
  for (const [k, v] of Object.entries(buildHeaders(mail))) form.append(`h:${k}`, v)
  for (const t of mail.tags ?? []) form.append('o:tag', t)
  if (mail.meta) form.append('h:X-Mailgun-Variables', JSON.stringify({ ...mail.meta, stream: mail.stream }))
  const host = env('MAILGUN_HOST', 'api.mailgun.net')
  const res = await fetch(`https://${host}/v3/${domain}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}` },
    body: form
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    const err = new Error(`Mailgun ${res.status}: ${body.slice(0, 300)}`) as Error & { retryable?: boolean }
    err.retryable = res.status >= 500 || res.status === 429
    throw err
  }
  const json = await res.json().catch(() => ({})) as { id?: string }
  return { id: json.id ?? null }
}

async function sendSmtp(mail: OutgoingMail): Promise<SendResult> {
  const info = await smtpTransport().sendMail({
    from: fromHeader(mail),
    to: mail.to,
    replyTo: mail.replyTo ?? undefined,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    messageId: mail.messageId,
    headers: {
      ...buildHeaders(mail),
      ...(mail.meta ? { 'X-PT-Meta': JSON.stringify({ ...mail.meta, stream: mail.stream }) } : {})
    }
  })
  return { id: info.messageId ?? null }
}

export async function sendMail(mail: OutgoingMail): Promise<SendResult> {
  switch (mailProvider()) {
    case 'mailgun':
      return await sendMailgun(mail)
    case 'log':
      console.log(`[mail:${mail.stream}] to=${mail.to} subject=${JSON.stringify(mail.subject)}`)
      return { id: null }
    default:
      return await sendSmtp(mail)
  }
}
