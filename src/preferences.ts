const ONE_YEAR = 60 * 60 * 24 * 365

export const cookieNames = {
  initials: 'hg_initials',
  personalBest: 'hg_personal_best',
  dailyAttempt: 'hg_daily_attempt',
  favorites: 'hg_favorite_breeds',
  cookieNotice: 'hg_cookie_notice',
} as const

export function readCookie(name: string) {
  if (typeof document === 'undefined') return ''
  const prefix = `${encodeURIComponent(name)}=`
  const match = document.cookie.split('; ').find(item => item.startsWith(prefix))
  return match ? decodeURIComponent(match.slice(prefix.length)) : ''
}

export function writeCookie(name: string, value: string, maxAge = ONE_YEAR) {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`
}

export function readFavoriteIds() {
  try {
    const ids = JSON.parse(readCookie(cookieNames.favorites) || '[]')
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writeFavoriteIds(ids: string[]) {
  writeCookie(cookieNames.favorites, JSON.stringify([...new Set(ids)]))
}

export function readPersonalBest() {
  return Number(readCookie(cookieNames.personalBest) || 0)
}

export function updatePersonalBest(score: number) {
  const best = Math.max(score, readPersonalBest())
  writeCookie(cookieNames.personalBest, String(best))
  return best
}

export function sanitizeInitials(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
}
