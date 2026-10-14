// Reproducible educational boundaries from Natural Earth, public domain.
// Download ne_50m_admin_0_countries.geojson and ne_10m_admin_1_states_provinces.geojson
// from https://github.com/nvkelso/natural-earth-vector/tree/master/geojson
// Run: node scripts/build-origin-boundaries.mjs countries.geojson provinces.geojson
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const countries = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).features
const provinces = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')).features
const source = 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/'
const records = {}
const assignments = {}
function simplified(points, tolerance = 0.003) {
  // Douglas–Peucker at about 330 m latitude; retain the closed ring and islands.
  if (points.length <= 4) return points
  const last = points.length - 1, a = points[0], b = points[last]
  const dx = b[0] - a[0], dy = b[1] - a[1], d = dx * dx + dy * dy
  let farthest = 0, index = 0
  for (let i = 1; i < last; i++) {
    const p = points[i], t = d ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d)) : 0
    const distance = (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2
    if (distance > farthest) { farthest = distance; index = i }
  }
  return farthest > tolerance ** 2 ? [...simplified(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplified(points.slice(index), tolerance)] : [a, b]
}
function add(ids, label, features, note) {
  if (!features.length) throw new Error(`No boundary: ${label}`)
  const polygons = features.flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates)
    .filter(poly => poly[0].length >= 4)
    .map(poly => poly.map(ring => { const s = simplified(ring); return (s.length >= 4 ? s : ring).map(p => p.map(n => +n.toFixed(5))) }))
  records[label] = { geometry: { type: 'MultiPolygon', coordinates: polygons }, source: features.every(f => f.properties.ADMIN) ? 'https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/' : source }
  for (const id of ids.split(' ')) assignments[id] = { label, keys: [label], note: note || 'The accepted homeland follows the actual regional boundary, not a radius around the reference pin. Boundaries are generalized for a world-map quiz.' }
}
function nation(ids, country, label = country) {
  let selected = countries.filter(f => f.properties.ADMIN === country)
  // The European home region, not overseas territories, is intended here.
  if (['France', 'Netherlands', 'Portugal'].includes(country)) selected = selected.map(f => ({ ...f, geometry: { type: 'MultiPolygon', coordinates: (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).filter(p => p[0].every(([x, y]) => x > -15 && x < 20 && y > 30)) } }))
  add(ids, label, selected, 'The whole national homeland receives full credit. The map pin is a reference location, not the scoring target.')
}
function region(ids, country, names, label = names.join(' and ')) {
  const selected = provinces.filter(f => f.properties.admin === country && names.includes(f.properties.name))
  for (const name of names) if (!selected.some(f => f.properties.name === name)) throw new Error(`Missing ${country}: ${name}`)
  add(ids, label, selected)
}
function group(ids, country, key, values, label) { add(ids, label, provinces.filter(f => f.properties.admin === country && values.includes(f.properties[key]))) }

nation('dutch-warmblood dutch-harness friesian', 'Netherlands')
nation('nonius gidran furioso-north-star kisber-felver shagya-arabian', 'Hungary')
nation('lusitano', 'Portugal', 'Mainland Portugal')
nation('danish-warmblood', 'Denmark')
nation('belgian-warmblood', 'Belgium')
nation('belarus-harness', 'Belarus')
nation('latvian-horse', 'Latvia')
nation('estonian-native', 'Estonia')
nation('ukrainian-riding', 'Ukraine')
nation('karabair', 'Uzbekistan')
nation('kyrgyz-horse', 'Kyrgyzstan')
nation('galiceno', 'Mexico')
nation('american-miniature quarter-horse', 'United States of America', 'United States')
nation('swiss-warmblood', 'Switzerland')
nation('selle-francais', 'France', 'Metropolitan France')
nation('basotho-pony', 'Lesotho')
nation('zemaitukas', 'Lithuania')
nation('swedish-warmblood', 'Sweden')
nation('croatian-coldblood', 'Croatia')
add('arabian', 'Arabian Peninsula and neighboring desert traditions', countries.filter(f => ['Saudi Arabia', 'Yemen', 'Oman', 'United Arab Emirates', 'Kuwait', 'Qatar', 'Bahrain', 'Jordan'].includes(f.properties.ADMIN)), 'The peninsula and neighboring desert breeding traditions are accepted across country borders.')
region('paint-horse mustang spanish-mustang', 'United States of America', ['Washington', 'Oregon', 'California', 'Idaho', 'Nevada', 'Montana', 'Wyoming', 'Utah', 'Colorado', 'Arizona', 'New Mexico', 'Texas', 'Oklahoma', 'Kansas', 'Nebraska', 'South Dakota', 'North Dakota'], 'Western United States and Great Plains')
add('irish-cob irish-draught irish-sport-horse', 'Island of Ireland', [
  ...countries.filter(f => f.properties.ADMIN === 'Ireland'),
  ...provinces.filter(f => f.properties.admin === 'United Kingdom' && f.properties.region === 'Northern Ireland'),
], 'Both parts of the island are accepted for these island-wide breeding traditions.')
add('paso-fino', 'Puerto Rico and Colombia', countries.filter(f => ['Puerto Rico', 'Colombia'].includes(f.properties.ADMIN)), 'Both national breeding traditions receive full credit, without filling the sea between them.')
add('barb', 'Morocco, Algeria and Tunisia', countries.filter(f => ['Morocco', 'Algeria', 'Tunisia'].includes(f.properties.ADMIN)), 'The three principal Maghreb homelands are accepted; this cross-border tradition is not confined to one town.')

region('gelderlander', 'Netherlands', ['Gelderland'])
region('groningen', 'Netherlands', ['Groningen'])
region('mangalarga-marchador campolina', 'Brazil', ['Minas Gerais'])
region('mangalarga-paulista', 'Brazil', ['São Paulo'])
region('boulonnais', 'France', ['Pas-de-Calais'])
group('breton', 'France', 'region', ['Bretagne'], 'Brittany')
group('french-trotter', 'France', 'region', ['Normandie'], 'Normandy')
group('corsican-horse', 'France', 'region', ['Corse'], 'Corsica')
region('comtois', 'France', ['Doubs', 'Jura', 'Haute-Saône', 'Territoire de Belfort'], 'Historic Franche-Comté')
region('auxois', 'France', ["Côte-d'Or", 'Nièvre', 'Saône-et-Loire', 'Yonne'], 'Historic Burgundy')
region('auvergne-horse', 'France', ['Puy-de-Dôme', 'Allier', 'Haute-Loire', 'Cantal'], 'Historic Auvergne')
region('suffolk-punch', 'United Kingdom', ['Suffolk', 'Norfolk'], 'Suffolk and Norfolk')
region('fell-pony', 'United Kingdom', ['Cumbria'], 'Cumbria')
region('highland-pony', 'United Kingdom', ['Highland', 'Eilean Siar', 'Argyll and Bute', 'Perthshire and Kinross'], 'Highlands and western islands')
group('welsh-cob', 'United Kingdom', 'region', ['West Wales and the Valleys', 'East Wales'], 'Wales')
region('dartmoor-pony', 'United Kingdom', ['Devon'], 'Devon and Dartmoor')
region('hackney-horse', 'United Kingdom', ['Norfolk', 'North Yorkshire', 'East Riding of Yorkshire'], 'Norfolk and Yorkshire')
region('american-cream-draft', 'United States of America', ['Iowa'])
region('american-saddlebred rocky-mountain-horse', 'United States of America', ['Kentucky'])
region('florida-cracker', 'United States of America', ['Florida'])
region('tennessee-walker', 'United States of America', ['Tennessee'])
region('waler', 'Australia', ['New South Wales'])
region('bashkir-horse', 'Russia', ['Bashkortostan'])
region('budyonny don-horse', 'Russia', ['Rostov'], 'Lower Don / Rostov region')
region('vyatka', 'Russia', ['Kirov', 'Udmurt'], 'Kirov and Udmurtia')
region('tersk', 'Russia', ["Stavropol'"], 'Stavropol Krai')
region('bavarian-warmblood south-german-coldblood', 'Germany', ['Bayern'], 'Bavaria')
region('hanoverian oldenburg', 'Germany', ['Niedersachsen'], 'Lower Saxony')
region('holsteiner', 'Germany', ['Schleswig-Holstein'])
region('westphalian', 'Germany', ['Nordrhein-Westfalen'], 'North Rhine-Westphalia')
region('brandenburger', 'Germany', ['Brandenburg'])
region('mecklenburger', 'Germany', ['Mecklenburg-Vorpommern'])
region('asturcon', 'Spain', ['Asturias'])
region('burguete jaca-navarra', 'Spain', ['Navarra'])
region('freiberger', 'Switzerland', ['Jura'])
region('tori-horse', 'Estonia', ['Pärnu'], 'Pärnu County')
region('abtenauer', 'Austria', ['Salzburg'])
region('manipuri-pony', 'India', ['Manipur'])
region('medimurje', 'Croatia', ['Medimurska'], 'Međimurje')
region('malopolski', 'Poland', ['Lesser Poland'])
region('sokolski', 'Poland', ['Podlachian'], 'Podlaskie')
region('jeju-horse', 'South Korea', ['Jeju'], 'Jeju Island')
region('messara', 'Greece', ['Kriti'], 'Crete')
region('arravani', 'Greece', ['Peloponnisos', 'Dytiki Ellada'], 'Peloponnese and western Greece')
region('batak-pony', 'Indonesia', ['Sumatera Utara'], 'North Sumatra')
region('murgese', 'Italy', ['Foggia', 'Barletta-Andria Trani', 'Bari', 'Brindisi', 'Lecce', 'Taranto'], 'Apulia')
group('sardinian-anglo-arab', 'Italy', 'region', ['Sardegna'], 'Sardinia')
region('pleven', 'Bulgaria', ['Pleven'])
region('kiger-mustang', 'United States of America', ['Oregon'], 'Oregon (Kiger herd reference)')
region('java-pony', 'Indonesia', ['Jawa Timur', 'Jawa Tengah', 'Jawa Barat', 'Jakarta Raya', 'Banten', 'Yogyakarta'], 'Java')
region('san-fratellano', 'Italy', ['Messina'], 'Messina and the Nebrodi Mountains')
region('rhenish-german-coldblood', 'Germany', ['Nordrhein-Westfalen', 'Rheinland-Pfalz'], 'Rhineland breeding region')
region('frederiksborg', 'Denmark', ['Sjaælland', 'Hovedstaden'], 'Zealand and the capital region')
region('trait-du-nord', 'France', ['Nord', 'Pas-de-Calais'], 'Nord and Pas-de-Calais')
region('chilean-horse', 'Chile', ['Valparaíso', 'Región Metropolitana de Santiago', "Libertador General Bernardo O'Higgins", 'Maule', 'Bío-Bío'], 'Central Chile')

for (const [path, data] of [['src/auditedBoundaries.json', records], ['src/boundaryAssignments.json', assignments]]) {
  const previous = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : null
  const content = JSON.stringify(data) + '\n'
  const patch = `*** Begin Patch\n${previous === null ? `*** Add File: ${path}\n` : `*** Update File: ${path}\n@@\n${previous.trimEnd().split('\n').map(l => '-' + l).join('\n')}\n`}${content.trimEnd().split('\n').map(l => '+' + l).join('\n')}\n*** End Patch\n`
  const result = spawnSync('apply_patch', [], { input: patch, encoding: 'utf8', maxBuffer: 10_000_000 })
  if (result.status !== 0) throw new Error(result.stderr + result.stdout)
  console.log(path, content.length, 'bytes')
}
console.log(Object.keys(assignments).length, 'breed regions updated')
