// One-time migration. Defaults to a read-only summary; --apply writes.
// Uses the existing Firebase CLI login, never browser credentials.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
const require = createRequire(import.meta.url)
const cliAuthPath = process.env.FIREBASE_CLI_AUTH_MODULE
if (!cliAuthPath) throw new Error('Set FIREBASE_CLI_AUTH_MODULE to the installed Firebase CLI lib/auth.js.')
const auth = require(cliAuthPath)
const config = JSON.parse(readFileSync(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf8'))
const token = await auth.getAccessToken(config.tokens.refresh_token, config.loginScopes)
const headers = { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }
const root = 'projects/horseguessr/databases/(default)/documents'
const base = `https://firestore.googleapis.com/v1/${root}`
async function list(collection) {
  const documents = []
  let pageToken = ''
  do {
    const response = await fetch(`${base}/${collection}?pageSize=300&pageToken=${encodeURIComponent(pageToken)}`, { headers })
    if (!response.ok) throw new Error(`Could not read ${collection}: HTTP ${response.status}`)
    const data = await response.json()
    documents.push(...(data.documents || []))
    pageToken = data.nextPageToken || ''
  } while (pageToken)
  return documents
}
const [votes, profiles, existingTotals] = await Promise.all(['breedHearts', 'publicProfiles', 'breedPopularity'].map(list))
if (existingTotals.length) throw new Error('Totals already exist. Refusing to rerun a one-time migration.')
const byId = new Map(votes.map(vote => [vote.name.split('/').pop(), vote]))
const strings = value => (value?.arrayValue?.values || []).map(item => item.stringValue).filter(Boolean)
const writes = []
for (const profile of profiles) {
  const uid = profile.name.split('/').pop()
  const fields = profile.fields || {}
  const top = new Set(strings(fields.topFavorites))
  const crown = fields.favoriteOfAll?.stringValue
  for (const breedId of strings(fields.favorites)) {
    const id = `${breedId}_${uid}`
    let vote = byId.get(id)
    if (!vote) {
      vote = { name: `${root}/breedHearts/${id}`, fields: { breedId: { stringValue: breedId }, uid: { stringValue: uid }, heartedAt: { timestampValue: new Date().toISOString() } } }
      byId.set(id, vote)
    }
    vote.fields.top = { booleanValue: vote.fields.top?.booleanValue === true || top.has(breedId) }
    vote.fields.crown = { booleanValue: vote.fields.crown?.booleanValue === true || crown === breedId }
  }
}
const totals = new Map()
for (const vote of byId.values()) {
  const breedId = vote.fields.breedId?.stringValue
  if (!breedId || !/^[a-z0-9-]{2,80}$/.test(breedId)) throw new Error('Unexpected vote data; inspect privately before migrating.')
  const top = vote.fields.top?.booleanValue === true
  const crown = vote.fields.crown?.booleanValue === true
  vote.fields.top = { booleanValue: top }
  vote.fields.crown = { booleanValue: crown }
  const counts = totals.get(breedId) || { hearts: 0, top: 0, crown: 0 }
  counts.hearts++; counts.top += Number(top); counts.crown += Number(crown)
  totals.set(breedId, counts)
  writes.push({ update: { name: vote.name, fields: vote.fields }, currentDocument: vote.updateTime ? { updateTime: vote.updateTime } : { exists: false } })
}
for (const [id, counts] of totals) writes.push({ update: { name: `${root}/breedPopularity/${id}`, fields: Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, { integerValue: String(value) }])) }, currentDocument: { exists: false } })
console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', existingVotes: votes.length, resultingVotes: byId.size, breeds: totals.size, writes: writes.length }))
if (process.argv.includes('--apply')) {
  // One atomic commit prevents a partially seeded set of totals. Abort rather
  // than chunking if the dataset outgrows Firestore's 500-write batch limit.
  if (writes.length > 500) throw new Error('Migration requires more than one atomic batch; plan a maintenance migration instead.')
  const response = await fetch(`${base}:commit`, { method: 'POST', headers, body: JSON.stringify({ writes }) })
  if (!response.ok) throw new Error(`Migration not applied: HTTP ${response.status}`)
  console.log('Atomic favorite migration completed.')
}
