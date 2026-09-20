import type { Breed } from './data'

export type PracticeRegionId = 'world' | 'europe' | 'north-america' | 'turan'

type PracticeRegion = {
  label: string
  kicker: string
  description: string
  distanceScaleKm: number
  mapBounds: [[number, number], [number, number]] | null
  badge: string
}

export const practiceRegions: Record<PracticeRegionId, PracticeRegion> = {
  world: {
    label: 'World', kicker: 'THE CLASSIC RIDE',
    description: 'Every breed in the stable, across all the homelands on the globe.',
    distanceScaleKm: 2100, mapBounds: null, badge: '🌍',
  },
  europe: {
    label: 'Europe', kicker: 'OLD-WORLD STABLES',
    description: 'European breed origins, excluding present-day Russia, Kazakhstan, and Turkey.',
    distanceScaleKm: 900, mapBounds: [[34, -26], [72, 38]], badge: '🏰',
  },
  'north-america': {
    label: 'North America', kicker: 'ACROSS THE RANGE',
    description: 'Breeds originating in Canada, the United States, and Mexico.',
    distanceScaleKm: 1250, mapBounds: [[13, -129], [63, -51]], badge: '🏇',
  },
  turan: {
    label: 'Turan', kicker: 'STEPPE TO EAST ASIA',
    description: 'The broad horse-culture belt from Hungary and the Finnic north through the Eurasian steppe, Turkic and Mongolic regions, Korea, and Japan.',
    distanceScaleKm: 1600, mapBounds: [[30, 12], [73, 145]], badge: '✦',
  },
}

const europeanCountries = new Set([
  'Austria', 'Belgium', 'Belgium and France', 'Czechia', 'Denmark', 'England',
  'Finland', 'France', 'Germany', 'Hungary', 'Iceland', 'Ireland', 'Italy',
  'Lithuania', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Scotland',
  'Slovenia', 'Spain', 'Spain and France', 'Sweden', 'Ukraine', 'United Kingdom',
])

const northAmericanCountries = new Set(['Canada', 'United States', 'Mexico'])

// This is intentionally broader than a narrow geographic definition of Turan:
// it follows the player's requested cultural corridor. Some breeds also belong
// to Europe. Trakehner is excluded from Europe because its founding stud is in
// present-day Russia, despite its historic East Prussian/German association.
const turanBreedIds = new Set([
  'akhal-teke', 'mongolian', 'orlov-trotter', 'finnhorse', 'nonius', 'gidran',
  'furioso-north-star', 'kisber-felver', 'shagya-arabian', 'hucul', 'yakutian',
  'caspian', 'karabakh', 'don-horse', 'bashkir-horse', 'jeju-horse', 'noma-horse',
])

export function breedsForPracticeRegion(region: PracticeRegionId, allBreeds: Breed[]): Breed[] {
  switch (region) {
    case 'world': return allBreeds
    case 'europe': return allBreeds.filter(breed => europeanCountries.has(breed.country) && breed.id !== 'trakehner')
    case 'north-america': return allBreeds.filter(breed => northAmericanCountries.has(breed.country))
    case 'turan': return allBreeds.filter(breed => turanBreedIds.has(breed.id))
  }
}

export function pointsForOriginGuess(distanceKm: number, region: PracticeRegionId, usedHint: boolean): number {
  const distanceScaleKm = practiceRegions[region].distanceScaleKm
  const base = distanceKm <= 0 ? 5000 : Math.round(5000 * Math.exp(-distanceKm / distanceScaleKm))
  return Math.max(0, Math.round(base * (usedHint ? 0.75 : 1)))
}
