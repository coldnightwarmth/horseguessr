import geometryData from './originGeometries.json'

export type MapPoint = { lat: number; lng: number }
type Coordinate = [number, number]
type PolygonGeometry = { type: 'Polygon'; coordinates: Coordinate[][] }
type MultiPolygonGeometry = { type: 'MultiPolygon'; coordinates: Coordinate[][][] }
export type RegionGeometry = PolygonGeometry | MultiPolygonGeometry

type BoundaryRecord = { geometry: RegionGeometry; source: string }
const boundaries = geometryData as unknown as Record<string, BoundaryRecord>

export type OriginZone = {
  label: string
  note: string
  sources: string[]
} & (
  | { kind: 'circle'; center: MapPoint; radiusKm: number }
  | { kind: 'polygon'; geometry: RegionGeometry }
)

function circle(label: string, note: string, lat: number, lng: number, radiusKm: number): OriginZone {
  return {
    kind: 'circle', label, note, center: { lat, lng }, radiusKm,
    sources: [`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=8/${lat}/${lng}`],
  }
}

function manualPolygon(label: string, note: string, coordinates: Coordinate[]): OriginZone {
  return {
    kind: 'polygon', label, note,
    geometry: { type: 'Polygon', coordinates: [[...coordinates, coordinates[0]]] },
    sources: ['https://www.openstreetmap.org/'],
  }
}

function polygon(label: string, note: string, ...keys: string[]): OriginZone {
  const records = keys.map(key => boundaries[key])
  const polygons = records.flatMap(record => record.geometry.type === 'Polygon' ? [record.geometry.coordinates] : record.geometry.coordinates)
  const geometry: RegionGeometry = polygons.length === 1
    ? { type: 'Polygon', coordinates: polygons[0] }
    : { type: 'MultiPolygon', coordinates: polygons }
  return { kind: 'polygon', label, note, geometry, sources: [...new Set(records.map(record => record.source))] }
}

const specificStud = 'A generous local zone recognizes the breed’s famously documented founding stud or town.'
const namedRegion = 'The full-score area follows the named geographic or administrative region associated with the breed.'
const broadHomeland = 'The whole historic homeland is accepted because regional knowledge matters more than guessing an arbitrary point.'

export const originZones: Record<string, OriginZone> = {
  'akhal-teke': polygon('Turkmenistan', broadHomeland, 'Turkmenistan'),
  andalusian: polygon('Andalusia', namedRegion, 'Andalusia, Spain'),
  arabian: manualPolygon('Arabian Peninsula', broadHomeland, [[34.4, 29.9], [40.2, 32.1], [51.5, 30.1], [56.8, 26.2], [57.6, 17.0], [53.0, 12.0], [43.2, 12.1], [39.0, 16.2]]),
  clydesdale: polygon('South Lanarkshire and the Clyde valley', namedRegion, 'South Lanarkshire, Scotland'),
  friesian: polygon('Friesland', namedRegion, 'Friesland, Netherlands'),
  icelandic: polygon('Iceland', broadHomeland, 'Iceland'),
  marwari: polygon('Rajasthan', namedRegion, 'Rajasthan, India'),
  mongolian: polygon('Mongolia', broadHomeland, 'Mongolia'),
  appaloosa: circle('The Palouse and inland Northwest', 'A broad local zone covers the Palouse heartland on both sides of the modern state border.', 46.73, -117.0, 320),
  percheron: polygon('Orne and Le Perche', namedRegion, 'Orne, France'),
  shire: polygon('England', broadHomeland, 'England, United Kingdom'),
  fjord: polygon('Western Norway', namedRegion, 'Vestland, Norway'),
  lipizzan: circle('Lipica and the Karst', specificStud, 45.67, 13.88, 90),
  haflinger: polygon('South Tyrol', namedRegion, 'South Tyrol, Italy'),
  falabella: polygon('Buenos Aires Province', namedRegion, 'Provincia de Buenos Aires, Argentina'),
  'australian-stock': polygon('New South Wales', namedRegion, 'New South Wales, Australia'),
  shetland: polygon('Shetland Islands', namedRegion, 'Shetland Islands, Scotland'),
  'belgian-draft': polygon('Belgium', broadHomeland, 'Belgium'),
  'quarter-horse': polygon('Virginia', 'The colonial Virginia homeland receives full credit across the modern state.', 'Virginia, United States'),
  thoroughbred: polygon('England', broadHomeland, 'England, United Kingdom'),
  'tennessee-walker': circle('Middle Tennessee', 'A generous regional radius covers the breed’s central Tennessee nursery rather than one town.', 35.86, -86.35, 260),
  morgan: polygon('Vermont', namedRegion, 'Vermont, United States'),
  'peruvian-paso': polygon('Peru', broadHomeland, 'Peru'),
  'orlov-trotter': circle('Khrenovoye Stud district', specificStud, 51.91, 40.35, 110),
  finnhorse: polygon('Finland', broadHomeland, 'Finland'),
  merens: polygon('Ariège', namedRegion, 'Ariège, France'),
  knabstrupper: circle('Knabstrup and western Zealand', specificStud, 55.69, 11.53, 90),
  'paint-horse': manualPolygon('American West', broadHomeland, [[-124.8, 49.0], [-100.0, 49.0], [-100.0, 25.8], [-106.5, 25.8], [-117.2, 32.3], [-124.8, 42.0]]),
  connemara: polygon('County Galway', namedRegion, 'County Galway, Ireland'),
  'black-forest': polygon('Baden-Württemberg', 'The accepted area generously covers the Black Forest breed’s home state.', 'Baden-Württemberg, Germany'),
  'ljutomer-trotter': circle('Ljutomer and the Mura region', specificStud, 46.52, 16.20, 100),
  'cape-boerperd': polygon('The historic Cape provinces', 'Both the Western and Eastern Cape are accepted for this regional South African breed.', 'Western Cape, South Africa', 'Eastern Cape, South Africa'),
  nonius: circle('Mezőhegyes district', specificStud, 46.32, 20.82, 110),
  gidran: circle('Mezőhegyes district', specificStud, 46.32, 20.82, 110),
  'furioso-north-star': circle('Mezőhegyes district', specificStud, 46.32, 20.82, 110),
  'kisber-felver': circle('Kisbér district', specificStud, 47.50, 18.03, 90),
  'shagya-arabian': circle('Bábolna district', specificStud, 47.64, 17.98, 90),
  hucul: manualPolygon('Eastern Carpathians', 'A broad mountain corridor covers the breed’s cross-border Carpathian homeland.', [[18.5, 49.9], [22.3, 50.2], [26.8, 48.7], [27.1, 45.0], [24.2, 44.4], [20.8, 46.1], [18.2, 48.3]]),
  kladruber: circle('Kladruby nad Labem district', specificStud, 50.06, 15.49, 80),
  konik: circle('Biłgoraj and southeastern Poland', 'The full-score zone covers the traditional Biłgoraj region rather than one coordinate.', 50.54, 22.72, 150),
  yakutian: polygon('Sakha Republic', namedRegion, 'Sakha Republic, Russia'),
  caspian: manualPolygon('Southern Caspian coast', 'The accepted coastal belt spans the historic northern Iranian homeland.', [[47.2, 39.0], [54.8, 38.8], [55.7, 36.0], [52.2, 35.2], [48.0, 36.1]]),
  kathiawari: polygon('Gujarat and the Kathiawar peninsula', namedRegion, 'Gujarat, India'),
  sorraia: manualPolygon('Sorraia–Tagus basin', 'A generous river-basin zone covers the central Portuguese homeland.', [[-9.45, 40.1], [-7.2, 40.1], [-7.35, 37.8], [-9.5, 37.8]]),
  'dales-pony': polygon('Yorkshire Dales and Pennines', namedRegion, 'Yorkshire Dales National Park, United Kingdom'),
  'eriskay-pony': circle('Eriskay and the southern Outer Hebrides', 'The island itself is tiny on a world map, so nearby islands and waters are accepted too.', 57.07, -7.31, 80),
  bardigiano: polygon('Province of Parma', namedRegion, 'Parma, Italy'),
  maremmano: polygon('Maremma, Tuscany and Lazio', 'The whole Tuscan–Lazio heartland is accepted for this regional working horse.', 'Tuscany, Italy', 'Lazio, Italy'),
  nordlandshest: polygon('Northern Norway', 'Nordland, Troms, and Finnmark all receive full credit.', 'Nordland, Norway', 'Troms, Norway', 'Finnmark, Norway'),
  'gotland-russ': polygon('Gotland County', namedRegion, 'Gotland County, Sweden'),
  noriker: polygon('Austria', broadHomeland, 'Austria'),
  'cleveland-bay': polygon('North Yorkshire', namedRegion, 'North Yorkshire, England'),
  giara: circle('Giara di Gesturi plateau', 'The plateau is tiny on a world map, so its surrounding central Sardinian district is accepted.', 39.75, 8.98, 80),
  garrano: circle('Peneda–Gerês and northern Portugal', 'A broad mountain zone covers the breed’s cross-border upland range.', 41.80, -8.15, 160),
  'kerry-bog-pony': polygon('County Kerry', namedRegion, 'County Kerry, Ireland'),
  'exmoor-pony': polygon('Exmoor National Park', namedRegion, 'Exmoor National Park, United Kingdom'),
  camargue: polygon('Camargue Regional Natural Park', namedRegion, 'Parc naturel régional de Camargue, France'),
  poitevin: polygon('Historic Poitou', 'Deux-Sèvres, Vienne, and Charente-Maritime form a generous modern approximation of historic Poitou.', 'Deux-Sèvres, France', 'Vienne, France', 'Charente-Maritime, France'),
  'mangalarga-marchador': circle('Minas Gerais', 'A broad full-score zone covers the breed’s large historic home state rather than one farm.', -18.60, -44.30, 520),
  boulonnais: circle('Boulonnais and Pas-de-Calais', 'The coastal Boulonnais heartland and surrounding department receive full credit.', 50.73, 1.62, 140),
  comtois: circle('Franche-Comté', 'A broad regional zone covers the historic Comtois homeland along the Jura.', 47.24, 6.02, 190),
  campolina: circle('Central Minas Gerais', 'The full-score zone generously covers the breed’s founding district and neighboring farms.', -20.67, -44.07, 330),
  zemaitukas: manualPolygon('Lithuania', broadHomeland, [[20.8, 56.5], [26.8, 56.5], [26.8, 53.8], [22.7, 53.8], [21.0, 55.2]]),
  karabakh: circle('Karabakh highlands', 'A generous highland region is accepted rather than a single modern administrative point.', 39.81, 46.75, 190),
  breton: circle('Brittany', namedRegion, 48.20, -2.93, 260),
  ardennais: circle('The Ardennes', 'The accepted zone spans the cross-border forested Ardennes region.', 49.85, 4.65, 230),
}

function haversine(a: MapPoint, b: MapPoint) {
  const toRad = (value: number) => value * Math.PI / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function ringsForGeometry(geometry: RegionGeometry): Coordinate[][] {
  return geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.coordinates.flatMap(polygonCoordinates => polygonCoordinates)
}

function polygonOuters(geometry: RegionGeometry): Coordinate[][] {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates[0]]
    : geometry.coordinates.map(polygonCoordinates => polygonCoordinates[0])
}

function isInsideRing(point: MapPoint, ring: Coordinate[]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > point.lat) !== (yj > point.lat) && point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function isInsideGeometry(point: MapPoint, geometry: RegionGeometry) {
  if (geometry.type === 'Polygon') {
    return isInsideRing(point, geometry.coordinates[0]) && !geometry.coordinates.slice(1).some(ring => isInsideRing(point, ring))
  }
  return geometry.coordinates.some(poly => isInsideRing(point, poly[0]) && !poly.slice(1).some(ring => isInsideRing(point, ring)))
}

function segmentDistance(point: MapPoint, a: Coordinate, b: Coordinate) {
  const latScale = 110.574
  const lngScale = 111.320 * Math.cos(point.lat * Math.PI / 180)
  const ax = (a[0] - point.lng) * lngScale
  const ay = (a[1] - point.lat) * latScale
  const bx = (b[0] - point.lng) * lngScale
  const by = (b[1] - point.lat) * latScale
  const dx = bx - ax
  const dy = by - ay
  const denominator = dx * dx + dy * dy
  const t = denominator ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator)) : 0
  const x = ax + t * dx
  const y = ay + t * dy
  return {
    distance: Math.hypot(x, y),
    nearest: { lat: a[1] + (b[1] - a[1]) * t, lng: a[0] + (b[0] - a[0]) * t },
  }
}

export function distanceToOriginZone(point: MapPoint, zone: OriginZone) {
  if (zone.kind === 'circle') {
    const centerDistance = haversine(point, zone.center)
    if (centerDistance <= zone.radiusKm) return { inside: true, distance: 0, nearest: point }
    const ratio = zone.radiusKm / centerDistance
    return {
      inside: false,
      distance: centerDistance - zone.radiusKm,
      nearest: {
        lat: zone.center.lat + (point.lat - zone.center.lat) * ratio,
        lng: zone.center.lng + (point.lng - zone.center.lng) * ratio,
      },
    }
  }

  if (isInsideGeometry(point, zone.geometry)) return { inside: true, distance: 0, nearest: point }
  let best = { distance: Number.POSITIVE_INFINITY, nearest: point }
  for (const ring of ringsForGeometry(zone.geometry)) {
    for (let index = 1; index < ring.length; index++) {
      const candidate = segmentDistance(point, ring[index - 1], ring[index])
      if (candidate.distance < best.distance) best = candidate
    }
  }
  return { inside: false, ...best }
}

export function originZoneBounds(zone: OriginZone): [MapPoint, MapPoint] {
  if (zone.kind === 'circle') {
    const latRadius = zone.radiusKm / 110.574
    const lngRadius = zone.radiusKm / (111.320 * Math.max(0.2, Math.cos(zone.center.lat * Math.PI / 180)))
    return [
      { lat: zone.center.lat - latRadius, lng: zone.center.lng - lngRadius },
      { lat: zone.center.lat + latRadius, lng: zone.center.lng + lngRadius },
    ]
  }
  const points = polygonOuters(zone.geometry).flat()
  return [
    { lat: Math.min(...points.map(point => point[1])), lng: Math.min(...points.map(point => point[0])) },
    { lat: Math.max(...points.map(point => point[1])), lng: Math.max(...points.map(point => point[0])) },
  ]
}
