import type { Breed } from './data'
import { distanceToOriginZone, originZones } from './originRegions'

export type AtlasPoint = { lat: number; lng: number }
export type AtlasPlace = AtlasPoint & { label: string }
export type NearbyBreed = { breed: Breed; regionKm: number; pinKm: number }

const CACHE_KEY = 'horseguessr-atlas-place-cache-v1'
const GEOCODER_URL = import.meta.env.VITE_ATLAS_GEOCODER_URL || 'https://nominatim.openstreetmap.org/search'
let lastLookupAt = 0

function distanceKm(a: AtlasPoint, b: AtlasPoint) {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const deltaLat = radians(b.lat - a.lat)
  const deltaLng = radians(b.lng - a.lng)
  const term = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(deltaLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(term), Math.sqrt(1 - term))
}

export function nearestBreedOrigins(point: AtlasPoint, choices: Breed[], limit = 6): NearbyBreed[] {
  return choices.map(breed => ({
    breed,
    regionKm: distanceToOriginZone(point, originZones[breed.id]).distance,
    pinKm: distanceKm(point, breed),
  })).sort((a, b) => a.regionKm - b.regionKm || a.pinKm - b.pinKm || a.breed.name.localeCompare(b.breed.name)).slice(0, limit)
}

function readCache(): Record<string, AtlasPlace> {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}') as Record<string, AtlasPlace>
  } catch {
    return {}
  }
}

function rememberPlace(query: string, place: AtlasPlace) {
  try {
    const entries = Object.entries(readCache()).filter(([key]) => key !== query).slice(-29)
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries([...entries, [query, place]])))
  } catch {
    // Place search still works when storage is unavailable.
  }
}

export async function lookupAtlasPlace(query: string, signal?: AbortSignal): Promise<AtlasPlace | null> {
  const normalized = query.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!normalized) return null
  const cached = readCache()[normalized]
  if (cached) return cached

  const waitMs = Math.max(0, 1100 - (Date.now() - lastLookupAt))
  if (waitMs) await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, waitMs)
    signal?.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('Place search canceled', 'AbortError')) }, { once: true })
  })
  if (signal?.aborted) throw new DOMException('Place search canceled', 'AbortError')
  lastLookupAt = Date.now()

  const url = new URL(GEOCODER_URL)
  url.searchParams.set('q', query.trim())
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Place search returned ${response.status}`)
  const matches: unknown = await response.json()
  if (!Array.isArray(matches) || !matches.length) return null
  const result = matches[0] as { display_name?: unknown; lat?: unknown; lon?: unknown }
  const lat = Number(result.lat)
  const lng = Number(result.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || typeof result.display_name !== 'string') return null
  const place = { label: result.display_name, lat, lng }
  rememberPlace(normalized, place)
  return place
}
