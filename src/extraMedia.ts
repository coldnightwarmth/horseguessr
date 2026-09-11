import type { BreedPhoto } from './media'

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`
const commonsPhoto = (file: string) => `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=1200`

export const extraPhotos: Record<string, BreedPhoto[]> = {
  'ljutomer-trotter': [
    { src: '/horses/ljutomer-trotter-2.jpg', source: commons('Ljutomer_(4).jpg') },
    { src: '/horses/ljutomer-trotter-3.jpg', source: commons('Ljutomer_(5).jpg') },
  ],
  'cape-boerperd': [
    { src: '/horses/cape-boerperd-2.jpg', source: commons('Boerperd.jpg') },
    { src: '/horses/cape-boerperd-3.jpg', source: 'http://capeboerperd.co.za/wp-content/uploads/2022/03/8837-Snr-Kamp-Hings-Copy.jpg' },
  ],
  nonius: [
    { src: '/horses/nonius-2.jpg', source: 'https://mezohegyesbirtok.hu/hu/noniusz/' },
    { src: '/horses/nonius-3.jpg', source: 'https://mezohegyesbirtok.hu/hu/noniusz/' },
  ],
  gidran: [
    { src: '/horses/gidran-2.jpg', source: commons('Gidran_Inland.jpeg') },
    { src: '/horses/gidran-3.jpg', source: commons('Gidran_XL-10.jpg') },
    { src: commonsPhoto('Gidras mit Folen bei Köröshegy.JPG'), source: commons('Gidras_mit_Folen_bei_K%C3%B6r%C3%B6shegy.JPG') },
  ],
  'furioso-north-star': [
    { src: '/horses/furioso-north-star-2.jpg', source: commons('Furioso-Przedswit_Polish_breed.jpg') },
    { src: '/horses/furioso-north-star-3.jpg', source: commons('North_Star_VI.jpg') },
  ],
  'kisber-felver': [
    { src: '/horses/kisber-felver-2.jpg', source: commons('Fenek_Thoroughbred.jpg') },
    { src: '/horses/kisber-felver-3.jpg', source: 'https://www.kisberifelver.hu/index.php/tenyesztes/menkatalogus/ajanlott-menek/26-cenzor-zeta' },
  ],
  'shagya-arabian': [
    { src: '/horses/shagya-arabian-2.jpg', source: commons('Etalon-shagya-bai.JPG') },
    { src: '/horses/shagya-arabian-3.jpg', source: commons('Jument-2-shagya-grise.JPG') },
  ],
  hucul: [
    { src: '/horses/hucul-2.jpg', source: commons('Hucul_pony_in_Carpathians.jpg') },
    { src: '/horses/hucul-3.jpg', source: commons('Mur%C3%A1nska_planina,_Maretkin%C3%A1,_Hucul_02.jpg') },
  ],
  kladruber: [
    { src: '/horses/kladruber-2.jpg', source: commons('Overview_of_Starokladrubsk%C3%BD_k%C5%AF%C5%88_at_Kladruby_stud_farm_in_Kladruby_nad_Labem,_Pardubice_District.jpg') },
    { src: '/horses/kladruber-3.jpg', source: commons('Kladruber%2C_Ramskopf.jpg') },
  ],
  konik: [
    { src: '/horses/konik-2.jpg', source: commons('Konik_mare.jpg') },
    { src: '/horses/konik-3.jpg', source: commons('Wild_horse_(Equus_caballus_var._konik),_in_the_Millingerwaard.jpg') },
  ],
  yakutian: [
    { src: '/horses/yakutian-2.jpg', source: commons('The_yakut_horses,_Namski_uluus,_Yakutia,_Siberia_-_%D0%9B%D0%BE%D1%88%D0%B0%D0%B4%D0%B8_%D0%BD%D0%B0_%D0%BF%D1%80%D0%BE%D1%82%D0%BE%D0%BA%D0%B5_%D0%9B%D0%B5%D0%BD%D1%8B_-_panoramio.jpg') },
    { src: '/horses/yakutian-3.jpg', source: commons('Oymyakon_-_190228_DSC_5733.jpg') },
  ],
  caspian: [
    { src: '/horses/caspian-2.jpg', source: commons('Caspian_Horse_(144540153).jpeg') },
    { src: '/horses/caspian-3.jpg', source: commons('Caspian_Horse_(180594129).jpeg') },
    { src: commonsPhoto("BGD Ranch's Caspians.jpg"), source: commons("BGD_Ranch's_Caspians.jpg") },
  ],
  kathiawari: [
    { src: '/horses/kathiawari-2.jpg', source: commons('Kathiawari_2.jpg') },
    { src: '/horses/kathiawari-3.jpg', source: commons('Kathi_breed.jpg') },
  ],
  sorraia: [
    { src: '/horses/sorraia-2.jpg', source: commons('Rewildered_Sorraia_horses.jpg') },
    { src: '/horses/sorraia-3.jpg', source: commons('Altamiro,_Purebred_Sorraia_Stallion.jpg') },
  ],
  'dales-pony': [
    { src: '/horses/dales-pony-2.jpg', source: commons("Dales_Pony_Mare_-_Gulliver's_Mistral_owned_by_Baroque_Farm.jpg") },
    { src: '/horses/dales-pony-3.jpg', source: commons('Dales_ponies_-_geograph.org.uk_-_1280137.jpg') },
  ],
  'eriskay-pony': [
    { src: '/horses/eriskay-pony-2.jpg', source: commons('Eriskay_Church_and_Ponies_-_geograph.org.uk_-_65554.jpg') },
    { src: '/horses/eriskay-pony-3.jpg', source: commons('Eriskay_ponies_by_Loch_Cracabhaig_(Geograph_2129787_by_Rob_Burke).jpg') },
    { src: commonsPhoto('Eriskay Performance Winner.jpg'), source: commons('Eriskay_Performance_Winner.jpg') },
  ],
  bardigiano: [
    { src: '/horses/bardigiano-2.jpg', source: commons('Cavallo-bardigiano.jpg') },
    { src: '/horses/bardigiano-3.jpg', source: commons('Bardigiano4_-_Laufstall_ruhend.jpg') },
  ],
  maremmano: [
    { src: '/horses/maremmano-2.jpg', source: commons('Maremmano_horse_Tuscany.jpg') },
    { src: '/horses/maremmano-3.jpg', source: commons('Marmemmano6_stehend_Gang.jpg') },
  ],
  nordlandshest: [
    { src: '/horses/nordlandshest-2.jpg', source: commons('Ninni.JPG') },
    { src: '/horses/nordlandshest-3.jpg', source: commons('Rimfakse_2.jpg') },
  ],
  'gotland-russ': [
    { src: '/horses/gotland-russ-2.jpg', source: commons('Gotland_Pony.jpg') },
    { src: '/horses/gotland-russ-3.jpg', source: commons('Gotlandsruss.jpg') },
  ],
  noriker: [
    { src: '/horses/noriker-2.jpg', source: commons('Noriker_horse_in_Salzburg_(state)_3336.jpg') },
    { src: '/horses/noriker-3.jpg', source: commons('Noriker-Stute_grasend.JPG') },
  ],
  'cleveland-bay': [
    { src: '/horses/cleveland-bay-2.jpg', source: 'https://livestockconservancy.org/cleveland-bay-horse/' },
    { src: '/horses/cleveland-bay-3.jpg', source: commons('2007_Cleveland_Bays_1.JPG') },
  ],
  giara: [
    { src: '/horses/giara-2.jpg', source: commons('Giara_horses.jpg') },
    { src: '/horses/giara-3.jpg', source: commons('Giara_horses_in_the_Pauli_Maiori.jpg') },
  ],
  garrano: [
    { src: '/horses/garrano-2.jpg', source: commons('Garrano-02-2.jpg') },
    { src: '/horses/garrano-3.jpg', source: commons('Garrano_do_Ger%C3%AAs.jpg') },
  ],
  'kerry-bog-pony': [
    { src: '/horses/kerry-bog-pony-2.jpg', source: commons('Ring_of_Kerry_-_Bog_pony_at_Kerry_Bog_Village_-_geograph.org.uk_-_1569899.jpg') },
    { src: '/horses/kerry-bog-pony-3.jpg', source: commons('Kerry_Bog_Pony,_Bog_Village,_Kerry,_Ireland.jpg') },
  ],
  'exmoor-pony': [
    { src: '/horses/exmoor-pony-2.jpg', source: commons('Exmoor_PonyWindswept.jpg') },
    { src: '/horses/exmoor-pony-3.jpg', source: commons('Exmoor_Pony_-_geograph.org.uk_-_2769842.jpg') },
  ],
  camargue: [
    { src: '/horses/camargue-2.jpg', source: commons('Camargue_horse_Riserva_Naturale_Regionale_della_Foce_dell%E2%80%99Isonzo-0545.jpg') },
    { src: '/horses/camargue-3.jpg', source: commons('Camargue_horse_Riserva_Naturale_Regionale_della_Foce_dell%E2%80%99Isonzo-7377.jpg') },
  ],
  poitevin: [
    { src: '/horses/poitevin-2.jpg', source: commons('Poitevins02_SDA2011.JPG') },
    { src: '/horses/poitevin-3.jpg', source: 'https://www.sfet.fr/les-races/2-chevaux-de-trait/12-le-trait-poitevin-mulassier' },
  ],
  'mangalarga-marchador': [
    { src: commonsPhoto('Olímpia de Clarion.jpg'), source: commons('Olímpia_de_Clarion.jpg') },
    { src: commonsPhoto('Bentinho e Topázio.jpg'), source: commons('Bentinho_e_Topázio.jpg') },
  ],
  boulonnais: [
    { src: commonsPhoto('Jument boulonnaise et son poulain.jpg'), source: commons('Jument_boulonnaise_et_son_poulain.jpg') },
    { src: commonsPhoto('Chevaux boulonnais (27956098795).jpg'), source: commons('Chevaux_boulonnais_(27956098795).jpg') },
  ],
  comtois: [
    { src: commonsPhoto('Cheval Comtois 002.JPG'), source: commons('Cheval_Comtois_002.JPG') },
    { src: commonsPhoto('Comtois-horse-Saint-Faust.jpg'), source: commons('Comtois-horse-Saint-Faust.jpg') },
  ],
  campolina: [
    { src: commonsPhoto('Campolina newer morphology.jpg'), source: commons('Campolina_newer_morphology.jpg') },
    { src: commonsPhoto('Young Campolina Stallion.jpg'), source: commons('Young_Campolina_Stallion.jpg') },
  ],
  zemaitukas: [
    { src: commonsPhoto('Zemaitukai.jpg'), source: commons('Zemaitukai.jpg') },
    { src: commonsPhoto('Zemaitukai080822.jpg'), source: commons('Zemaitukai080822.jpg') },
  ],
  karabakh: [
    { src: commonsPhoto('Qarabaq ati.jpg'), source: commons('Qarabaq_ati.jpg') },
    { src: commonsPhoto('Karabakh stallion.jpg'), source: commons('Karabakh_stallion.jpg') },
  ],
  breton: [
    { src: commonsPhoto('Cheval Breton Morbihan 01.jpg'), source: commons('Cheval_Breton_Morbihan_01.jpg') },
    { src: commonsPhoto('Cheval breton noir ou alezan brûlé.jpg'), source: commons('Cheval_breton_noir_ou_alezan_brûlé.jpg') },
  ],
  ardennais: [
    { src: commonsPhoto('Ardennais 2.JPG'), source: commons('Ardennais_2.JPG') },
    { src: commonsPhoto('Ardennais 3.JPG'), source: commons('Ardennais_3.JPG') },
  ],
  lusitano: [
    { src: commonsPhoto('Horse December 2014-3.jpg'), source: commons('Horse_December_2014-3.jpg') },
    { src: commonsPhoto('Beja lusitano.JPG'), source: commons('Beja_lusitano.JPG') },
  ],
  'suffolk-punch': [
    { src: commonsPhoto('Suffolk Punch horses - geograph.org.uk - 454412.jpg'), source: commons('Suffolk_Punch_horses_-_geograph.org.uk_-_454412.jpg') },
    { src: commonsPhoto('Suffolk Punch Horses. - geograph.org.uk - 2030378.jpg'), source: commons('Suffolk_Punch_Horses._-_geograph.org.uk_-_2030378.jpg') },
  ],
  'irish-draught': [
    { src: commonsPhoto('Irish Draft Horse.jpg'), source: commons('Irish_Draft_Horse.jpg') },
    { src: commonsPhoto('Bridon Belfrey, RID, Irish Draught Stallion.jpg'), source: commons('Bridon_Belfrey,_RID,_Irish_Draught_Stallion.jpg') },
  ],
  'fell-pony': [
    { src: commonsPhoto('Fellpony Longstreamlet Kim.jpg'), source: commons('Fellpony_Longstreamlet_Kim.jpg') },
    { src: commonsPhoto('Fell pony.jpg'), source: commons('Fell_pony.jpg') },
  ],
  'highland-pony': [
    { src: commonsPhoto('Highland Pony Stallion.jpg'), source: commons('Highland_Pony_Stallion.jpg') },
    { src: commonsPhoto('Highlandpony (2).jpg'), source: commons('Highlandpony_(2).jpg') },
  ],
  pottok: [
    { src: commonsPhoto('2016 biriatu xoldokogaina 09.jpg'), source: commons('2016_biriatu_xoldokogaina_09.jpg') },
    { src: commonsPhoto('Pottokak moxala martxan.JPG'), source: commons('Pottokak_moxala_martxan.JPG') },
  ],
  asturcon: [
    { src: commonsPhoto('Caballo de montaña.jpg'), source: commons('Caballo_de_montaña.jpg') },
    { src: commonsPhoto('Caballo de montaña1.jpg'), source: commons('Caballo_de_montaña1.jpg') },
  ],
  menorquin: [
    { src: commonsPhoto('Barranc de Son Boter o de sa Vall (30 de julio de 2015, Alaior) 09.jpg'), source: commons('Barranc_de_Son_Boter_o_de_sa_Vall_(30_de_julio_de_2015,_Alaior)_09.jpg') },
    { src: commonsPhoto('Cabbalos Baleares.jpg'), source: commons('Cabbalos_Baleares.jpg') },
  ],
  standardbred: [
    { src: commonsPhoto('Bestineo Standartbred foal.jpg'), source: commons('Bestineo_Standartbred_foal.jpg') },
    { src: commonsPhoto('Winter Horse Face Portrait.jpg'), source: commons('Winter_Horse_Face_Portrait.jpg') },
  ],
  'french-trotter': [
    { src: commonsPhoto('Born Again at Guillac, 2019.jpg'), source: commons('Born_Again_at_Guillac,_2019.jpg') },
    { src: commonsPhoto("Brave d'Arzal at Guillac, 2019.jpg"), source: commons("Brave_d'Arzal_at_Guillac,_2019.jpg") },
  ],
  trakehner: [
    { src: commonsPhoto('Trakehner horse (Belagro-2021) 1.jpg'), source: commons('Trakehner_horse_(Belagro-2021)_1.jpg') },
    { src: commonsPhoto('Trakehner foal.jpg'), source: commons('Trakehner_foal.jpg') },
  ],
  'american-cream-draft': [
    { src: commonsPhoto('Draft horse.jpg'), source: commons('Draft_horse.jpg') },
    { src: commonsPhoto('Horse Portrait.jpg'), source: commons('Horse_Portrait.jpg') },
  ],
  'missouri-fox-trotter': [
    { src: commonsPhoto('Missouri Fox Trotter 1.jpg'), source: commons('Missouri_Fox_Trotter_1.jpg') },
    { src: commonsPhoto('Missouri Fox Trotter 3.jpg'), source: commons('Missouri_Fox_Trotter_3.jpg') },
  ],
}
