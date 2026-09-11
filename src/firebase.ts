export type LeaderboardEntry = {
  id: string
  initials: string
  score: number
  dayKey: string
  playedAt: string
}

export type LeaderboardResult = {
  entries: LeaderboardEntry[]
  backend: 'firebase' | 'local'
  note?: string
}

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim()
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim()
const localKey = 'horseguessr-local-leaderboard'
const anonymousAuthKey = 'horseguessr-anonymous-auth'
const pendingPhotoReportsKey = 'horseguessr-pending-photo-reports'
const submittedPhotoReportsKey = 'horseguessr-submitted-photo-reports'

export const firebaseConfigured = Boolean(projectId && apiKey)

function readLocalEntries(): LeaderboardEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(localKey) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function localLeaderboard(note?: string): LeaderboardResult {
  return {
    entries: readLocalEntries().sort((a, b) => b.score - a.score || a.playedAt.localeCompare(b.playedAt)).slice(0, 10),
    backend: 'local',
    note,
  }
}

function stringField(value: unknown) {
  return typeof value === 'object' && value && 'stringValue' in value ? String((value as { stringValue: unknown }).stringValue) : ''
}

function integerField(value: unknown) {
  return typeof value === 'object' && value && 'integerValue' in value ? Number((value as { integerValue: unknown }).integerValue) : 0
}

function timestampField(value: unknown) {
  return typeof value === 'object' && value && 'timestampValue' in value ? String((value as { timestampValue: unknown }).timestampValue) : ''
}

export async function fetchLeaderboard(): Promise<LeaderboardResult> {
  if (!firebaseConfigured) return localLeaderboard('Connect Firebase to share scores across players.')
  try {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey!)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'leaderboard' }],
          orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }],
          limit: 10,
        },
      }),
    })
    if (!response.ok) throw new Error(`Firestore returned ${response.status}`)
    const rows = await response.json() as Array<{ document?: { name: string; fields?: Record<string, unknown> } }>
    const entries = rows.flatMap(row => {
      if (!row.document?.fields) return []
      const fields = row.document.fields
      return [{
        id: row.document.name.split('/').pop() || crypto.randomUUID(),
        initials: stringField(fields.initials),
        score: integerField(fields.score),
        dayKey: stringField(fields.dayKey),
        playedAt: timestampField(fields.playedAt),
      }]
    })
    return { entries, backend: 'firebase' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Firebase is unavailable'
    return localLeaderboard(`${message}. Showing scores saved on this device.`)
  }
}

type AnonymousAuth = {
  idToken: string
  localId: string
  refreshToken: string
  expiresAt: number
}

let authRequest: Promise<AnonymousAuth> | null = null

function readAnonymousAuth(): AnonymousAuth | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(anonymousAuthKey) || 'null') as Partial<AnonymousAuth> | null
    if (!parsed || typeof parsed.idToken !== 'string' || typeof parsed.localId !== 'string' || typeof parsed.refreshToken !== 'string' || typeof parsed.expiresAt !== 'number') return null
    return parsed as AnonymousAuth
  } catch {
    return null
  }
}

function saveAnonymousAuth(auth: AnonymousAuth) {
  localStorage.setItem(anonymousAuthKey, JSON.stringify(auth))
  return auth
}

async function refreshAnonymousToken(auth: AnonymousAuth): Promise<AnonymousAuth> {
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: auth.refreshToken }),
  })
  if (!response.ok) throw new Error(`Anonymous token refresh returned ${response.status}`)
  const refreshed = await response.json() as { id_token: string; user_id: string; refresh_token: string; expires_in: string }
  return saveAnonymousAuth({
    idToken: refreshed.id_token,
    localId: refreshed.user_id,
    refreshToken: refreshed.refresh_token,
    expiresAt: Date.now() + Math.max(60, Number(refreshed.expires_in) - 60) * 1000,
  })
}

async function requestAnonymousToken(): Promise<AnonymousAuth> {
  const cached = readAnonymousAuth()
  if (cached && cached.expiresAt > Date.now()) return cached
  if (cached?.refreshToken) {
    try {
      return await refreshAnonymousToken(cached)
    } catch {
      localStorage.removeItem(anonymousAuthKey)
    }
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  })
  if (!response.ok) throw new Error(`Anonymous sign-in returned ${response.status}`)
  const created = await response.json() as { idToken: string; localId: string; refreshToken: string; expiresIn: string }
  return saveAnonymousAuth({
    idToken: created.idToken,
    localId: created.localId,
    refreshToken: created.refreshToken,
    expiresAt: Date.now() + Math.max(60, Number(created.expiresIn) - 60) * 1000,
  })
}

async function anonymousToken() {
  if (!authRequest) authRequest = requestAnonymousToken().finally(() => { authRequest = null })
  return authRequest
}

export async function recordBreedFavorite(breedId: string): Promise<void> {
  if (!firebaseConfigured) return
  try {
    const auth = await anonymousToken()
    const documentId = `${breedId}_${auth.localId}`
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents/breedHearts?documentId=${encodeURIComponent(documentId)}&key=${encodeURIComponent(apiKey!)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.idToken}` },
      body: JSON.stringify({ fields: {
        breedId: { stringValue: breedId },
        uid: { stringValue: auth.localId },
        heartedAt: { timestampValue: new Date().toISOString() },
      } }),
    })
    // A conflict means this browser has already contributed its one heart for the breed.
    if (!response.ok && response.status !== 409) throw new Error(`Favorite save returned ${response.status}`)
  } catch (error) {
    console.warn('HorseGuessr could not record this favorite for the future popularity count.', error)
  }
}

export type PhotoReportReason = 'not-loading' | 'horse-too-small' | 'person-visible' | 'not-color-photo' | 'wrong-breed' | 'other'

type PendingPhotoReport = {
  reportId: string
  photoId: string
  breedId: string
  photoUrl: string
  reason: PhotoReportReason
  reportedAt: string
}

function photoFingerprint(value: string) {
  let hash = 2166136261
  for (const char of value) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function readPendingPhotoReports(): PendingPhotoReport[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(pendingPhotoReportsKey) || '[]') as Array<Partial<PendingPhotoReport>>
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap(item => {
      if (!item.photoId || !item.breedId || !item.photoUrl || !item.reason || !item.reportedAt) return []
      return [{ ...item, reportId: item.reportId || crypto.randomUUID() } as PendingPhotoReport]
    })
  } catch {
    return []
  }
}

function writePendingPhotoReports(reports: PendingPhotoReport[]) {
  localStorage.setItem(pendingPhotoReportsKey, JSON.stringify(reports))
}

async function sendPhotoReport(report: PendingPhotoReport, auth: AnonymousAuth) {
  const documentId = report.reportId
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents/photoReports?documentId=${encodeURIComponent(documentId)}&key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.idToken}` },
    body: JSON.stringify({ fields: {
      photoId: { stringValue: report.photoId },
      breedId: { stringValue: report.breedId },
      photoUrl: { stringValue: report.photoUrl },
      reason: { stringValue: report.reason },
      reportedAt: { timestampValue: report.reportedAt },
    } }),
  })
  if (!response.ok && response.status !== 409) throw new Error(`Photo report returned ${response.status}`)
}

export async function recordPhotoQualityReport(breedId: string, photoUrl: string, reason: PhotoReportReason): Promise<'sent' | 'queued'> {
  const photoId = photoFingerprint(photoUrl)
  let submitted = new Set<string>()
  try {
    const saved = JSON.parse(localStorage.getItem(submittedPhotoReportsKey) || '[]')
    if (Array.isArray(saved)) submitted = new Set(saved.filter((id): id is string => typeof id === 'string'))
  } catch {
    // A malformed local cache should never block a new report.
  }
  if (submitted.has(photoId)) return 'sent'
  const report: PendingPhotoReport = {
    reportId: crypto.randomUUID(),
    photoId,
    breedId,
    photoUrl,
    reason,
    reportedAt: new Date().toISOString(),
  }
  const pending = readPendingPhotoReports()
  if (!pending.some(item => item.photoId === report.photoId)) pending.push(report)
  writePendingPhotoReports(pending)
  if (!firebaseConfigured) return 'queued'

  try {
    const auth = await anonymousToken()
    const remaining: PendingPhotoReport[] = []
    const sentPhotoIds: string[] = []
    for (const item of pending) {
      try {
        await sendPhotoReport(item, auth)
        sentPhotoIds.push(item.photoId)
      } catch {
        remaining.push(item)
      }
    }
    writePendingPhotoReports(remaining)
    sentPhotoIds.forEach(id => submitted.add(id))
    localStorage.setItem(submittedPhotoReportsKey, JSON.stringify([...submitted]))
    return remaining.some(item => item.photoId === report.photoId) ? 'queued' : 'sent'
  } catch {
    return 'queued'
  }
}

export type PhotoQualityReport = {
  id: string
  photoId: string
  breedId: string
  photoUrl: string
  reason: PhotoReportReason
  reportedAt: string
}

export async function fetchPhotoQualityReports(): Promise<PhotoQualityReport[]> {
  if (!firebaseConfigured) throw new Error('Firebase is not configured for this build.')
  const auth = await anonymousToken()
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.idToken}` },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'photoReports' }],
      orderBy: [{ field: { fieldPath: 'reportedAt' }, direction: 'DESCENDING' }],
      limit: 500,
    } }),
  })
  if (!response.ok) throw new Error(`Photo report list returned ${response.status}`)
  const rows = await response.json() as Array<{ document?: { name: string; fields?: Record<string, unknown> } }>
  return rows.flatMap(row => {
    if (!row.document?.fields) return []
    const fields = row.document.fields
    return [{
      id: row.document.name.split('/').pop() || crypto.randomUUID(),
      photoId: stringField(fields.photoId),
      breedId: stringField(fields.breedId),
      photoUrl: stringField(fields.photoUrl),
      reason: stringField(fields.reason) as PhotoReportReason,
      reportedAt: timestampField(fields.reportedAt),
    }]
  })
}

export async function submitLeaderboardScore(initials: string, score: number, dayKey: string): Promise<LeaderboardResult> {
  const playedAt = new Date().toISOString()
  if (!firebaseConfigured) {
    const entries = [...readLocalEntries(), { id: crypto.randomUUID(), initials, score, dayKey, playedAt }]
      .sort((a, b) => b.score - a.score || a.playedAt.localeCompare(b.playedAt))
      .slice(0, 10)
    localStorage.setItem(localKey, JSON.stringify(entries))
    return { entries, backend: 'local', note: 'Saved on this device. Connect Firebase to make the board public.' }
  }

  try {
    const auth = await anonymousToken()
    const documentId = `${dayKey}_${auth.localId}`
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents/leaderboard?documentId=${encodeURIComponent(documentId)}&key=${encodeURIComponent(apiKey!)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.idToken}` },
      body: JSON.stringify({ fields: {
        initials: { stringValue: initials },
        score: { integerValue: String(score) },
        dayKey: { stringValue: dayKey },
        uid: { stringValue: auth.localId },
        playedAt: { timestampValue: playedAt },
      } }),
    })
    if (!response.ok) throw new Error(`Score save returned ${response.status}`)
    return fetchLeaderboard()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Firebase is unavailable'
    const fallback = [...readLocalEntries(), { id: crypto.randomUUID(), initials, score, dayKey, playedAt }]
      .sort((a, b) => b.score - a.score || a.playedAt.localeCompare(b.playedAt))
      .slice(0, 10)
    localStorage.setItem(localKey, JSON.stringify(fallback))
    return { entries: fallback, backend: 'local', note: `${message}. The score was saved on this device instead.` }
  }
}
