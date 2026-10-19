// Branded emails sent to intercessors on behalf of a site. Each builder
// returns subject, HTML and text; `layout` wraps content in the site's
// branding with the footer every site email carries.
import { brandColor } from '../colors'
import { platformConfig, platformOrigin } from '../config'
import type { Tx } from '../db/scope'
import type { SiteBranding, SiteEmailIdentity } from '../db/schema'
import { emailT } from '../i18n/email'
import { languageDir } from '../languages'
import { siteUrlFor } from '../site'
import { siteInboxAddress } from '../inbox'
import { escapeHtml } from '../tiptap'

export interface SiteMailContext {
  orgId: string
  slug: string
  siteName: string
  siteUrl: string
  color: string
  textOnColor: string
  logoUrl: string | null
  fromName: string
  fromLocal: string
  replyTo: string | null
  signature: Record<string, string>
  defaultLanguage: string
}

// Loads what site emails need. Runs inside the site's org.
export async function loadSiteMailContext(tx: Tx, orgId: string): Promise<SiteMailContext> {
  const org = await tx.selectFrom('orgs').select(['slug', 'name']).where('id', '=', orgId).executeTakeFirstOrThrow()
  const site = await tx.selectFrom('pt_site').select(['branding', 'email_identity', 'default_language']).where('org_id', '=', orgId).executeTakeFirstOrThrow()
  const branding = (site.branding ?? {}) as SiteBranding
  const identity = (site.email_identity ?? {}) as SiteEmailIdentity
  const bc = brandColor(branding.color)
  const signature: Record<string, string> = {}
  if (identity.signature) for (const [l, v] of Object.entries(identity.signature.values)) signature[l] = v
  return {
    orgId,
    slug: org.slug,
    siteName: org.name,
    siteUrl: await siteUrlFor(tx, orgId, org.slug),
    color: bc.color,
    textOnColor: bc.textColor,
    logoUrl: identity.logo_url ?? branding.logo_url ?? null,
    fromName: identity.from_name || org.name,
    fromLocal: identity.from_local || org.slug,
    // A reply-to the site chose, else the site's inbox.
    replyTo: identity.reply_to || await siteInboxAddress(tx, org.slug),
    signature,
    defaultLanguage: site.default_language
  }
}

export interface Rendered {
  subject: string
  html: string
  text: string
}

export interface FooterLinks {
  manageUrl?: string | null
  unsubscribeUrl?: string | null
  reason?: string
}

export function button(ctx: SiteMailContext, href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${ctx.color};color:${ctx.textOnColor};padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">${escapeHtml(label)}</a></p>`
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${escapeHtml(text)}</p>`
}

export function layout(ctx: SiteMailContext, lang: string, bodyHtml: string, footer: FooterLinks = {}, opts: { test?: boolean } = {}): string {
  const dir = languageDir(lang)
  const header = ctx.logoUrl
    ? `<img src="${escapeHtml(ctx.logoUrl)}" alt="${escapeHtml(ctx.siteName)}" style="max-height:48px;max-width:220px;" />`
    : `<span style="font-size:20px;font-weight:700;color:${ctx.textOnColor};">${escapeHtml(ctx.siteName)}</span>`
  const signature = ctx.signature[lang] || ctx.signature[ctx.defaultLanguage] || ''
  const links: string[] = []
  if (footer.manageUrl) links.push(`<a href="${escapeHtml(footer.manageUrl)}" style="color:#52525b;">${escapeHtml(emailT(lang, 'footer.manage'))}</a>`)
  links.push(`<a href="${escapeHtml(`${platformOrigin()}/my`)}" style="color:#52525b;">${escapeHtml(emailT(lang, 'footer.my'))}</a>`)
  if (footer.unsubscribeUrl) links.push(`<a href="${escapeHtml(footer.unsubscribeUrl)}" style="color:#52525b;">${escapeHtml(emailT(lang, 'footer.unsubscribe'))}</a>`)
  const testBanner = opts.test
    ? `<div style="background:#fef3c7;color:#78350f;padding:10px 16px;font-size:13px;">${escapeHtml(emailT(lang, 'test.banner'))}</div>`
    : ''
  return `<!doctype html>
<html lang="${escapeHtml(lang)}" dir="${dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(ctx.siteName)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
${testBanner ? `<tr><td>${testBanner}</td></tr>` : ''}
<tr><td style="background:${ctx.color};padding:20px 28px;" dir="${dir}">${header}</td></tr>
<tr><td style="padding:28px;" dir="${dir}">${bodyHtml}${signature ? `<div style="margin-top:24px;color:#3f3f46;font-size:15px;white-space:pre-line;">${escapeHtml(signature)}</div>` : ''}</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #e4e4e7;font-size:12px;line-height:1.6;color:#71717a;" dir="${dir}">
<p style="margin:0 0 8px;">${escapeHtml(footer.reason ?? emailT(lang, 'footer.why', { site: ctx.siteName }))}</p>
<p style="margin:0;">${links.join(' · ')}</p>
<p style="margin:8px 0 0;"><a href="${escapeHtml(platformConfig().donateUrl)}" style="color:#71717a;">${escapeHtml(emailT(lang, 'footer.give'))}</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`
}

function footerText(ctx: SiteMailContext, lang: string, footer: FooterLinks): string {
  const lines = ['', '—', footer.reason ?? emailT(lang, 'footer.why', { site: ctx.siteName })]
  if (footer.manageUrl) lines.push(`${emailT(lang, 'footer.manage')}: ${footer.manageUrl}`)
  lines.push(`${emailT(lang, 'footer.my')}: ${platformOrigin()}/my`)
  if (footer.unsubscribeUrl) lines.push(`${emailT(lang, 'footer.unsubscribe')}: ${footer.unsubscribeUrl}`)
  return lines.join('\n')
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;">${escapeHtml(text)}</h1>`
}

// ── Messages ───────────────────────────────────────────────────────────────

export function verificationEmail(ctx: SiteMailContext, lang: string, verifyUrl: string, opts: { test?: boolean } = {}): Rendered {
  const vars = { site: ctx.siteName }
  const body = heading(emailT(lang, 'verify.heading'))
    + paragraph(emailT(lang, 'verify.body', vars))
    + button(ctx, verifyUrl, emailT(lang, 'verify.button'))
    + `<p style="margin:0;font-size:13px;color:#71717a;">${escapeHtml(emailT(lang, 'verify.ignore'))}</p>`
  return {
    subject: emailT(lang, 'verify.subject', vars),
    html: layout(ctx, lang, body, {}, opts),
    text: `${emailT(lang, 'verify.heading')}\n\n${emailT(lang, 'verify.body', vars)}\n\n${emailT(lang, 'verify.button')}: ${verifyUrl}\n\n${emailT(lang, 'verify.ignore')}${footerText(ctx, lang, {})}`
  }
}

export interface ReminderDetails {
  campaignName: string
  day: number | null
  minutes: number | null
  prayUrl: string
  manageUrl: string
  unsubscribeUrl: string
}

// Reminders link to the day's prayer content; they never contain it.
export function reminderEmail(ctx: SiteMailContext, lang: string, d: ReminderDetails, opts: { test?: boolean } = {}): Rendered {
  const vars = { site: ctx.siteName, campaign: d.campaignName }
  const meta = [
    d.day ? emailT(lang, 'reminder.day', { day: d.day }) : null,
    d.minutes ? emailT(lang, 'reminder.duration', { minutes: d.minutes }) : null
  ].filter(Boolean).join(' · ')
  const body = heading(emailT(lang, 'reminder.heading'))
    + paragraph(emailT(lang, 'reminder.body', vars))
    + (meta ? `<p style="margin:0 0 8px;color:#52525b;font-size:14px;">${escapeHtml(meta)}</p>` : '')
    + button(ctx, d.prayUrl, emailT(lang, 'reminder.button'))
  return {
    subject: emailT(lang, 'reminder.subject', vars),
    html: layout(ctx, lang, body, { manageUrl: d.manageUrl, unsubscribeUrl: d.unsubscribeUrl }, opts),
    text: `${emailT(lang, 'reminder.heading')}\n\n${emailT(lang, 'reminder.body', vars)}${meta ? `\n${meta}` : ''}\n\n${emailT(lang, 'reminder.button')}: ${d.prayUrl}${footerText(ctx, lang, { manageUrl: d.manageUrl, unsubscribeUrl: d.unsubscribeUrl })}`
  }
}

export function checkinEmail(ctx: SiteMailContext, lang: string, urls: { yes: string, sometimes: string, no: string, manageUrl: string, unsubscribeUrl: string }, opts: { reminder?: boolean, test?: boolean } = {}): Rendered {
  const vars = { site: ctx.siteName }
  const body = heading(emailT(lang, 'checkin.heading'))
    + paragraph(emailT(lang, 'checkin.body', vars))
    + button(ctx, urls.yes, emailT(lang, 'checkin.yes'))
    + `<p style="margin:0 0 12px;"><a href="${escapeHtml(urls.sometimes)}" style="color:${ctx.color};font-weight:600;">${escapeHtml(emailT(lang, 'checkin.sometimes'))}</a></p>`
    + `<p style="margin:0 0 12px;"><a href="${escapeHtml(urls.no)}" style="color:#52525b;">${escapeHtml(emailT(lang, 'checkin.no'))}</a></p>`
  return {
    subject: emailT(lang, opts.reminder ? 'checkin.reminder_subject' : 'checkin.subject', vars),
    html: layout(ctx, lang, body, { manageUrl: urls.manageUrl, unsubscribeUrl: urls.unsubscribeUrl }, opts),
    text: `${emailT(lang, 'checkin.heading')}\n\n${emailT(lang, 'checkin.body', vars)}\n\n${emailT(lang, 'checkin.yes')}: ${urls.yes}\n${emailT(lang, 'checkin.sometimes')}: ${urls.sometimes}\n${emailT(lang, 'checkin.no')}: ${urls.no}${footerText(ctx, lang, urls)}`
  }
}

export interface ThanksDetails {
  campaignName: string
  personal: boolean
  prayers: number
  minutes: number
  message: string | null
  cta: { label: string, url: string } | null
  manageUrl: string | null
  unsubscribeUrl: string | null
}

export function thankYouEmail(ctx: SiteMailContext, lang: string, d: ThanksDetails, opts: { test?: boolean } = {}): Rendered {
  const vars = { site: ctx.siteName, campaign: d.campaignName }
  const bodyKey = d.personal ? 'thanks.body_personal' : 'thanks.body'
  const stats = d.prayers > 0 ? emailT(lang, 'thanks.stats', { prayers: d.prayers, minutes: d.minutes }) : null
  const body = heading(emailT(lang, 'thanks.heading'))
    + paragraph(emailT(lang, bodyKey, vars))
    + (stats ? paragraph(stats) : '')
    + (d.message ? `<div style="margin:0 0 16px;font-size:16px;line-height:1.6;white-space:pre-line;">${escapeHtml(d.message)}</div>` : '')
    + (d.cta ? button(ctx, d.cta.url, d.cta.label) : '')
  return {
    subject: emailT(lang, 'thanks.subject', vars),
    html: layout(ctx, lang, body, { manageUrl: d.manageUrl, unsubscribeUrl: d.unsubscribeUrl }, opts),
    text: [emailT(lang, 'thanks.heading'), '', emailT(lang, bodyKey, vars), stats ?? '', d.message ?? '', d.cta ? `${d.cta.label}: ${d.cta.url}` : ''].filter(Boolean).join('\n\n')
      + footerText(ctx, lang, { manageUrl: d.manageUrl, unsubscribeUrl: d.unsubscribeUrl })
  }
}

export function manageLinkEmail(ctx: SiteMailContext, lang: string, manageUrl: string): Rendered {
  const vars = { site: ctx.siteName }
  const body = heading(emailT(lang, 'manage.heading')) + paragraph(emailT(lang, 'manage.body', vars)) + button(ctx, manageUrl, emailT(lang, 'manage.button'))
  return {
    subject: emailT(lang, 'manage.subject', vars),
    html: layout(ctx, lang, body),
    text: `${emailT(lang, 'manage.heading')}\n\n${emailT(lang, 'manage.body', vars)}\n\n${manageUrl}${footerText(ctx, lang, {})}`
  }
}

export function acknowledgementEmail(ctx: SiteMailContext, lang: string, kind: 'contact' | 'story'): Rendered {
  const vars = { site: ctx.siteName }
  const body = paragraph(emailT(lang, `${kind}.body`, vars))
  return {
    subject: emailT(lang, `${kind}.subject`, vars),
    html: layout(ctx, lang, body, { reason: emailT(lang, `${kind}.body`, vars) }),
    text: emailT(lang, `${kind}.body`, vars)
  }
}

// The My prayer link is a platform email (no site branding).
// With `minutes`, the expiry is worded in minutes instead of hours.
export function myPrayerEmail(lang: string, url: string, hours: number, minutes?: number): Rendered {
  const ctx: SiteMailContext = {
    orgId: '', slug: '', siteName: 'Prayer.Tools', siteUrl: platformOrigin(), color: '#2f6f5e', textOnColor: '#ffffff',
    logoUrl: null, fromName: 'Prayer.Tools', fromLocal: 'my', replyTo: null, signature: {}, defaultLanguage: 'en'
  }
  const bodyText = minutes ? emailT(lang, 'my.body_minutes', { minutes }) : emailT(lang, 'my.body', { hours })
  const body = heading(emailT(lang, 'my.heading')) + paragraph(bodyText) + button(ctx, url, emailT(lang, 'my.button'))
  return {
    subject: emailT(lang, 'my.subject'),
    html: layout(ctx, lang, body, { reason: bodyText }),
    text: `${emailT(lang, 'my.heading')}\n\n${bodyText}\n\n${url}`
  }
}

