import type { Breed } from './data'
import heightData from './breedHeights.json'

// Controlled vocabulary: hints never interpolate names, places, nationalities,
// free-text biographies, or ancestry. Empty lists mean unrecorded, not absent.
export const traitFields = {
  type: 'Type', proportions: 'Proportions', build: 'Build', headProfile: 'Head profile',
  ears: 'Ears', mane: 'Mane', feathering: 'Leg feathering', coats: 'Coat colors',
  patterns: 'Coat patterns', gaits: 'Gaits & action', uses: 'Uses', climate: 'Climate', terrain: 'Terrain',
} as const
export type TraitField = keyof typeof traitFields
export type HeightRecord = { text: string; cm: number[]; source: string }
export type BreedTraits = Record<TraitField, string[]> & { height: HeightRecord | null; sources: string[] }
const heights = heightData as Record<string, HeightRecord>

const aliases: Record<string, string> = {
  'cold-weather': 'cold-climate', 'cold climate': 'cold-climate', 'cold weather': 'cold-climate',
  'cold-blood': 'coldblood', 'cold blood': 'coldblood', 'cold-blooded': 'coldblood',
  'draught': 'draft', 'sport horse': 'sport', 'sports horse': 'sport', 'warm-blood': 'warmblood',
  'gray': 'gray', 'grey': 'gray', 'all purpose': 'all-purpose',
}
export function normalizeBreedTags(tags: string[]) {
  return [...new Set(tags.map(tag => aliases[tag.toLowerCase()] || tag.toLowerCase()))]
}
type Rule = [RegExp, string]
const rules: Record<TraitField, Rule[]> = {
  type: [[/\bpony\b/, 'pony'], [/\bminiature\b/, 'miniature'], [/\b(?:draft|draught|coldblood)\b/, 'coldblood'], [/warmblood/, 'warmblood'], [/hotblood/, 'hotblood'], [/\bbaroque\b/, 'baroque'], [/\bferal\b/, 'feral population']],
  proportions: [[/compact|short.back/, 'compact / short-backed'], [/long.leg|tall.*leg/, 'long-legged'], [/deep.body|deep.chest|deep.barrel|great depth/, 'deep-bodied'], [/uphill/, 'uphill balance'], [/long.lined|long.frame|long.body/, 'long-lined']],
  build: [[/heavy|massive|heavily|draft|draught/, 'heavy / substantial'], [/muscul|powerful hind|powerful body|stocky/, 'muscular'], [/fine.bon|\brefined\b|slender|fine.leg/, 'fine / refined'], [/strong bone|heavy bone|strong.bon|sturdy|robust/, 'strong-boned'], [/athletic|sport horse/, 'athletic']],
  headProfile: [[/roman.nos|convex|ram.nos/, 'convex'], [/dished|concave/, 'concave / dished'], [/straight.profile|straight.head/, 'straight']],
  ears: [[/inward.curv|curv.*ear|ear.*curv|ear.*meet|ear.*touch/, 'inward-curving tips'], [/small.ears|short.ears/, 'small'], [/long.ears/, 'long']],
  mane: [[/thick.{0,20}mane|abundant.mane|flowing.mane|luxuriant|heavy.mane|profuse.mane/, 'abundant / thick'], [/sparse.mane|fine.mane|thin.mane/, 'sparse / fine'], [/upright.mane|standing.mane|upright.two.tone/, 'upright when trimmed'], [/flaxen/, 'flaxen'], [/coarse.mane/, 'coarse'], [/curly/, 'curly hair']],
  feathering: [[/heavy.feather|thick.feather|abundant.feather|feathered.leg|feathering/, 'feathered'], [/clean.leg|little.feather|light.feather|unfeathered/, 'little / none']],
  coats: [[/\bbay\b/, 'bay'], [/\bblack\b/, 'black'], [/\bchestnut\b/, 'chestnut'], [/\bgr[ae]y\b/, 'gray'], [/\bbrown\b/, 'brown'], [/\bdun\b/, 'dun'], [/palomino/, 'palomino'], [/buckskin/, 'buckskin'], [/roan/, 'roan'], [/silver/, 'silver dilution'], [/cream|cremello|perlino/, 'cream dilution']],
  patterns: [[/leopard|spotted|blanket/, 'leopard complex'], [/pinto|piebald|skewbald|tobiano|overo/, 'pinto'], [/sabino/, 'sabino-style markings'], [/primitive|dorsal|leg barring/, 'primitive markings'], [/metallic/, 'metallic sheen'], [/white marking|white facial|white leg|white face|blaze/, 'white markings']],
  gaits: [[/high.action|high.stepp|elevated trot|knee action|extravagant|animated.*trot/, 'high-action trot'], [/trott|\btrot\b/, 'trotting emphasis'], [/\bpacing\b|\bpace\b/, 'pacing'], [/gaited|four.beat|tölt|marcha|smooth.gait|running.walk|fox.trot/, 'extra smooth gaits'], [/sure.foot/, 'sure-footed action'], [/agil|quick.feet|nimble/, 'agile action']],
  uses: [[/carriage|driving|harness/, 'driving / harness'], [/farm|agricultur|plough|plow/, 'farm work'], [/forestry|logging|timber/, 'forestry'], [/pack|carry.loads|carrying.loads/, 'pack work'], [/cattle|stock horse|ranch|herding/, 'stock work'], [/cavalry|military/, 'cavalry'], [/racing|racehorse/, 'racing'], [/endurance/, 'endurance'], [/dressage/, 'dressage'], [/jumping|jumper/, 'jumping'], [/riding|saddle|trail/, 'riding']],
  climate: [[/cold.climate|cold.weather|arctic|subarctic|severe.winter|harsh.winter|extreme.cold/, 'cold-climate'], [/desert|arid/, 'arid-climate'], [/tropical|humid/, 'warm / humid']],
  terrain: [[/mountain|steep|upland|rocky|hill/, 'mountain / upland'], [/marsh|wetland|bog|wet.ground|soft.ground/, 'wetland'], [/desert/, 'desert'], [/steppe|grassland|range.country|open.range|plains/, 'open grassland']],
}

// These refinements are supported by the linked breed standard, rather than
// extrapolated from a photograph or a related breed.
const refinements: Record<string, Partial<Record<TraitField, string[]>> & { height?: HeightRecord; source?: string }> = {
  'carolina-marsh-tacky': { proportions: ['compact / short-backed', 'deep-bodied'], build: ['athletic'], ears: ['small'], feathering: ['little / none'], gaits: ['sure-footed action', 'smooth trot'], terrain: ['wetland', 'woodland'], height: { text: 'Breed standard: 13–15 hh (132–152 cm), usually 14–14.2 hh.', cm: [132, 152], source: 'https://marshtacky.info/horses/breed-standard/' }, source: 'https://marshtacky.info/horses/breed-standard/' },
  haflinger: { build: ['muscular'], mane: ['abundant / thick', 'flaxen'], proportions: ['deep-bodied'], gaits: ['elastic sport action', 'sure-footed action'], uses: ['riding', 'driving / harness', 'endurance', 'racing', 'therapeutic riding'], terrain: ['mountain / upland'], source: 'https://www.haflinger.eu/en/haflinger/' },
  connemara: { type: ['pony'], proportions: ['compact / short-backed', 'deep-bodied'], build: ['strong-boned', 'muscular'], gaits: ['ground-covering action', 'sure-footed action'], uses: ['riding', 'jumping'], height: { text: 'Breed standard: 128–148 cm at maturity.', cm: [128, 148], source: 'https://www.britishconnemaras.co.uk/breeding-owning/about-the-breed/' }, source: 'https://www.britishconnemaras.co.uk/breeding-owning/about-the-breed/' },
  shetland: { proportions: ['deep-bodied', 'short-legged'], build: ['muscular'], mane: ['abundant / thick'], uses: ['pack work', 'driving / harness', 'mining'], climate: ['cold-climate'], source: 'https://breeds.okstate.edu/horses/shetland-pony' },
  'exmoor-pony': { proportions: ['deep-bodied', 'short-legged'], build: ['strong-boned'], ears: ['small'], feathering: ['little / none'], gaits: ['straight, low action'], uses: ['stock work', 'jumping', 'driving / harness', 'dressage', 'riding'], climate: ['cold-climate', 'wet-climate'], terrain: ['mountain / upland'], source: 'https://breeds.okstate.edu/horses/exmoor-pony' },
  'eriskay-pony': { uses: ['pack work', 'riding'] },
  giara: { terrain: ['mountain / upland'], climate: ['dry summers'] },
  arabian: { headProfile: ['straight to concave'], proportions: ['compact / short-backed'], build: ['fine / refined'], ears: ['small'], height: { text: 'Usually 14.1–15.1 hh (145–155 cm); individuals may fall outside this range.', cm: [145, 155], source: 'https://www.arabianhorses.org/export/content.export/judges-stewards/js-docs/JS_NB_Conformation.pdf' } },
  'akhal-teke': { proportions: ['long-legged', 'long-lined'], build: ['fine / refined'], ears: ['long'], mane: ['sparse / fine'], uses: ['endurance', 'riding', 'cavalry', 'racing', 'dressage', 'jumping'], source: 'https://breeds.okstate.edu/horses/akhal-teke-horses' },
  andalusian: { proportions: ['compact / short-backed'], headProfile: ['straight to slightly convex'], ears: ['small'], mane: ['abundant / thick'], feathering: ['little / none'], gaits: ['energetic action'], source: 'https://breeds.okstate.edu/horses/andalusian-horses' },
  friesian: { mane: ['abundant / thick'], feathering: ['feathered'], build: ['muscular'], uses: ['driving / harness', 'farm work', 'riding'], source: 'https://breeds.okstate.edu/horses/friesian-horses' },
  fjord: { height: { text: '135–150 cm (13.1–14.3 hh).', cm: [135, 150], source: 'https://en.wikipedia.org/wiki/Fjord_horse' } },
  lipizzan: { height: { text: '147–157 cm (14.2–15.2 hh).', cm: [147, 157], source: 'https://en.wikipedia.org/wiki/Lipizzan' } },
  'dutch-harness': { gaits: ['high-action trot'], uses: ['driving / harness'], proportions: ['uphill balance'], source: 'https://kwpn-na.org/breeding/breeding-goals/' },
  'dutch-warmblood': { gaits: ['elastic sport action'], uses: ['dressage', 'jumping', 'riding'], proportions: ['uphill balance'], source: 'https://kwpn-na.org/breeding/breeding-goals/' },
  gelderlander: { uses: ['driving / harness', 'riding', 'farm work'], source: 'https://kwpn-na.org/about/gelders/explanation-of-the-gelders-breeding-direction/' },
  icelandic: { gaits: ['smooth four-beat lateral gait', 'flying pace in five-gaited individuals'], source: 'https://www.horsesoficeland.is/the-icelandic-horse/gaits/' },
}

const cache = new Map<string, BreedTraits>()
export function traitsForBreed(breed: Breed): BreedTraits {
  const cached = cache.get(breed.id)
  if (cached) return cached
  const result = {} as BreedTraits
  const physicalText = `${breed.hint} ${normalizeBreedTags(breed.tags).join(' ')}`.toLowerCase()
  const useText = `${physicalText} ${breed.fact}`.toLowerCase()
  for (const key of Object.keys(traitFields) as TraitField[]) {
    const coatText = breed.coatColors.toLowerCase().split(/[.;]/).filter(clause => !/\bnot\b|absent|excluded|discouraged/.test(clause)).join(' ')
    const text = key === 'coats' || key === 'patterns' ? coatText : key === 'uses' || key === 'terrain' || key === 'climate' ? useText : physicalText
    result[key] = rules[key].filter(([pattern]) => pattern.test(text)).map(([, label]) => label)
  }
  // Do not turn “little feathering” into two contradictory categories.
  if (result.feathering.includes('little / none')) result.feathering = ['little / none']
  result.height = heights[breed.id] || null
  result.sources = [breed.source]
  const extra = refinements[breed.id]
  if (extra) {
    for (const key of Object.keys(traitFields) as TraitField[]) if (extra[key]) result[key] = extra[key]!
    if (extra.height) { result.height = extra.height; result.sources.push(extra.height.source) }
    if (extra.source) result.sources.push(extra.source)
  }
  cache.set(breed.id, result)
  return result
}

export function hintsForBreed(breed: Breed): [string, string] {
  const traits = traitsForBreed(breed)
  const physical = (['ears', 'headProfile', 'mane', 'feathering', 'patterns', 'proportions', 'build'] as TraitField[])
    .filter(key => traits[key].length).slice(0, 3).map(key => `${traitFields[key]}: ${traits[key].join(', ')}.`)
  if (!physical.length && traits.height && !/average|minimum|Male:|Female:/i.test(traits.height.text)) physical.push(`Recorded height: ${traits.height.cm.join('–')} cm at the withers.`)
  if (!physical.length) physical.push(`Coat palette: ${traits.coats.join(', ') || 'varied; coat alone is not a reliable identifier'}.`)
  const functional = (['gaits', 'uses', 'terrain', 'climate'] as TraitField[]).filter(key => traits[key].length).slice(0, 3)
    .map(key => `${traitFields[key]}: ${traits[key].join(', ')}.`)
  if (!functional.length) functional.push(`Recorded coat traits: ${[...traits.coats, ...traits.patterns].join(', ') || 'no distinctive pattern recorded'}.`)
  return [physical.join(' '), functional.join(' ')]
}

// Foundation-breed relationships are explicit and sourced. “Similar breeds”
// and shared appearance must never be mistaken for proven shared ancestry.
const foundations: Record<string, { ids: string[]; source: string }> = {
  'dutch-warmblood': { ids: ['gelderlander', 'groningen'], source: 'https://www.kwpn.org/kwpn-horse/kwpn-studbook/history' },
  'dutch-harness': { ids: ['gelderlander', 'groningen'], source: 'https://www.kwpn.org/kwpn-horse/kwpn-studbook/history' },
  gidran: { ids: ['arabian', 'thoroughbred'], source: 'https://mlosz.hu/lofajtak/gidran' },
  'anglo-arabian': { ids: ['arabian', 'thoroughbred'], source: 'https://en.wikipedia.org/wiki/Anglo-Arabian' },
  'anglo-kabarda': { ids: ['kabarda', 'thoroughbred'], source: 'https://en.wikipedia.org/wiki/Anglo-Kabarda' },
  'sardinian-anglo-arab': { ids: ['arabian', 'thoroughbred'], source: 'https://en.wikipedia.org/wiki/Sardinian_Anglo-Arab' },
  malopolski: { ids: ['arabian', 'thoroughbred', 'anglo-arabian'], source: 'https://en.wikipedia.org/wiki/Malopolski' },
  pleven: { ids: ['arabian', 'thoroughbred', 'anglo-arabian'], source: 'https://en.wikipedia.org/wiki/Pleven_horse' },
  'kinsky-horse': { ids: ['thoroughbred'], source: 'https://en.wikipedia.org/wiki/Kinsky_horse' },
  brandenburger: { ids: ['trakehner', 'hanoverian', 'thoroughbred'], source: 'https://en.wikipedia.org/wiki/Brandenburger' },
  'danish-warmblood': { ids: ['thoroughbred'], source: 'https://en.wikipedia.org/wiki/Danish_Warmblood' },
  tersk: { ids: ['arabian'], source: 'https://en.wikipedia.org/wiki/Tersk_horse' },
}
export function sharedFoundations(a: Breed, b: Breed) {
  const first = foundations[a.id], second = foundations[b.id]
  return first && second ? { ids: first.ids.filter(id => second.ids.includes(id)), sources: [...new Set([first.source, second.source])] } : { ids: [], sources: [] }
}

export function comparisonRows(a: Breed, b: Breed) {
  const x = traitsForBreed(a), y = traitsForBreed(b)
  const rows: { label: string; correct: string; guessed: string }[] = []
  for (const key of ['ears', 'headProfile', 'feathering', 'patterns', 'proportions', 'build', 'mane', 'gaits', 'uses', 'coats'] as TraitField[]) {
    // Compare like with like: missing data is not evidence of a difference.
    if (x[key].length && y[key].length && [...x[key]].sort().join('|') !== [...y[key]].sort().join('|')) {
      rows.push({ label: traitFields[key], correct: x[key].join(', '), guessed: y[key].join(', ') })
    }
  }
  if (x.height && y.height && x.height.cm.join() !== y.height.cm.join()) rows.unshift({ label: 'Recorded height', correct: x.height.text, guessed: y.height.text })
  return rows.slice(0, 4)
}
