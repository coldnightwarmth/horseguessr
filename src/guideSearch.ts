export function normalizeGuideText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[–—-]/g, ' ').replace(/\s+/g, ' ').trim()
}

function editDistance(left: string, right: string) {
  const rows = left.length + 1
  const columns = right.length + 1
  const distances = Array.from({ length: rows }, () => Array<number>(columns).fill(0))
  for (let row = 0; row < rows; row++) distances[row][0] = row
  for (let column = 0; column < columns; column++) distances[0][column] = column

  for (let row = 1; row < rows; row++) {
    for (let column = 1; column < columns; column++) {
      const substitution = left[row - 1] === right[column - 1] ? 0 : 1
      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + substitution,
      )
      if (row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1]) {
        distances[row][column] = Math.min(distances[row][column], distances[row - 2][column - 2] + 1)
      }
    }
  }
  return distances[left.length][right.length]
}

export function suggestBreedName<T extends { name: string }>(query: string, choices: T[]): T | null {
  const needle = normalizeGuideText(query)
  if (needle.length < 3) return null
  const candidates = choices.map(choice => {
    const name = normalizeGuideText(choice.name)
    return { choice, distance: editDistance(needle, name), lengthGap: Math.abs(needle.length - name.length) }
  }).sort((a, b) => a.distance - b.distance || a.lengthGap - b.lengthGap || a.choice.name.localeCompare(b.choice.name))
  const best = candidates[0]
  if (!best) return null
  const allowance = needle.length <= 4 ? 1 : needle.length <= 8 ? 2 : Math.min(5, Math.round(needle.length * 0.3))
  return best.distance <= allowance ? best.choice : null
}
