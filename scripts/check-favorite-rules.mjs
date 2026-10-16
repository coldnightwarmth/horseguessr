// Run against the isolated demo-project Firestore emulator on port 8189.
import assert from 'node:assert/strict'
const project = 'demo-horseguessr'
const root = `projects/${project}/databases/(default)/documents`
const base = `http://127.0.0.1:8189/v1/${root}`
const now = Math.floor(Date.now() / 1000)
const token = uid => [
  { alg: 'none', typ: 'JWT' },
  { sub: uid, user_id: uid, aud: project, iss: `https://securetoken.google.com/${project}`, iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: 'password' } },
].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.'
const uid = `qa${Date.now()}`
const breed = 'test-arabian'
const voteName = `${root}/breedHearts/${breed}_${uid}`
const statsName = `${root}/breedPopularity/${breed}`
const vote = (top = false, crown = false) => ({ breedId: { stringValue: breed }, uid: { stringValue: uid }, heartedAt: { timestampValue: '2026-10-15T12:00:00Z' }, top: { booleanValue: top }, crown: { booleanValue: crown } })
const counts = (hearts, top = 0, crown = 0) => Object.fromEntries(Object.entries({ hearts, top, crown }).map(([key, value]) => [key, { integerValue: String(value) }]))
const update = (name, fields) => ({ update: { name, fields } })
async function commit(writes, expected, label) {
  const response = await fetch(`${base}:commit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(uid)}` }, body: JSON.stringify({ writes }) })
  const body = await response.text()
  assert.equal(response.ok, expected, `${label}: ${response.status} ${body}`)
  if (!expected) assert.equal(response.status, 403, label)
  console.log(`Passed: ${label}`)
}
// Reset this disposable demo database only; never a production endpoint.
const reset = await fetch(`http://127.0.0.1:8189/emulator/v1/projects/${project}/databases/(default)/documents`, { method: 'DELETE' })
assert.ok(reset.ok)
await commit([update(voteName, vote())], false, 'vote without matching count denied')
await commit([update(voteName, vote()), update(statsName, counts(1))], true, 'atomic first heart accepted')
const publicRead = await fetch(`http://127.0.0.1:8189/v1/${statsName}`)
assert.ok(publicRead.ok, 'aggregate totals publicly readable')
const otherRead = await fetch(`http://127.0.0.1:8189/v1/${voteName}`, { headers: { Authorization: `Bearer ${token('different-user')}` } })
assert.equal(otherRead.status, 403, 'another player cannot read private vote')
await commit([update(statsName, counts(100))], false, 'forged aggregate denied')
await commit([update(voteName, vote()), update(statsName, counts(2))], false, 'repeated heart cannot inflate total')
await commit([update(voteName, vote(true)), update(statsName, counts(1, 1))], true, 'one top-favorite bonus accepted')
await commit([update(voteName, vote(true, true)), update(statsName, counts(1, 1, 1))], true, 'one favorite-of-all bonus accepted')
await commit([update(voteName, vote(true, true)), update(statsName, counts(1, 2, 1))], false, 'repeated bonus denied')
await commit([update(voteName, vote(false, true)), update(statsName, counts(1, 0, 1))], false, 'bonus rollback denied')
await commit([{ delete: voteName }], false, 'standalone vote deletion denied')
await commit([{ delete: voteName }, update(statsName, counts(0))], true, 'reauthenticated deletion removes all contributions atomically')
await commit([update(voteName, vote()), update(statsName, counts(1))], true, 'recreated vote cannot exceed original contribution')
console.log('All favorite-rule integration tests passed; production was not contacted.')
