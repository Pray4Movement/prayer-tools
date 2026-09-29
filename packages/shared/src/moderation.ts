// A light check on site names and slugs, as today's signup flow does. It
// catches obvious abuse; operators handle the rest through reports.
const BLOCKED = [
  'fuck', 'shit', 'cunt', 'bitch', 'nigger', 'faggot', 'porn', 'xxx', 'casino', 'viagra', 'cialis',
  'bitcoin', 'escort', 'hentai'
]

export function containsBlockedWord(text: string): boolean {
  const t = text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/\$/g, 's')
  const compact = t.replace(/[^a-z]/g, '')
  return BLOCKED.some(w => compact.includes(w))
}
