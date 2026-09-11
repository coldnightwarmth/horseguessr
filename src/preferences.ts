const ONE_YEAR = 60 * 60 * 24 * 365

export const cookieNames = {
  initials: 'hg_initials',
  personalBest: 'hg_personal_best',
  dailyAttempt: 'hg_daily_attempt',
  dailyStreak: 'hg_daily_streak',
  dailyStreakDay: 'hg_daily_streak_day',
  favorites: 'hg_favorite_breeds',
  passport: 'hg_breed_passport',
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

export function readPassportIds() {
  try {
    const ids = JSON.parse(readCookie(cookieNames.passport) || '[]')
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writePassportIds(ids: string[]) {
  writeCookie(cookieNames.passport, JSON.stringify([...new Set(ids)]))
}

export function readDailyStreak() {
  return Math.max(0, Number(readCookie(cookieNames.dailyStreak) || 0) || 0)
}

export function updateDailyStreak(dayKey: string) {
  const lastDay = readCookie(cookieNames.dailyStreakDay)
  const current = readDailyStreak()
  if (lastDay === dayKey) return current
  const elapsedDays = lastDay
    ? Math.round((Date.parse(`${dayKey}T00:00:00Z`) - Date.parse(`${lastDay}T00:00:00Z`)) / 86_400_000)
    : Number.NaN
  const next = elapsedDays === 1 ? current + 1 : 1
  writeCookie(cookieNames.dailyStreak, String(next))
  writeCookie(cookieNames.dailyStreakDay, dayKey)
  return next
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
