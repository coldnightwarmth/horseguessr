import type { Breed } from './data'
import { extraPhotos } from './extraMedia'

export type BreedPhoto = { src: string; source: string }

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`

// These otherwise valid archive images are intentionally kept out of the game pool:
// monochrome/sepia references and landscape shots where the horse is too small to study.
const excludedPhotoFiles = [
  'arabian-3.jpg',
  'caspian-1.jpg',
  'caspian-2.jpg',
  'connemara-1.jpg',
  'eriskay-pony-2.jpg',
  'eriskay-pony-3.jpg',
  'exmoor-pony-1.jpg',
  'furioso-north-star-3.jpg',
  'gidran-2.jpg',
  'gidran-3.jpg',
  'giara-3.jpg',
  'hucul-3.jpg',
  'icelandic-3.jpg',
  'kisber-felver-2.jpg',
  'konik-1.jpg',
  'morgan-2.jpg',
  'nordlandshest-3.jpg',
  'yakutian-2.jpg',
]

function isPlayablePhoto(photo: BreedPhoto) {
  return !excludedPhotoFiles.some(file => photo.src.endsWith(`/horses/${file}`))
}

const alternatePhotos: Record<string, BreedPhoto[]> = {
  'akhal-teke': [
    { src: '/horses/akhal-teke-2.jpg', source: commons('Akhal-Teke_mare.jpg') },
    { src: '/horses/akhal-teke-3.jpg', source: commons('Akhal_Teke_Stallion-_Gerald_(2835597069).jpg') },
  ],
  andalusian: [
    { src: '/horses/andalusian-2.jpg', source: commons('Flehmendes_Pferd_32_c.jpg') },
    { src: '/horses/andalusian-3.jpg', source: commons('Andalusian_horse.jpg') },
  ],
  arabian: [
    { src: '/horses/arabian-2.jpg', source: commons('WM_Nafis_-_Arabian_horse.jpg') },
    { src: '/horses/arabian-3.jpg', source: commons('Priscilla_Paetsch_jumping_with_her_Arabian_Stallion,_Zigaro.jpg') },
  ],
  clydesdale: [
    { src: '/horses/clydesdale-2.jpg', source: commons('3_Clydesdale_horses.JPG') },
    { src: '/horses/clydesdale-3.jpg', source: commons('Clydesdale_horse_at_Midway_Farm_Stall,_West_Pinjarra,_September_2026_01.jpg') },
  ],
  friesian: [
    { src: '/horses/friesian-2.jpg', source: commons('Friesian_Horse_1.jpg') },
    { src: '/horses/friesian-3.jpg', source: commons('Friesian_Horse_Side_View_2.jpg') },
  ],
  icelandic: [
    { src: '/horses/icelandic-2.jpg', source: commons('IcelandicHorseInWinter.jpg') },
    { src: '/horses/icelandic-3.jpg', source: commons('Búlandshöfði,_Vesturland,_Islandia,_2014-08-14,_DD_085.JPG') },
  ],
  marwari: [
    { src: '/horses/marwari-2.jpg', source: commons('Marwari_Filly_at_the_Kentucky_Horse_park_(7998150435).jpg') },
    { src: '/horses/marwari-3.jpg', source: commons('Marwari_horse_show_jumping_Jodhpur_polo_ground.jpg') },
  ],
  mongolian: [
    { src: '/horses/mongolian-2.jpg', source: commons('Koń_mongolski_w_Parku_Narodowym_Gorchi-Tereldż_09.JPG') },
    { src: '/horses/mongolian-3.jpg', source: commons('Naadam_2023_-_Horse_racing_09.jpg') },
  ],
  appaloosa: [
    { src: '/horses/appaloosa-2.jpg', source: commons('Appaloosa_stallion.JPG') },
    { src: '/horses/appaloosa-3.jpg', source: commons('Appaloosa_horse.JPG') },
  ],
  percheron: [
    { src: '/horses/percheron-2.jpg', source: commons('Attelage_jument_percheronnes_Josselin.jpg') },
    { src: '/horses/percheron-3.jpg', source: commons('Percheron_-_South_Africa.jpg') },
  ],
  shire: [
    { src: '/horses/shire-2.jpg', source: commons('Shire_Horse_-_geograph.org.uk_-_66944.jpg') },
    { src: '/horses/shire-3.jpg', source: commons('Lottie_the_Shire_Horse_-_geograph.org.uk_-_7034037.jpg') },
  ],
  fjord: [
    { src: '/horses/fjord-2.jpg', source: commons('Norwegian_fjord_horse_mare.jpg') },
    { src: '/horses/fjord-3.jpg', source: commons('Norwegian_fjord_horses_Six_Gun_City_Fort_Splash_Fort_Jefferson_Fun_Park_New_Hampshire.jpg') },
  ],
  lipizzan: [
    { src: '/horses/lipizzan-2.jpg', source: commons('Lipizzanerweide-2881.jpg') },
    { src: '/horses/lipizzan-3.jpg', source: commons('Lipizzanerweide-2917.jpg') },
  ],
  haflinger: [
    { src: '/horses/haflinger-2.jpg', source: commons('Haflinger_Fohlen_01.jpg') },
    { src: '/horses/haflinger-3.jpg', source: commons('Haflinger_Hengstfohlen_1.JPG') },
  ],
  falabella: [
    { src: '/horses/falabella-2.jpg', source: commons('Falabella_on_pasture.jpg') },
    { src: '/horses/falabella-3.jpg', source: commons('Falabella_Miniature_Horse_in_Shoushan_Zoo.jpg') },
  ],
  'australian-stock': [
    { src: '/horses/australian-stock-2.jpg', source: commons('Australian_Stock_Horse.jpg') },
    { src: '/horses/australian-stock-3.jpg', source: commons('Australian_Stock_Horse_and_Water_towers_in_Jerilderie,_2023.jpg') },
  ],
  shetland: [
    { src: '/horses/shetland-2.jpg', source: commons('Shetland_pony_-_Postbridge.jpg') },
    { src: '/horses/shetland-3.jpg', source: commons('Shetland_pony_-_Sofia_zoo.jpg') },
  ],
  'belgian-draft': [
    { src: '/horses/belgian-draft-2.jpg', source: commons('Draft_horse_pulling_logs_in_Parc_naturel_Hautes_Fagnes,_Eupen,_Belgium_(VeloTour_54_to_55,_DSCF3703).jpg') },
    { src: '/horses/belgian-draft-3.jpg', source: commons('Huizingen_Belgian_draft_horse_056.jpg') },
  ],
  'quarter-horse': [
    { src: '/horses/quarter-horse-2.jpg', source: commons('Buckskin_mare_left_flank.jpg') },
    { src: '/horses/quarter-horse-3.jpg', source: commons('BayRoanQuarter.jpg') },
  ],
  thoroughbred: [
    { src: '/horses/thoroughbred-2.jpg', source: commons('Yearling_colt_(9473564293).jpg') },
    { src: '/horses/thoroughbred-3.jpg', source: commons('Yearling_colts_(9473569097).jpg') },
  ],
  'tennessee-walker': [
    { src: '/horses/tennessee-walker-2.jpg', source: commons('Tennessee_Walking_Horse_Head.jpg') },
    { src: '/horses/tennessee-walker-3.jpg', source: commons('Three_Tennessee_Walking_Horses.png') },
  ],
  morgan: [
    { src: '/horses/morgan-2.jpg', source: commons('Morgan_Horses_in_pastures_(f8ebc44a-33f8-4359-9ec4-823898b8258c).jpg') },
    { src: '/horses/morgan-3.jpg', source: commons('Big_horse_and_little_horse.jpg') },
  ],
  'peruvian-paso': [
    { src: '/horses/peruvian-paso-2.jpg', source: commons('Paso_Peruano_Stute_Barca_de_Vela.jpg') },
    { src: '/horses/peruvian-paso-3.jpg', source: commons('Paso_Peruano_Wallach_Vogelstockerhof.jpg') },
  ],
  'orlov-trotter': [
    { src: '/horses/orlov-trotter-2.jpg', source: commons('Orlov_trotter_Fagot-Arabika_head.jpg') },
    { src: '/horses/orlov-trotter-3.jpg', source: commons('Orlov_trotter_Final_2.06,5_(Fagot-Arabika)_born_in_Dubrovsky_stud,_Ukraine..jpg') },
  ],
  finnhorse: [
    { src: '/horses/finnhorse-2.jpg', source: commons('Finnhorse_mare_with_foal.jpg') },
    { src: '/horses/finnhorse-3.jpg', source: commons('Suomenhevonen_-_Finnhorse_2.jpg') },
  ],
  merens: [
    { src: '/horses/merens-2.jpg', source: commons('Cheval_de_Mérens_à_Orgeix.jpg') },
    { src: '/horses/merens-3.jpg', source: commons('Tête_de_jeune_étalon_de_Mérens_03.jpg') },
  ],
  knabstrupper: [
    { src: '/horses/knabstrupper-2.jpg', source: commons('Paardinpoesele_14-08-2009_15-12-37.NEF.jpg') },
    { src: '/horses/knabstrupper-3.jpg', source: commons('Danish_Knabstrupper_-_Xantos.jpg') },
  ],
  'paint-horse': [
    { src: '/horses/paint-horse-2.jpg', source: commons('Tobiano_paint_with_glass_eyes.jpg') },
    { src: '/horses/paint-horse-3.jpg', source: commons('American_Paint_Horse_Gelding.jpg') },
  ],
  connemara: [
    { src: '/horses/connemara-2.jpg', source: commons('Connemara_-_Connemara_National_Park,_Connemara_Ponies.jpg') },
    { src: '/horses/connemara-3.jpg', source: commons('Connemara_mare.jpg') },
  ],
  'black-forest': [
    { src: '/horses/black-forest-2.jpg', source: commons('Marbach_Schwarzwälder_auf_der_Weide.jpg') },
    { src: '/horses/black-forest-3.jpg', source: commons('Schwarzwälder_Mix.JPG') },
  ],
  ...extraPhotos,
}

export function resolvePhotoPath(path: string) {
  if (!path.startsWith('/')) return path
  const base = import.meta.env.BASE_URL
  if (base !== '/' && path.startsWith(base)) return path
  return `${base}${path.slice(1)}`
}

export function photosForBreed(breed: Breed): BreedPhoto[] {
  return [{ src: breed.image, source: breed.imageSource }, ...(alternatePhotos[breed.id] ?? [])]
    .map(photo => ({ ...photo, src: resolvePhotoPath(photo.src) }))
    .filter(isPlayablePhoto)
}
