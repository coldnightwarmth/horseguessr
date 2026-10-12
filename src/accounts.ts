import { clearFirebaseSession, firebaseConfigured, firebaseSession, FirebaseSession, readFirebaseSession, saveFirebaseSession } from './firebase'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim()
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim()
const adminEmail = 'stablekeeper@horseguessr.invalid'

export const BANNED_ACCOUNT_MESSAGE = 'This HorseGuessr account has been banned. You have been logged out.'

export type AccountSnapshot = {
  favorites: string[]
  topFavorites: string[]
  passport: string[]
  personalBest: number
  nameBreedBest: number
  photoQuizBest: number
  lastDailyScore?: number
  lastDailyDate?: string
}

export type PublicProfile = AccountSnapshot & {
  uid: string
  username: string
  createdAt: string
  updatedAt: string
}

export type PlayerAccount = {
  uid: string
  email: string
  username: string
  session: FirebaseSession
  profile: PublicProfile
}

export type AdminAccountRow = {
  uid: string
  email: string
  username: string
  createdAt: string
  banned: boolean
  moderatedAt: string
  profile: PublicProfile | null
}

type FirestoreValue = {
  stringValue?: string
  integerValue?: string
  timestampValue?: string
  booleanValue?: boolean
  arrayValue?: { values?: FirestoreValue[] }
}

type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> }

const vulgarUsernameParts = [
  'asshole', 'bastard', 'bitch', 'cock', 'cunt', 'dick', 'dildo', 'fuck', 'motherfucker',
  'nigger', 'nigga', 'piss', 'porn', 'pussy', 'rape', 'rapist', 'retard', 'shit', 'slut',
  'twat', 'vagina', 'whore',
]

function normalizeUsernameForModeration(value: string) {
  return value.toLowerCase().replace(/[013457@$]/g, character => ({
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's',
  })[character] || character).replace(/[^a-z]/g, '')
}

export function validateUsername(value: string) {
  const username = value.trim()
  if (username.length < 3 || username.length > 20) return 'Choose a username between 3 and 20 characters.'
  if (!/^[A-Za-z0-9_]+$/.test(username)) return 'Use only letters, numbers, and underscores.'
  const moderated = normalizeUsernameForModeration(username)
  if (vulgarUsernameParts.some(part => moderated.includes(part))) return 'Please choose a different, horse-club-friendly username.'
  return ''
}

function unique(values: string[]) {
  return [...new Set(values.filter(value => /^[a-z0-9-]{2,80}$/.test(value)))]
}

function arrayStrings(value: FirestoreValue | undefined) {
  return value?.arrayValue?.values?.flatMap(item => typeof item.stringValue === 'string' ? [item.stringValue] : []) || []
}

function stringValue(value: FirestoreValue | undefined) {
  return value?.stringValue || value?.timestampValue || ''
}

function numberValue(value: FirestoreValue | undefined) {
  return Math.max(0, Number(value?.integerValue || 0) || 0)
}

function booleanValue(value: FirestoreValue | undefined) {
  return value?.booleanValue === true
}

function profileFromDocument(document: FirestoreDocument): PublicProfile {
  const fields = document.fields || {}
  return {
    uid: document.name.split('/').pop() || '',
    username: stringValue(fields.username),
    favorites: arrayStrings(fields.favorites),
    topFavorites: arrayStrings(fields.topFavorites),
    passport: arrayStrings(fields.passport),
    personalBest: numberValue(fields.personalBest),
    nameBreedBest: numberValue(fields.nameBreedBest),
    photoQuizBest: numberValue(fields.photoQuizBest),
    lastDailyScore: numberValue(fields.lastDailyScore),
    lastDailyDate: stringValue(fields.lastDailyDate),
    createdAt: stringValue(fields.createdAt),
    updatedAt: stringValue(fields.updatedAt),
  }
}

function arrayField(values: string[]): FirestoreValue {
  return { arrayValue: { values: unique(values).map(stringValue => ({ stringValue })) } }
}

function profileFields(profile: PublicProfile): Record<string, FirestoreValue> {
  return {
    username: { stringValue: profile.username },
    favorites: arrayField(profile.favorites),
    topFavorites: arrayField(profile.topFavorites),
    passport: arrayField(profile.passport),
    personalBest: { integerValue: String(Math.round(profile.personalBest)) },
    nameBreedBest: { integerValue: String(Math.round(profile.nameBreedBest)) },
    photoQuizBest: { integerValue: String(Math.round(profile.photoQuizBest)) },
    lastDailyScore: { integerValue: String(Math.round(profile.lastDailyScore || 0)) },
    lastDailyDate: { stringValue: profile.lastDailyDate || '' },
    createdAt: { timestampValue: profile.createdAt },
    updatedAt: { timestampValue: profile.updatedAt },
  }
}

function documentUrl(collection: string, id: string) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}?key=${encodeURIComponent(apiKey!)}`
}

async function authError(response: Response, fallback: string) {
  let code = ''
  let detail = ''
  try {
    const body = await response.json() as { error?: { message?: string; status?: string } }
    detail = body.error?.message || ''
    code = body.error?.status || ''
  } catch {
    // Use the friendly fallback below.
  }
  const messageCode = detail.split(/[\s:]/, 1)[0]
  const normalizedCode = /^[A-Z][A-Z0-9_]+$/.test(messageCode) ? messageCode : code
  if (normalizedCode === 'OPERATION_NOT_ALLOWED' && /verify the new email/i.test(detail)) {
    throw new Error('Email verification is required before changing this account’s email. Refresh the page to get the latest sign-up form and try again.')
  }
  const friendly: Record<string, string> = {
    EMAIL_EXISTS: 'That email already has an account. Try logging in instead.',
    EMAIL_NOT_FOUND: 'No account was found for that email.',
    INVALID_EMAIL: 'Enter a valid email address.',
    INVALID_LOGIN_CREDENTIALS: 'That email or password is not correct.',
    INVALID_PASSWORD: 'That email or password is not correct.',
    OPERATION_NOT_ALLOWED: 'Email/password accounts need to be enabled in Firebase Authentication first.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Please wait a little while and try again.',
    WEAK_PASSWORD: 'Choose a stronger password with at least 8 characters.',
    CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'Your guest session expired. Refresh the page and try creating the account again.',
    INVALID_ID_TOKEN: 'Your guest session expired. Refresh the page and try creating the account again.',
    TOKEN_EXPIRED: 'Your guest session expired. Refresh the page and try creating the account again.',
    UNAUTHORIZED_DOMAIN: 'This site domain needs to be added to Firebase Authentication\'s authorized domains.',
    DOMAIN_NOT_WHITELISTED: 'This site domain needs to be added to Firebase Authentication\'s authorized domains.',
    API_KEY_HTTP_REFERRER_BLOCKED: 'This site domain needs to be allowed in the Firebase web API key settings.',
    PERMISSION_DENIED: 'Firebase blocked the final profile save. Check that the current Firestore rules are published.',
  }
  throw new Error(friendly[normalizedCode] || fallback)
}

async function fetchDocument(collection: string, id: string, session?: FirebaseSession) {
  if (!firebaseConfigured) return null
  const response = await fetch(documentUrl(collection, id), {
    headers: session ? { Authorization: `Bearer ${session.idToken}` } : undefined,
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Could not load ${collection} (${response.status}).`)
  return response.json() as Promise<FirestoreDocument>
}

async function writeDocument(collection: string, id: string, fields: Record<string, FirestoreValue>, session: FirebaseSession) {
  const response = await fetch(documentUrl(collection, id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.idToken}` },
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) await authError(response, `Could not save ${collection}.`)
}

async function patchDocumentFields(collection: string, id: string, fields: Record<string, FirestoreValue>, session: FirebaseSession) {
  const mask = Object.keys(fields).map(field => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&')
  const response = await fetch(`${documentUrl(collection, id)}&${mask}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.idToken}` },
    body: JSON.stringify({ fields }),
  })
  if (!response.ok) await authError(response, `Could not update ${collection}.`)
}

async function privateAccountIsBanned(uid: string, session: FirebaseSession) {
  const document = await fetchDocument('privateAccounts', uid, session)
  return booleanValue(document?.fields?.banned)
}

function bannedAccountError() {
  clearFirebaseSession()
  return new Error(BANNED_ACCOUNT_MESSAGE)
}

export function isBannedAccountError(reason: unknown) {
  return reason instanceof Error && reason.message === BANNED_ACCOUNT_MESSAGE
}

export async function checkAccountBanned(uid: string) {
  const session = await firebaseSession()
  if (session.localId !== uid) return true
  return privateAccountIsBanned(uid, session)
}

async function createUsername(username: string, session: FirebaseSession) {
  const usernameLower = username.toLowerCase()
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents/usernames?documentId=${encodeURIComponent(usernameLower)}&key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.idToken}` },
    body: JSON.stringify({ fields: {
      uid: { stringValue: session.localId },
      createdAt: { timestampValue: new Date().toISOString() },
    } }),
  })
  if (response.status === 409) throw new Error('That username is already taken. Please choose another.')
  if (!response.ok) await authError(response, 'That username could not be reserved.')
}

function mergeProfile(uid: string, username: string, existing: PublicProfile | null, snapshot: AccountSnapshot): PublicProfile {
  const now = new Date().toISOString()
  const favorites = unique([...(existing?.favorites || []), ...snapshot.favorites])
  return {
    uid,
    username: existing?.username || username,
    favorites,
    topFavorites: unique([...(existing?.topFavorites || []), ...snapshot.topFavorites]).filter(id => favorites.includes(id)),
    passport: unique([...(existing?.passport || []), ...snapshot.passport]),
    personalBest: Math.max(existing?.personalBest || 0, snapshot.personalBest || 0),
    nameBreedBest: Math.max(existing?.nameBreedBest || 0, snapshot.nameBreedBest || 0),
    photoQuizBest: Math.max(existing?.photoQuizBest || 0, snapshot.photoQuizBest || 0),
    lastDailyScore: snapshot.lastDailyDate && snapshot.lastDailyDate >= (existing?.lastDailyDate || '') ? snapshot.lastDailyScore || 0 : existing?.lastDailyScore || 0,
    lastDailyDate: snapshot.lastDailyDate && snapshot.lastDailyDate >= (existing?.lastDailyDate || '') ? snapshot.lastDailyDate : existing?.lastDailyDate || '',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  }
}

export async function fetchPublicProfile(uid: string) {
  if (!/^[A-Za-z0-9_-]{4,128}$/.test(uid)) return null
  const document = await fetchDocument('publicProfiles', uid)
  return document ? profileFromDocument(document) : null
}

export async function saveAccountProgress(account: PlayerAccount, snapshot: AccountSnapshot) {
  const session = await firebaseSession()
  if (session.localId !== account.uid) throw new Error('Please log in again to save your progress.')
  if (await privateAccountIsBanned(account.uid, session)) throw bannedAccountError()
  const current = await fetchPublicProfile(account.uid)
  const profile = mergeProfile(account.uid, account.username, current, snapshot)
  await writeDocument('publicProfiles', account.uid, profileFields(profile), session)
  return profile
}

export async function registerAccount(usernameValue: string, emailValue: string, password: string, snapshot: AccountSnapshot): Promise<PlayerAccount> {
  if (!firebaseConfigured) throw new Error('Firebase is not configured for this build.')
  const username = usernameValue.trim().toLowerCase()
  const usernameError = validateUsername(username)
  if (usernameError) throw new Error(usernameError)
  const email = emailValue.trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.')
  if (password.length < 8) throw new Error('Choose a password with at least 8 characters.')
  const guestSession = await firebaseSession()
  const reserved = await fetchDocument('usernames', username.toLowerCase(), guestSession)
  if (reserved) throw new Error('That username is already taken. Please choose another.')

  // signUp with an ID token links credentials to the guest's existing UID.
  // accounts:update rejects this conversion when email enumeration protection is enabled.
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: guestSession.idToken, email, password, displayName: username, returnSecureToken: true }),
  })
  if (!response.ok) await authError(response, 'The account could not be created.')
  const created = await response.json() as { idToken: string; localId: string; refreshToken: string; expiresIn: string; email: string; displayName?: string }
  const session = saveFirebaseSession({
    idToken: created.idToken,
    localId: created.localId,
    refreshToken: created.refreshToken,
    expiresAt: Date.now() + Math.max(60, Number(created.expiresIn) - 60) * 1000,
    email: created.email,
    displayName: created.displayName || username,
  })
  await createUsername(username, session)
  const profile = mergeProfile(session.localId, username, null, snapshot)
  await writeDocument('publicProfiles', session.localId, profileFields(profile), session)
  await writeDocument('privateAccounts', session.localId, {
    email: { stringValue: email },
    username: { stringValue: username },
    createdAt: { timestampValue: profile.createdAt },
    banned: { booleanValue: false },
    moderatedAt: { timestampValue: profile.createdAt },
  }, session)
  return { uid: session.localId, email, username, session, profile }
}

export async function loginAccount(emailValue: string, password: string, snapshot: AccountSnapshot): Promise<PlayerAccount> {
  if (!firebaseConfigured) throw new Error('Firebase is not configured for this build.')
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailValue.trim().toLowerCase(), password, returnSecureToken: true }),
  })
  if (!response.ok) await authError(response, 'The account could not be logged in.')
  const signedIn = await response.json() as { idToken: string; localId: string; refreshToken: string; expiresIn: string; email: string; displayName?: string }
  const session = saveFirebaseSession({
    idToken: signedIn.idToken,
    localId: signedIn.localId,
    refreshToken: signedIn.refreshToken,
    expiresAt: Date.now() + Math.max(60, Number(signedIn.expiresIn) - 60) * 1000,
    email: signedIn.email,
    displayName: signedIn.displayName,
  })
  if (await privateAccountIsBanned(session.localId, session)) throw bannedAccountError()
  const existing = await fetchPublicProfile(session.localId)
  if (!existing) throw new Error('This login does not have a HorseGuessr profile yet.')
  const profile = mergeProfile(session.localId, existing.username, existing, snapshot)
  await writeDocument('publicProfiles', session.localId, profileFields(profile), session)
  return { uid: session.localId, email: signedIn.email, username: profile.username, session, profile }
}

export async function restoreAccount(): Promise<PlayerAccount | null> {
  const cached = readFirebaseSession()
  if (!cached?.email) return null
  try {
    const session = await firebaseSession()
    if (await privateAccountIsBanned(session.localId, session)) throw bannedAccountError()
    const profile = await fetchPublicProfile(session.localId)
    if (!profile) return null
    return { uid: session.localId, email: session.email || cached.email, username: profile.username, session, profile }
  } catch (reason) {
    if (isBannedAccountError(reason)) throw reason
    return null
  }
}

export function logoutAccount() {
  clearFirebaseSession()
}

export async function adminLogin(password: string) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password, returnSecureToken: true }),
  })
  if (!response.ok) await authError(response, 'The stable-office password is not correct.')
  const result = await response.json() as { idToken: string; localId: string; refreshToken: string; expiresIn: string; email: string }
  return saveFirebaseSession({
    idToken: result.idToken,
    localId: result.localId,
    refreshToken: result.refreshToken,
    expiresAt: Date.now() + Math.max(60, Number(result.expiresIn) - 60) * 1000,
    email: result.email,
  })
}

export async function fetchAdminAccounts(session: FirebaseSession): Promise<AdminAccountRow[]> {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey!)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.idToken}` },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'privateAccounts' }],
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'DESCENDING' }],
      limit: 500,
    } }),
  })
  if (!response.ok) await authError(response, 'This account does not have stable-office access.')
  const rows = await response.json() as Array<{ document?: FirestoreDocument }>
  return Promise.all(rows.flatMap(row => {
    if (!row.document?.fields) return []
    const uid = row.document.name.split('/').pop() || ''
    return [{ uid, fields: row.document.fields }]
  }).map(async item => ({
    uid: item.uid,
    email: stringValue(item.fields.email),
    username: stringValue(item.fields.username),
    createdAt: stringValue(item.fields.createdAt),
    banned: booleanValue(item.fields.banned),
    moderatedAt: stringValue(item.fields.moderatedAt),
    profile: await fetchPublicProfile(item.uid),
  })))
}

export async function setAdminAccountBanned(session: FirebaseSession, uid: string, banned: boolean) {
  if (!/^[A-Za-z0-9_-]{4,128}$/.test(uid)) throw new Error('That account ID is not valid.')
  const moderatedAt = new Date().toISOString()
  await patchDocumentFields('privateAccounts', uid, {
    banned: { booleanValue: banned },
    moderatedAt: { timestampValue: moderatedAt },
  }, session)

  let removedScores = 0
  if (banned) {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId!)}/databases/(default)/documents:runQuery?key=${encodeURIComponent(apiKey!)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.idToken}` },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: 'leaderboard' }],
        where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } },
        limit: 500,
      } }),
    })
    if (!response.ok) await authError(response, 'The account was banned, but its leaderboard entries could not be located.')
    const rows = await response.json() as Array<{ document?: FirestoreDocument }>
    const ids = rows.flatMap(row => row.document?.name ? [row.document.name.split('/').pop() || ''] : []).filter(Boolean)
    const deletions = await Promise.all(ids.map(async id => {
      const deletion = await fetch(documentUrl('leaderboard', id), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.idToken}` },
      })
      return deletion.ok
    }))
    removedScores = deletions.filter(Boolean).length
    if (removedScores !== ids.length) throw new Error(`The account was banned, but ${ids.length - removedScores} leaderboard entries could not be removed.`)
  }
  return { banned, moderatedAt, removedScores }
}
