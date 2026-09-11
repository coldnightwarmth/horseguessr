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

async function anonymousToken() {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  })
  if (!response.ok) throw new Error(`Anonymous sign-in returned ${response.status}`)
  return response.json() as Promise<{ idToken: string; localId: string }>
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
