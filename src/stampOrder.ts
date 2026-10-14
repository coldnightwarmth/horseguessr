import type { Breed } from './data'

/** Unordered/newly collected stamps follow the explicitly arranged stamps alphabetically. */
export function orderedStamps(items: Breed[], collected: string[], order: string[]) {
  const alphabetical = [...items].sort((a, b) => a.name.localeCompare(b.name, 'en'))
  const earned = alphabetical.filter(breed => collected.includes(breed.id))
  const arranged = [...new Set(order)].flatMap(id => earned.filter(breed => breed.id === id))
  return [...arranged, ...earned.filter(breed => !order.includes(breed.id)), ...alphabetical.filter(breed => !collected.includes(breed.id))]
}

export function moveStamp(ids: string[], id: string, direction: 'first' | 'left' | 'right') {
  const next = [...ids]
  const index = next.indexOf(id)
  if (index < 0) return next
  if (direction === 'first') { next.splice(index, 1); next.unshift(id); return next }
  const target = index + (direction === 'left' ? -1 : 1)
  if (target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
