// Isolated REST-contract test: never contacts production Firebase.
import { build } from 'esbuild'
import assert from 'node:assert/strict'

const stored = new Map()
globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value), removeItem: key => stored.delete(key) }
globalThis.window = new EventTarget()
stored.set('horseguessr-anonymous-auth', JSON.stringify({ idToken: 'test-token', localId: 'test-user', refreshToken: 'test-refresh', expiresAt: Date.now() + 600000 }))
const documents = new Map()
let commits = 0
let events = 0
window.addEventListener('horseguessr:favorite-counts', () => events++)
globalThis.fetch = async (url, options = {}) => {
  assert.ok(url.startsWith('https://firestore.googleapis.com/v1/projects/test-project/'))
  if (url.includes(':commit')) {
    const { writes } = JSON.parse(options.body)
    assert.equal(writes.length, 2)
    for (const write of writes) {
      const existing = documents.get(write.update.name)
      if (existing) assert.equal(write.currentDocument.updateTime, existing.updateTime)
      else assert.equal(write.currentDocument.exists, false)
    }
    commits++
    for (const write of writes) documents.set(write.update.name, { ...write.update, updateTime: String(commits) })
    return Response.json({})
  }
  if (url.includes(':runQuery')) return Response.json([...documents.values()].filter(d => d.name.includes('/breedPopularity/')).map(document => ({ document })))
  const name = new URL(url).pathname.slice('/v1/'.length)
  return documents.has(name) ? Response.json(documents.get(name)) : new Response('{}', { status: 404 })
}
const built = await build({ entryPoints: ['src/firebase.ts'], bundle: true, write: false, platform: 'node', format: 'esm', define: {
  'import.meta.env.VITE_FIREBASE_PROJECT_ID': '"test-project"',
  'import.meta.env.VITE_FIREBASE_API_KEY': '"test-key"',
} })
const m = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`)
await m.recordBreedFavorite('arabian')
await m.recordBreedFavorite('arabian')
assert.equal(commits, 1, 'Repeat hearts must be idempotent')
await Promise.all([m.recordBreedFavorite('arabian', 'top'), m.recordBreedFavorite('arabian', 'crown')])
await m.recordBreedFavorite('arabian', 'top')
await m.recordBreedFavorite('arabian', 'crown')
assert.equal(commits, 3)
assert.equal(events, 3)
assert.deepEqual((await m.fetchFavoriteTotals()).arabian, { hearts: 1, top: 1, crown: 1 })
assert.equal(m.favoriteWeight((await m.fetchFavoriteTotals()).arabian), 3)
await m.recordBreedFavorite('friesian', 'crown')
assert.deepEqual((await m.fetchFavoriteTotals()).friesian, { hearts: 1, top: 0, crown: 1 })
assert.equal(m.favoriteWeight(undefined), 0)
console.log('Passed: unique hearts, one-time bonuses, serialized writes, version preconditions, public totals and refresh events. No production requests made.')
