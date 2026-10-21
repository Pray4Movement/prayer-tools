// Video links for landing sections: a YouTube or Vimeo page link becomes that
// service's player URL; a link to an .mp4, .webm or .mov file (an upload or
// any web address) plays in the browser's own player.
export type VideoEmbed = { kind: 'youtube' | 'vimeo', src: string } | { kind: 'file', src: string }

const YOUTUBE_ID = /^[\w-]{11}$/

function youtubeStart(u: URL): number | null {
  const raw = u.searchParams.get('t') ?? u.searchParams.get('start')
  if (!raw) return null
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(raw)
  if (!m || !m[0]) return null
  const secs = Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
  return secs > 0 ? secs : null
}

function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^(www\.|m\.)/, '')
  if (host === 'youtu.be') return u.pathname.split('/')[1] ?? null
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return null
  if (u.pathname === '/watch') return u.searchParams.get('v')
  const m = /^\/(?:embed|shorts|live|v)\/([^/]+)/.exec(u.pathname)
  return m?.[1] ?? null
}

function vimeo(u: URL): { id: string, hash: string | null } | null {
  const host = u.hostname.replace(/^www\./, '')
  if (host === 'player.vimeo.com') {
    const m = /^\/video\/(\d+)/.exec(u.pathname)
    return m ? { id: m[1]!, hash: u.searchParams.get('h') } : null
  }
  if (host !== 'vimeo.com') return null
  const parts = u.pathname.split('/').filter(Boolean)
  const i = parts.findIndex(p => /^\d+$/.test(p))
  if (i < 0) return null
  const next = parts[i + 1]
  return { id: parts[i]!, hash: next && /^[0-9a-f]+$/i.test(next) ? next : u.searchParams.get('h') }
}

export function videoEmbed(url: string | null | undefined): VideoEmbed | null {
  if (typeof url !== 'string' || !url.trim()) return null
  let u: URL
  try {
    u = new URL(url.trim())
  } catch {
    return null
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const yt = youtubeId(u)
  if (yt && YOUTUBE_ID.test(yt)) {
    const start = youtubeStart(u)
    return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt}${start ? `?start=${start}` : ''}` }
  }
  const vm = vimeo(u)
  if (vm) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vm.id}${vm.hash ? `?h=${encodeURIComponent(vm.hash)}` : ''}` }
  if (/\.(mp4|m4v|webm|mov)$/i.test(u.pathname)) return { kind: 'file', src: u.toString() }
  return null
}
