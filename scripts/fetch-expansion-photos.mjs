import { execFile } from 'node:child_process'
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const root = new URL('../', import.meta.url)
const source = await readFile(new URL('src/breedExpansion.ts', root), 'utf8')
const breeds = source.split('\n').filter(line => line.includes("{ id: '")).map(line => ({
  id: line.match(/\{ id: '([^']+)'/)?.[1],
  name: line.match(/name: '([^']+)'/)?.[1],
  wiki: line.match(/wiki: '([^']+)'/)?.[1],
})).filter(breed => breed.id && breed.name && breed.wiki)
const targetDir = new URL('public/horses/expansion/', root)
await mkdir(targetDir, { recursive: true })

const headers = { 'User-Agent': 'HorseGuessr/1.0 (educational breed game; photo curation)' }
const badWords = /\b(dystocia|statistique|state archives|national archives|national archive|atlas|head|portrait|tête|kopf|rider|riders|riding|rideing|ridden|jockey|trainer|horseman|girl|boy|joven|jongen|familie|sign|signs|carriage|cart|wagon|hitch|hitched|plough|pulling|attelage|vaulting|race|racing|show|championship|statelib|archive|archives|brewery|river|bridge|cruiser|ship|troops|street|stra(?:ß|ss)e|road|building|church|festival|perchtenlauf|statue|sculpture|scultura|terracotta|jug|urn|allegorie|alphabet|princes|drawing|painted|painting|illustration|engraving|poster|logo|map|diagram|pictogram|skeleton|skull|museum|stamp|stamps|coin|coat of arms|palazzo|bodleian|bhl|collectie|tropenmuseum|artwork|culture|karyotype|flag|division|rifle|train|catalog|catalogue|eb1911|ratusz|costume|locator|unconscious|hippocampus|sea-horse|fmib|book plate)\b/i
const rejectedFileTitles = new Set([
  'bosnian mountain horse (bosnian pony).jpg',
  'christian david gebauer - frederiksborg horse.jpg',
  'fotoreproductie van een schilderij van een hackney paard hackney stallion, “rufus” (titel op object), rp-f-2001-7-403-5.jpg',
  'gelderlander.jpg',
  'groningen.jpg',
  'hetrussischewerkpaard.jpg',
  'tersk horse.jpg',
  'the hanoverian horse and british lion met dp884324.jpg',
  'the hanoverian horse and british lion met dp884325.jpg',
])
const goodWords = /\b(horse|horses|pony|ponies|mare|stallion|gelding|foal|cheval|chevaux|caballo|caballos|cavallo|cavalli|paard|paarden|pferd|pferde|konj|konji)\b/i
const queryOverrides = {
  Abtenauer: 'Noriker horse',
  'American Miniature Horse': '"American Miniature Horse" -dystocia',
  'Banker Horse': 'Banker horse Outer Banks',
  'Belgian Warmblood': 'Belgian Warmblood horse -vaulting',
  'Budyonny Horse': '"Two year old budjonny stallions in russia"',
  'Catria Horse': 'Cavallo del Catria horse',
  'Chilean Horse': 'Caballo Chileno Corralero',
  'Corsican Horse': 'Cavallu Corsu horse',
  'Døle Gudbrandsdal': '"Dole eating grass"',
  Hanoverian: 'Hanoverian horse Belagro',
  'Hispano-Bretón': 'Caballo Hispano-Bretón horse',
  'Marajoara Horse': '"Salvaterra, Pará, Brasil - 2013.10.15 (10)"',
}
const preferredFileTitles = {
  'American Miniature Horse': ['Miniature horse at Amarillo Zoo(3290197347).jpg'],
  Arravani: ['Arravani-Stuten.jpg'],
  'Auvergne Horse': ['Cheval-d-auvergneSDA2012.JPG', "Cheval d'Auvergne.jpg"],
  'Batak Pony': ['Batak pony.jpg'],
  'Budyonny Horse': ['Two year old budjonny stallions in russia.jpg', 'Бруч.jpg'],
  'Chilean Horse': ['Quinchao – caballos cerca la carretera W-589, 2019.jpg'],
  'Corsican Horse': ['Chevaux corses.jpg', 'Cumpagnu.jpg'],
  'Døle Gudbrandsdal': ['Dole eating grass.jpg'],
  'Faroe Pony': ['Viking horse - Isole Faroe - panoramio.jpg'],
  Frederiksborg: ['Frederiksborghest.jpg'],
  'Hackney Horse': ['Hackney Horse Stallion CANADANCE.jpg'],
  'Irish Sport Horse': ['Irish Sport Horse foal and mare.jpg', 'Irish Sport Horse - Assagart Lord Lancer standing.jpg'],
  'Manipuri Pony': ['Manipur Pony.jpg'],
  'Marajoara Horse': ['Salvaterra, Pará, Brasil - 2013.10.15 (10).jpg'],
  Karabair: ['Karabair - César Augusto González (2017).jpg'],
  'Pantaneiro Horse': ['Boiada sendo conduzida pelos pantaneiros.jpg'],
  'Retuerta Horse': ['Caballos en Doñana - panoramio.jpg'],
}
const directPhotoOverrides = {
  'Groningen Horse': {
    title: 'File:Groninger stallion Orbaldo II.jpg',
    url: 'https://boktimg.nl/w/images/thumb/5/5e/OrbaldoII.jpg/600px-OrbaldoII.jpg',
    sourceUrl: 'https://www.bokt.nl/wiki/Bestand:OrbaldoII.jpg',
  },
  'Auvergne Horse': {
    title: 'File:Cheval de race Auvergne - SFET.jpg',
    url: 'https://www.sfet.fr/uploads/races/64b7a46e56950.jpg',
    sourceUrl: 'https://www.sfet.fr/les-races/3-chevaux-poneys-de-territoire/15-le-cheval-de-race-auvergne',
  },
  'Basotho Pony': {
    title: 'File:Basotho Pony in Lesotho Highlands.jpg',
    url: 'https://www.claytor.com/photographs/images/picLesothoBasothoPonyTomClaytor.jpg',
    sourceUrl: 'https://www.claytor.com/photographs/',
  },
  'Batak Pony': {
    title: 'File:Batak Pony in Sumatra.jpg',
    url: 'https://cdn.creatures.com/9f6/db8/7a8/1c87f.jpeg',
    sourceUrl: 'https://creatures.com/species/horse/batak-pony',
  },
  'Catria Horse': {
    title: 'File:Catria horses in pasture.jpg',
    url: 'https://www.repstatic.it/content/nazionale/img/2022/04/15/183733711-137c5f6d-4ca6-435a-9a9b-ea5adb156f54.jpg',
    sourceUrl: 'https://www.repubblica.it/dossier/cronaca/la-repubblica-dei-cavalli/2022/04/15/news/cavallo_catria_marche-345637896/',
  },
  'Corsican Horse': {
    title: 'File:Corsican Horse in mountain scrub.jpg',
    url: 'https://cdn.creatures.com/5bd/ecb/33a/7233e.jpeg',
    sourceUrl: 'https://creatures.com/species/horse/corsican-horse',
  },
  Iomud: {
    title: 'File:Yamud stallion.jpg',
    url: 'https://horse.xjau.edu.cn/media/breeds/breeds/Yamud_stallion.png',
    sourceUrl: 'https://horse.xjau.edu.cn/breeds/list/99',
  },
  'Manipuri Pony': {
    title: 'File:Manipuri ponies.jpg',
    url: 'https://images.indianexpress.com/2018/04/pony-inline-759.jpg',
    sourceUrl: 'https://indianexpress.com/article/north-east-india/manipur/manipur-why-the-worlds-original-polo-pony-is-dying/',
  },
  'Marajoara Horse': {
    title: 'File:Salvaterra, Pará, Brasil - 2013.10.15 (10).jpg',
    url: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Salvaterra%2C_Par%C3%A1%2C_Brasil_-_2013.10.15_(10).jpg?width=960',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Salvaterra,_Par%C3%A1,_Brasil_-_2013.10.15_(10).jpg',
  },
  'North Swedish Horse': {
    title: 'File:North Swedish Horse - Nordens Ark.jpg',
    url: 'https://nordensark.se/media/179322/nordsvensk-banner.jpg?height=675&mode=crop&rnd=132810179100000000&widthratio=1.7777777777777777777777777778',
    sourceUrl: 'https://nordensark.se/djuren/lantraser/nordsvensk-hast/',
  },
  'Russian Heavy Draft': {
    title: 'File:Russian Heavy Draft stallion.jpg',
    url: 'https://www.ruhorses.ru/files/docs/457.jpg',
    sourceUrl: 'https://www.ruhorses.ru/breed/russian_heavy/en',
  },
  'San Fratellano': {
    title: 'File:Sanfratellano stallion.jpg',
    url: 'https://www.agraria.org/equini/sanfratellano1.jpg',
    sourceUrl: 'https://www.agraria.org/equini/sanfratellano.htm',
  },
}
const supplementalPhotoOverrides = {
  'Bosnian Mountain Horse': [{
    title: 'File:Bosnian Mountain Horse herd in pasture.jpg',
    url: 'https://zooclub.ru/attach/37000/37219.jpg',
    localUrl: '/horses/expansion/bosnian-mountain-2.jpg',
    sourceUrl: 'https://zooclub.ru/loshadi/porody-loshadey/bosniyskaya-gornaya-loshad-bosniyskiy-poni.shtml',
  }],
  Frederiksborg: [{
    title: 'File:Frederiksborg horse trotting in pasture.jpg',
    url: 'https://dyreportal.dk/media/content/frederiksborg-hest-pony-til-salg.jpeg.jpeg',
    localUrl: '/horses/expansion/frederiksborg-2.jpg',
    sourceUrl: 'https://dyreportal.dk/koeb-heste/frederiksborg',
  }],
  'Hackney Horse': [{
    title: 'File:Mum And Daughter (2899216285).jpg',
    url: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mum%20And%20Daughter%20%282899216285%29.jpg?width=960',
    localUrl: '/horses/expansion/hackney-horse-3.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mum_And_Daughter_(2899216285).jpg',
  }],
  Gelderlander: [{
    title: 'File:Gelderland Horse mare in paddock.jpg',
    url: 'https://www.horsebreedspictures.com/wp-content/uploads/2017/07/Gelderland-Horse-Mare.jpg',
    localUrl: '/horses/expansion/gelderlander-2.jpg',
    sourceUrl: 'https://www.horsebreedspictures.com/gelderland-horse.asp',
  }],
  Hanoverian: [{
    title: 'File:Hanoverian mare standing at stable.jpg',
    url: 'https://cdn.ehorses.media/image/blur/xxldetails/hanoverian-mare-6years-162-hh-brown-dressagehorses-langelsheim_8ddf8119-19a4-43a8-ad98-0c3f8e64ee1a.jpg',
    localUrl: '/horses/expansion/hanoverian-2.jpg',
    sourceUrl: 'https://www.ehorses.com/hanoverian-mare-6years-162-hh-brown-dressagehorses-langelsheim/4244395.html',
  }, {
    title: 'File:Chestnut Hanoverian horse standing in pasture.jpg',
    url: 'https://3.bp.blogspot.com/-99G8c7Jpph0/UUYz7AZE3bI/AAAAAAAAAew/eP9ujjLBoT0/s1600/hanoverian-picture-1.jpg',
    localUrl: '/horses/expansion/hanoverian-3.jpg',
    sourceUrl: 'https://portret-konia.blogspot.com/2013/03/kon-hanowerski.html',
  }],
  'Tersk Horse': [{
    title: 'File:Pantera Tersk mare.jpg',
    url: 'https://rahba.org/foto/horses/path/74/20/02/d8b27c8ac9387ff36d11aa6f7e7c2444.jpg',
    localUrl: '/horses/expansion/tersk-2.jpg',
    sourceUrl: 'https://rahba.org/ru/horse/9405',
  }],
}
const forceDownloadIds = new Set(['auvergne-horse', 'basotho-pony', 'batak-pony', 'catria', 'corsican-horse', 'groningen', 'iomud', 'manipuri-pony', 'north-swedish', 'russian-heavy-draft', 'san-fratellano'])
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function fetchWithRetry(url, attempts = 5) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(url, { headers })
    if (response.ok || (response.status !== 429 && response.status < 500)) return response
    await delay(1_200 * (attempt + 1) ** 2)
  }
  return fetch(url, { headers })
}

async function commonsSearch(query) {
  const params = new URLSearchParams({ search: query, title: 'Special:MediaSearch', type: 'image' })
  const response = await fetchWithRetry(`https://commons.wikimedia.org/w/index.php?${params}`)
  if (!response.ok) throw new Error(`Commons search failed: ${response.status}`)
  const html = await response.text()
  const matches = html.match(/https:\/\/thumb\.wikimedia\.org\/wikipedia\/commons\/thumb\/[^"\\\s<]+\/\d+px-[^"\\\s<]+/gi) ?? []
  const pages = new Map()
  for (const rawUrl of matches) {
    const url = rawUrl.replaceAll('&amp;', '&').split('?')[0]
    const sizeMatch = url.match(/\/(\d+)px-([^/]+)$/)
    if (!sizeMatch) continue
    const width = Number(sizeMatch[1])
    const title = `File:${decodeURIComponent(sizeMatch[2]).replaceAll('_', ' ')}`
    const current = pages.get(title)
    if (!current || width > current.thumbnail.width) {
      pages.set(title, { title, key: title, excerpt: '', thumbnail: { mimetype: 'image/jpeg', width, height: Math.round(width * .75), url } })
    }
  }
  return [...pages.values()]
}

async function wikipediaLeadPhoto(breed) {
  try {
    const response = await fetchWithRetry(`https://en.wikipedia.org/api/rest_v1/page/summary/${breed.wiki}`)
    if (!response.ok) return null
    const summary = await response.json()
    const image = summary.thumbnail
    if (!image?.source || !/\.(?:jpe?g)(?:\/|$)/i.test(image.source.split('?')[0])) return null
    const filename = decodeURIComponent(image.source.split('?')[0].split('/').pop().replace(/^\d+px-/, ''))
    return {
      page: {
        title: `File:${filename}`,
        key: `File:${filename}`,
        excerpt: summary.extract ?? '',
        thumbnail: {
          mimetype: 'image/jpeg', width: image.width, height: image.height, url: image.source,
        },
        exactBreedImage: true,
      },
      score: 1_000,
    }
  } catch {
    return null
  }
}

function scoreCandidate(page, name, order) {
  const info = page.thumbnail
  if (!info || info.mimetype !== 'image/jpeg') return -Infinity
  const title = page.title.replace(/^File:/, '').replaceAll('_', ' ')
  if (rejectedFileTitles.has(title.toLowerCase()) || badWords.test(title) || /\.(?:gif|svg|png)$/i.test(title)) return -Infinity
  const searchableText = `${title} ${page.excerpt?.replace(/<[^>]+>/g, ' ') ?? ''}`
  const ratio = info.width / info.height
  if (ratio < 0.62 || ratio > 2.35) return -Infinity
  const tokens = name.toLowerCase().replace(/[’'()-]/g, ' ').split(/\s+/).filter(token => token.length > 3 && !['horse', 'pony'].includes(token))
  const titleLower = title.toLowerCase()
  const tokenMatches = tokens.filter(token => titleLower.includes(token)).length
  const preferred = preferredFileTitles[name]?.findIndex(item => item.toLowerCase() === titleLower) ?? -1
  if (preferred < 0 && tokenMatches < tokens.length) return -Infinity
  if (preferred < 0 && tokens.length === 1 && !goodWords.test(title)) {
    const simpleTitle = titleLower.replace(/\.[a-z]+$/, '').replace(/[_-]+/g, ' ').replace(/\b(?:cropped|copy)\b/g, '').replace(/\d+/g, '').replace(/\s+/g, ' ').trim()
    if (simpleTitle !== tokens[0]) return -Infinity
  }
  return 100 - order + tokenMatches * 32 + (goodWords.test(searchableText) ? 12 : 0) - (badWords.test(title) ? 120 : 0) + (ratio >= 0.8 && ratio <= 1.7 ? 10 : 0) + (preferred >= 0 ? 2_500 - preferred : 0)
}

async function candidatesFor(breed) {
  const leadPhoto = await wikipediaLeadPhoto(breed)
  const direct = directPhotoOverrides[breed.name]
  const directPhoto = direct ? {
    page: {
      title: direct.title,
      key: direct.title,
      excerpt: '',
      thumbnail: { mimetype: 'image/jpeg', width: 960, height: 720, url: direct.url },
      sourceUrl: direct.sourceUrl,
      exactBreedImage: true,
    },
    score: 5_000,
  } : null
  const supplementalPhotos = (supplementalPhotoOverrides[breed.name] ?? []).map(photo => ({
    page: {
      title: photo.title,
      key: photo.title,
      excerpt: '',
      thumbnail: { mimetype: 'image/jpeg', width: 960, height: 720, url: photo.url },
      localUrl: photo.localUrl,
      sourceUrl: photo.sourceUrl,
      exactBreedImage: true,
    },
    score: 900,
  }))
  const preferredQuery = queryOverrides[breed.name] ?? `\"${breed.name}\" horse`
  const searches = [preferredQuery, breed.name]
  const pages = []
  for (const query of searches) {
    try { pages.push(...await commonsSearch(query)) } catch (error) { console.warn(error.message) }
    const usable = [...new Map(pages.map(page => [page.title, page])).values()]
      .filter((page, index) => Number.isFinite(scoreCandidate(page, breed.name, index)) && !badWords.test(page.title))
    if (usable.length >= 3) break
  }
  const unique = [...new Map(pages.map(page => [page.title, page])).values()]
  const searched = unique
    .map((page, index) => ({ page, score: scoreCandidate(page, breed.name, index) }))
    .filter(item => Number.isFinite(item.score))
  const leadTitle = leadPhoto?.page.title.replace(/^File:/, '').replaceAll('_', ' ')
  const usableLead = leadPhoto && !rejectedFileTitles.has(leadTitle.toLowerCase()) && !badWords.test(leadTitle) && !/\.(?:gif|svg|png)$/i.test(leadTitle)
  return [...(directPhoto ? [directPhoto] : []), ...supplementalPhotos, ...(usableLead ? [leadPhoto] : []), ...searched]
    .filter((item, index, items) => {
      const key = item.page.title.replace(/^File:/, '').replaceAll('_', ' ').toLowerCase()
      return items.findIndex(other => other.page.title.replace(/^File:/, '').replaceAll('_', ' ').toLowerCase() === key) === index
    })
    .sort((a, b) => b.score - a.score)
}

async function downloadPhoto(candidate, destination) {
  const thumbnail = candidate.page.thumbnail.url.split('?')[0]
  let response = await fetchWithRetry(thumbnail.replace(/\/\d+px-/, '/960px-'))
  if (!response.ok) response = await fetchWithRetry(thumbnail.replace(/\/\d+px-/, '/500px-'))
  if (!response.ok) response = await fetchWithRetry(thumbnail)
  if (!response.ok) throw new Error(`Download failed: ${response.status}`)
  const original = `${destination}.source`
  await writeFile(original, Buffer.from(await response.arrayBuffer()))
  try {
    await exec('/usr/bin/sips', ['--resampleHeightWidthMax', '1100', '--setProperty', 'format', 'jpeg', '--setProperty', 'formatOptions', '76', original, '--out', destination])
  } finally {
    await unlink(original).catch(() => {})
  }
}

const photoSources = {}
const photoUrls = {}
const missing = []
for (const [breedIndex, breed] of breeds.entries()) {
  const candidates = await candidatesFor(breed)
  const chosen = candidates.filter(candidate => candidate.page.exactBreedImage || !badWords.test(candidate.page.title)).slice(0, 3)
  if (!chosen.length) {
    missing.push(breed)
    console.warn(`No photo found for ${breed.name}`)
    continue
  }
  photoSources[breed.id] = []
  photoUrls[breed.id] = []
  for (let index = 0; index < chosen.length; index++) {
    const title = chosen[index].page.title.replace(/^File:/, '')
    if (index === 0) {
      const destination = new URL(`${breed.id}-1.jpg`, targetDir).pathname
      const exists = await access(destination).then(() => true).catch(() => false)
      if (!exists || forceDownloadIds.has(breed.id)) {
        await downloadPhoto(chosen[index], destination)
        await delay(900)
      }
      photoUrls[breed.id].push(`/horses/expansion/${breed.id}-1.jpg`)
    } else {
      photoUrls[breed.id].push(chosen[index].page.localUrl ?? chosen[index].page.thumbnail.url.split('?')[0])
    }
    photoSources[breed.id].push(chosen[index].page.sourceUrl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(chosen[index].page.title.replaceAll(' ', '_'))}`)
  }
  console.log(`${String(breedIndex + 1).padStart(3)}/${breeds.length} ${breed.name}: ${chosen.map(item => item.page.title).join(' | ')}`)
}

const generated = `// Generated by scripts/fetch-expansion-photos.mjs from verified Wikimedia Commons files.\n` +
  `import type { BreedPhoto } from './media'\n\n` +
  `export const expansionPhotoSources: Record<string, string[]> = ${JSON.stringify(photoSources, null, 2)}\n\n` +
  `const expansionPhotoUrls: Record<string, string[]> = ${JSON.stringify(photoUrls, null, 2)}\n\n` +
  `export const expansionAlternatePhotos: Record<string, BreedPhoto[]> = Object.fromEntries(\n` +
  `  Object.entries(expansionPhotoSources).map(([id, sources]) => [id, sources.slice(1).map((source, index) => ({ src: expansionPhotoUrls[id][index + 1], source }))])\n` +
  `)\n`
const mediaFile = new URL('src/breedExpansionMedia.ts', root)
const temporaryMediaFile = new URL('src/breedExpansionMedia.ts.next', root)
await writeFile(temporaryMediaFile, generated)
await rename(temporaryMediaFile, mediaFile)
if (missing.length) throw new Error(`Missing every photo for: ${missing.map(item => item.name).join(', ')}`)
