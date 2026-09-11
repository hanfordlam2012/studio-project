function studioPostMedia(link) {
  const value = String(link || '').trim()
  if (!value) return null

  let url
  try {
    url = new URL(value)
  } catch (error) {
    return {type: 'link', url: value}
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  let youtubeId = ''
  if (host === 'youtu.be') youtubeId = url.pathname.split('/').filter(Boolean)[0] || ''
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    const pathMatch = url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)
    youtubeId = url.searchParams.get('v') || (pathMatch && pathMatch[1]) || ''
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return {type: 'youtube', id: youtubeId, url: value}

  const extensionMatch = url.pathname.match(/\.([a-z0-9]+)$/i)
  const extension = extensionMatch && extensionMatch[1].toLowerCase()
  if (['mp3', 'm4a', 'wav', 'ogg', 'oga'].includes(extension)) return {type: 'audio', url: value}
  if (['mp4', 'webm'].includes(extension)) return {type: 'video', url: value}
  return {type: 'link', url: value}
}

module.exports = studioPostMedia
