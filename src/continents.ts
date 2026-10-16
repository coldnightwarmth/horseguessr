import type { Breed } from './data'

// Origin, not the modern distribution of the breed. Transcontinental homelands
// deliberately reveal both continents rather than a misleading single answer.
export function continentForBreed(breed: Breed): string {
  if (breed.country === 'Puerto Rico and Colombia') return 'North and South America'
  if (breed.country === 'Russia') return breed.lng < 60 ? 'Europe and Asia' : 'Asia'
  if (['Turkey', 'Kazakhstan'].includes(breed.country)) return 'Europe and Asia'
  if (['Canada', 'United States', 'Mexico'].includes(breed.country)) return 'North America'
  if (['Argentina', 'Argentina and Uruguay', 'Brazil', 'Chile', 'Peru', 'Uruguay', 'Colombia', 'Venezuela'].includes(breed.country)) return 'South America'
  if (['Australia', 'New Zealand'].includes(breed.country)) return 'Oceania'
  if (['South Africa', 'Lesotho', 'Namibia', 'Morocco and North Africa', 'Tunisia', 'Ethiopia', 'Senegal', 'Niger', 'Nigeria', 'Sudan', 'Chad and Cameroon', 'Cameroon', 'Botswana'].includes(breed.country)) return 'Africa'
  if (['China', 'Japan', 'South Korea', 'India', 'Indonesia', 'Iran', 'Saudi Arabia', 'Mongolia', 'Turkmenistan', 'Kyrgyzstan', 'Uzbekistan', 'Azerbaijan', 'Pakistan', 'Nepal', 'Bhutan', 'Vietnam', 'Thailand', 'Myanmar'].includes(breed.country)) return 'Asia'
  return 'Europe'
}
