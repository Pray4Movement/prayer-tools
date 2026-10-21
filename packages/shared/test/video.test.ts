import { describe, expect, it } from 'vitest'
import { videoEmbed } from '../src/video'

describe('videoEmbed', () => {
  it('turns YouTube links into the privacy-enhanced player', () => {
    const src = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    expect(videoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({ kind: 'youtube', src })
    expect(videoEmbed('https://youtu.be/dQw4w9WgXcQ?si=abc')).toEqual({ kind: 'youtube', src })
    expect(videoEmbed('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toEqual({ kind: 'youtube', src })
    expect(videoEmbed('https://www.youtube.com/embed/dQw4w9WgXcQ')).toEqual({ kind: 'youtube', src })
    expect(videoEmbed('https://www.youtube.com/live/dQw4w9WgXcQ')).toEqual({ kind: 'youtube', src })
  })

  it('keeps a YouTube start time', () => {
    expect(videoEmbed('https://youtu.be/dQw4w9WgXcQ?t=90')?.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=90')
    expect(videoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m5s')?.src).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=65')
  })

  it('turns Vimeo links into the Vimeo player, keeping the unlisted hash', () => {
    expect(videoEmbed('https://vimeo.com/76979871')).toEqual({ kind: 'vimeo', src: 'https://player.vimeo.com/video/76979871' })
    expect(videoEmbed('https://vimeo.com/76979871/a1b2c3d4e5')).toEqual({ kind: 'vimeo', src: 'https://player.vimeo.com/video/76979871?h=a1b2c3d4e5' })
    expect(videoEmbed('https://vimeo.com/channels/staffpicks/76979871')?.src).toBe('https://player.vimeo.com/video/76979871')
    expect(videoEmbed('https://player.vimeo.com/video/76979871?h=abc123')?.src).toBe('https://player.vimeo.com/video/76979871?h=abc123')
  })

  it('plays video files directly', () => {
    expect(videoEmbed('https://cdn.example.org/pt-videos/abc.mp4')).toEqual({ kind: 'file', src: 'https://cdn.example.org/pt-videos/abc.mp4' })
    expect(videoEmbed('http://localhost:3030/uploads/abc.webm')?.kind).toBe('file')
  })

  it('rejects anything else', () => {
    expect(videoEmbed('')).toBeNull()
    expect(videoEmbed(undefined)).toBeNull()
    expect(videoEmbed('not a url')).toBeNull()
    expect(videoEmbed('javascript:alert(1)//x.mp4')).toBeNull()
    expect(videoEmbed('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(videoEmbed('https://vimeo.com/about')).toBeNull()
    expect(videoEmbed('https://example.org/page')).toBeNull()
  })
})
