export function normalizeReaderUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') return null

  try {
    const url = new URL(value.trim())
    const carriesPrivateData = Boolean(url.username || url.password || url.search || url.hash)
    if (url.protocol !== 'https:' || carriesPrivateData) return null
    return url.href
  } catch {
    return null
  }
}

export function readerBeaconUrl(value) {
  const readerUrl = normalizeReaderUrl(value)
  if (!readerUrl) return null
  return new URL('/__hit/github-pages.gif', readerUrl).href
}

async function configureReaderLink() {
  const link = document.querySelector('#reader-link')
  const status = document.querySelector('#reader-status')
  if (!(link instanceof HTMLAnchorElement) || !(status instanceof HTMLElement)) return

  try {
    const response = await fetch('./reader.json', { cache: 'no-store', credentials: 'omit' })
    if (!response.ok) throw new Error('Reader configuration unavailable')

    const config = await response.json()
    const readerUrl = normalizeReaderUrl(config.readerUrl)
    if (!readerUrl) return

    link.href = readerUrl
    link.textContent = `Open ${config.edition || 'the full reader'} →`
    link.classList.remove('button--disabled')
    link.removeAttribute('aria-disabled')
    link.rel = 'noreferrer'
    status.textContent = config.availabilityNote || 'Windows-hosted reader; availability depends on the host machine.'

    const beaconUrl = config.countLandingVisits === true ? readerBeaconUrl(readerUrl) : null
    if (beaconUrl) {
      fetch(beaconUrl, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    status.textContent = 'Reader configuration is unavailable. The verified context downloads remain online.'
  }
}

if (typeof document !== 'undefined') {
  configureReaderLink()
}
