import { build } from 'esbuild'
import assert from 'node:assert/strict'

const { outputFiles } = await build({ stdin: { contents: `export { breeds } from './src/data'; export * from './src/breedTraits'; export * from './src/originRegions'; export * from './src/practiceRegions'; export * from './src/stampOrder';`, resolveDir: process.cwd() }, define: { 'import.meta.env.BASE_URL': '"/"' }, bundle: true, write: false, platform: 'node', format: 'esm' })
const m = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`)
const breed = id => { const b = m.breeds.find(b => b.id === id); assert.ok(b, id); return b }
for (const b of m.breeds) {
  assert.ok(m.originZones[b.id], `Missing zone: ${b.id}`)
  assert.ok(m.distanceToOriginZone(b, m.originZones[b.id]).inside, `Reference pin outside zone: ${b.id}`)
  const hints = m.hintsForBreed(b)
  assert.equal(hints.length, 2)
  for (const hint of hints) {
    assert.ok(hint.length > 10)
    assert.ok(!/Arabian|Sardinian|Dutch|Hungarian|Sicilian|Atlantic|European|African|Asian|Mongolian|Turkish|Russian/i.test(hint), `${b.id}: geographic hint`)
  }
}
for (const id of ['dutch-warmblood', 'dutch-harness', 'friesian']) {
  for (const [lat, lng] of [[52.37, 4.9], [51.92, 4.48], [50.85, 5.69], [53.22, 6.57]]) {
    assert.equal(m.distanceToOriginZone({lat, lng}, m.originZones[id]).distance, 0)
  }
  assert.equal(m.distanceToOriginZone({lat: 50.85, lng: 4.35}, m.originZones[id]).inside, false)
}
for (const hints of [0, 1, 2]) assert.equal(m.pointsForOriginGuess(0, 'world', hints), 5000 - 500 * hints)
assert.equal(m.pointsForOriginGuess(0.00001, 'world'), 4999)
assert.ok(m.pointsForOriginGuess(100, 'europe') < m.pointsForOriginGuess(100, 'world'))
assert.deepEqual(m.normalizeBreedTags(['cold-weather', 'cold-climate', 'cold-blood', 'coldblood']), ['cold-climate', 'coldblood'])
assert.ok(!m.traitsForBreed(breed('shetland')).patterns.includes('leopard complex'))
assert.ok(!m.traitsForBreed(breed('misaki-horse')).build.includes('fine / refined'))
assert.deepEqual(m.sharedFoundations(breed('dutch-harness'), breed('dutch-warmblood')).ids, ['gelderlander', 'groningen'])
assert.ok(m.comparisonRows(breed('arabian'), breed('friesian')).length)
const ids = ['friesian', 'arabian', 'akhal-teke']
const sorted = m.orderedStamps(m.breeds, ids, [])
assert.deepEqual(sorted.slice(0, 3).map(b => b.id), ['akhal-teke', 'arabian', 'friesian'])
assert.ok(sorted.slice(3).every(b => !ids.includes(b.id)))
assert.deepEqual(m.moveStamp(ids, 'akhal-teke', 'first'), ['akhal-teke', 'friesian', 'arabian'])
assert.deepEqual(m.moveStamp(ids, 'arabian', 'left'), ['arabian', 'friesian', 'akhal-teke'])
assert.deepEqual(m.moveStamp(ids, 'akhal-teke', 'right'), ids)
console.log(`Passed: ${m.breeds.length} breed pins, boundaries, safe hints, scoring, traits, ancestry and stamp ordering.`)
console.log('Trait coverage:', Object.fromEntries([...Object.keys(m.traitFields), 'height'].map(key => [key, m.breeds.filter(b => key === 'height' ? m.traitsForBreed(b).height : m.traitsForBreed(b)[key].length).length])))
