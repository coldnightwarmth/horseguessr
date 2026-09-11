export type BreedProfile = {
  flag: string
  coatColors: string
  relatedBreedIds: string[]
}

export const breedProfiles: Record<string, BreedProfile> = {
  'akhal-teke': {
    flag: '🇹🇲',
    coatColors: 'Bay, black, chestnut, and gray, plus cream dilutions such as buckskin, palomino, cremello, and perlino; many coats show a metallic sheen.',
    relatedBreedIds: ['arabian', 'karabakh', 'caspian'],
  },
  andalusian: {
    flag: '🇪🇸',
    coatColors: 'Gray and bay are most common; black, chestnut, and cream-dilute colors also occur.',
    relatedBreedIds: ['lipizzan', 'sorraia', 'maremmano'],
  },
  arabian: {
    flag: '🇸🇦',
    coatColors: 'Bay, gray, chestnut, and black, often with prominent white facial and leg markings.',
    relatedBreedIds: ['shagya-arabian', 'akhal-teke', 'thoroughbred'],
  },
  clydesdale: {
    flag: '🇬🇧',
    coatColors: 'Bay is especially common, with brown, black, chestnut, and roan also seen; broad blazes, white legs, and sabino-style markings are characteristic.',
    relatedBreedIds: ['shire', 'belgian-draft', 'cleveland-bay'],
  },
  friesian: {
    flag: '🇳🇱',
    coatColors: 'Nearly always solid black; a small star may be accepted in mares, while chestnut is a rare recessive variation.',
    relatedBreedIds: ['andalusian', 'kladruber', 'nonius'],
  },
  icelandic: {
    flag: '🇮🇸',
    coatColors: 'An unusually broad palette including bay, black, chestnut, gray, dun, palomino, roan, silver, and pinto patterns.',
    relatedBreedIds: ['fjord', 'nordlandshest', 'shetland'],
  },
  marwari: {
    flag: '🇮🇳',
    coatColors: 'Bay, chestnut, gray, and black, along with palomino and bold piebald or skewbald patterns.',
    relatedBreedIds: ['kathiawari', 'arabian', 'akhal-teke'],
  },
  mongolian: {
    flag: '🇲🇳',
    coatColors: 'Bay, chestnut, black, gray, and dun are widespread, with roan and palomino also occurring.',
    relatedBreedIds: ['yakutian', 'konik', 'hucul'],
  },
  appaloosa: {
    flag: '🇺🇸',
    coatColors: 'Many base colors with leopard-complex patterns including blanket, leopard, snowflake, varnish roan, snowcap, and few-spot.',
    relatedBreedIds: ['knabstrupper', 'paint-horse', 'quarter-horse'],
  },
  percheron: {
    flag: '🇫🇷',
    coatColors: 'Gray and black predominate; bay, chestnut, and roan are accepted in some national populations.',
    relatedBreedIds: ['boulonnais', 'belgian-draft', 'shire'],
  },
  shire: {
    flag: '🇬🇧',
    coatColors: 'Black, bay, brown, and gray, usually with a blaze and white lower legs; roaning is common around the white areas.',
    relatedBreedIds: ['clydesdale', 'belgian-draft', 'percheron'],
  },
  fjord: {
    flag: '🇳🇴',
    coatColors: 'Five recognized dun shades: brown dun, red dun, gray dun, white dun, and yellow dun, all with primitive markings and a dark dorsal stripe.',
    relatedBreedIds: ['icelandic', 'nordlandshest', 'konik'],
  },
  lipizzan: {
    flag: '🇸🇮',
    coatColors: 'Most adults are gray after being born dark; a small number remain bay or black.',
    relatedBreedIds: ['andalusian', 'kladruber', 'friesian'],
  },
  haflinger: {
    flag: '🇮🇹',
    coatColors: 'Always chestnut, from pale gold to liver chestnut, paired with a flaxen or pale mane and tail.',
    relatedBreedIds: ['noriker', 'black-forest', 'bardigiano'],
  },
  falabella: {
    flag: '🇦🇷',
    coatColors: 'Nearly every equine color and pattern, including black, bay, chestnut, gray, pinto, palomino, and leopard spotting.',
    relatedBreedIds: ['shetland', 'appaloosa', 'paint-horse'],
  },
  'australian-stock': {
    flag: '🇦🇺',
    coatColors: 'Bay and chestnut are common, with black, brown, gray, palomino, buckskin, dun, and roan also found.',
    relatedBreedIds: ['quarter-horse', 'thoroughbred', 'morgan'],
  },
  shetland: {
    flag: '🇬🇧',
    coatColors: 'Black, bay, brown, chestnut, gray, dun, roan, palomino, and pinto; spotted Appaloosa coloring is not accepted in the main studbook.',
    relatedBreedIds: ['eriskay-pony', 'exmoor-pony', 'icelandic'],
  },
  'belgian-draft': {
    flag: '🇧🇪',
    coatColors: 'Sorrel or chestnut with a flaxen mane is especially common in North America; bay, roan, dun, and gray also occur.',
    relatedBreedIds: ['ardennais', 'percheron', 'clydesdale'],
  },
  'quarter-horse': {
    flag: '🇺🇸',
    coatColors: 'Sorrel and bay are most common, with black, brown, gray, buckskin, palomino, dun, grullo, and several roan variations.',
    relatedBreedIds: ['paint-horse', 'appaloosa', 'australian-stock'],
  },
  thoroughbred: {
    flag: '🇬🇧',
    coatColors: 'Bay, dark bay or brown, chestnut, black, and gray; white, palomino, and roan are exceptionally rare.',
    relatedBreedIds: ['arabian', 'kisber-felver', 'furioso-north-star'],
  },
  'tennessee-walker': {
    flag: '🇺🇸',
    coatColors: 'Black, bay, chestnut, sorrel, gray, and roan, plus palomino, buckskin, champagne, and pinto patterns.',
    relatedBreedIds: ['morgan', 'quarter-horse', 'campolina'],
  },
  morgan: {
    flag: '🇺🇸',
    coatColors: 'Bay, black, and chestnut are traditional, with brown, gray, palomino, buckskin, dun, and silver dapple also present.',
    relatedBreedIds: ['quarter-horse', 'tennessee-walker', 'australian-stock'],
  },
  'peruvian-paso': {
    flag: '🇵🇪',
    coatColors: 'Chestnut, bay, brown, black, and gray are common; roan, palomino, and buckskin appear less often.',
    relatedBreedIds: ['mangalarga-marchador', 'campolina', 'tennessee-walker'],
  },
  'orlov-trotter': {
    flag: '🇷🇺',
    coatColors: 'Gray is emblematic and most common, followed by black and bay; chestnut is comparatively rare.',
    relatedBreedIds: ['ljutomer-trotter', 'nonius', 'finnhorse'],
  },
  finnhorse: {
    flag: '🇫🇮',
    coatColors: 'Chestnut dominates, often with flaxen hair; bay, black, brown, silver dapple, and occasional gray also occur.',
    relatedBreedIds: ['nordlandshest', 'icelandic', 'orlov-trotter'],
  },
  merens: {
    flag: '🇫🇷',
    coatColors: 'Solid black is the breed hallmark; foals may be born a softer charcoal or coffee shade before darkening.',
    relatedBreedIds: ['bardigiano', 'hucul', 'garrano'],
  },
  knabstrupper: {
    flag: '🇩🇰',
    coatColors: 'Leopard-complex patterns include full leopard, blanket, snowcap, varnish roan, and few-spot; solid bay, chestnut, or black horses also occur.',
    relatedBreedIds: ['appaloosa', 'noriker', 'andalusian'],
  },
  'paint-horse': {
    flag: '🇺🇸',
    coatColors: 'Tobiano, overo, and tovero white patterns over black, bay, chestnut, sorrel, dun, palomino, gray, or roan bases.',
    relatedBreedIds: ['quarter-horse', 'appaloosa', 'thoroughbred'],
  },
  connemara: {
    flag: '🇮🇪',
    coatColors: 'Gray is most familiar, with dun, bay, brown, black, chestnut, and palomino also recognized.',
    relatedBreedIds: ['eriskay-pony', 'dales-pony', 'kerry-bog-pony'],
  },
  'black-forest': {
    flag: '🇩🇪',
    coatColors: 'Dark chestnut to sorrel, always contrasted by a flaxen mane and tail.',
    relatedBreedIds: ['comtois', 'noriker', 'haflinger'],
  },
  'ljutomer-trotter': {
    flag: '🇸🇮',
    coatColors: 'Bay, chestnut, brown, and black are typical, with gray seen less often.',
    relatedBreedIds: ['orlov-trotter', 'nonius', 'furioso-north-star'],
  },
  'cape-boerperd': {
    flag: '🇿🇦',
    coatColors: 'Bay, chestnut, black, brown, and gray, with palomino, buckskin, and roan variations also represented.',
    relatedBreedIds: ['australian-stock', 'quarter-horse', 'morgan'],
  },
  nonius: {
    flag: '🇭🇺',
    coatColors: 'Black, seal brown, and dark bay predominate; chestnut is much less common.',
    relatedBreedIds: ['furioso-north-star', 'gidran', 'orlov-trotter'],
  },
  gidran: {
    flag: '🇭🇺',
    coatColors: 'Always chestnut, from bright sorrel to deep liver chestnut, often with white facial or leg markings.',
    relatedBreedIds: ['shagya-arabian', 'furioso-north-star', 'kisber-felver'],
  },
  'furioso-north-star': {
    flag: '🇭🇺',
    coatColors: 'Bay, dark bay or brown, black, and chestnut; gray is uncommon.',
    relatedBreedIds: ['kisber-felver', 'gidran', 'nonius'],
  },
  'kisber-felver': {
    flag: '🇭🇺',
    coatColors: 'Bay and chestnut are most usual, with black and gray also occurring.',
    relatedBreedIds: ['thoroughbred', 'furioso-north-star', 'gidran'],
  },
  'shagya-arabian': {
    flag: '🇭🇺',
    coatColors: 'Gray is predominant, while bay, chestnut, and black also occur.',
    relatedBreedIds: ['arabian', 'gidran', 'akhal-teke'],
  },
  hucul: {
    flag: '🇺🇦',
    coatColors: 'Bay, brown, black, chestnut, and grullo or dun, often with a dorsal stripe and zebra-like leg bars.',
    relatedBreedIds: ['konik', 'mongolian', 'zemaitukas'],
  },
  kladruber: {
    flag: '🇨🇿',
    coatColors: 'Gray and black are the two traditional color families; gray horses are born dark and lighten with age.',
    relatedBreedIds: ['lipizzan', 'friesian', 'nonius'],
  },
  konik: {
    flag: '🇵🇱',
    coatColors: 'Mouse dun or grullo with a dark dorsal stripe, dark mane and tail, and frequent primitive leg markings.',
    relatedBreedIds: ['hucul', 'sorraia', 'mongolian'],
  },
  yakutian: {
    flag: '🇷🇺',
    coatColors: 'Bay, gray, brown, black, and chestnut, sometimes with dun-like primitive shading beneath the dense winter coat.',
    relatedBreedIds: ['mongolian', 'icelandic', 'fjord'],
  },
  caspian: {
    flag: '🇮🇷',
    coatColors: 'Bay, gray, and chestnut are most common; black is rare.',
    relatedBreedIds: ['arabian', 'akhal-teke', 'karabakh'],
  },
  kathiawari: {
    flag: '🇮🇳',
    coatColors: 'Chestnut, bay, gray, and dun, with piebald and skewbald patterns also found.',
    relatedBreedIds: ['marwari', 'arabian', 'akhal-teke'],
  },
  sorraia: {
    flag: '🇵🇹',
    coatColors: 'Dun or grullo with a dorsal stripe, dark points, shoulder shading, and occasional zebra striping on the legs.',
    relatedBreedIds: ['konik', 'garrano', 'andalusian'],
  },
  'dales-pony': {
    flag: '🇬🇧',
    coatColors: 'Black is most common, followed by dark brown, bay, gray, and rare roan; white markings are usually modest.',
    relatedBreedIds: ['shire', 'connemara', 'exmoor-pony'],
  },
  'eriskay-pony': {
    flag: '🇬🇧',
    coatColors: 'Gray predominates and usually develops from a dark foal coat; bay and black occasionally occur.',
    relatedBreedIds: ['shetland', 'connemara', 'exmoor-pony'],
  },
  bardigiano: {
    flag: '🇮🇹',
    coatColors: 'Dark bay, seal brown, and black, often with very limited white markings.',
    relatedBreedIds: ['haflinger', 'merens', 'maremmano'],
  },
  maremmano: {
    flag: '🇮🇹',
    coatColors: 'Bay, dark bay or brown, black, chestnut, and gray.',
    relatedBreedIds: ['andalusian', 'camargue', 'bardigiano'],
  },
  nordlandshest: {
    flag: '🇳🇴',
    coatColors: 'Bay, chestnut, black, palomino, buckskin, and silver dapple, with many shades within those colors.',
    relatedBreedIds: ['fjord', 'icelandic', 'finnhorse'],
  },
  'gotland-russ': {
    flag: '🇸🇪',
    coatColors: 'Bay, brown, black, and chestnut, plus dun, palomino, buckskin, silver, and occasional roan.',
    relatedBreedIds: ['shetland', 'konik', 'nordlandshest'],
  },
  noriker: {
    flag: '🇦🇹',
    coatColors: 'Black, bay, chestnut, and roan, along with striking leopard-spotted and occasional pinto patterns.',
    relatedBreedIds: ['black-forest', 'belgian-draft', 'comtois'],
  },
  'cleveland-bay': {
    flag: '🇬🇧',
    coatColors: 'Bay only, from bright to dark bay, always with black points; a small white star is the principal permitted white marking.',
    relatedBreedIds: ['thoroughbred', 'clydesdale', 'shire'],
  },
  giara: {
    flag: '🇮🇹',
    coatColors: 'Bay, dark bay or brown, black, and chestnut, usually with a dark, weathered appearance.',
    relatedBreedIds: ['maremmano', 'garrano', 'sorraia'],
  },
  garrano: {
    flag: '🇵🇹',
    coatColors: 'Dark bay, brown, bay, and black, often with a mealy muzzle and very little white.',
    relatedBreedIds: ['sorraia', 'giara', 'hucul'],
  },
  'kerry-bog-pony': {
    flag: '🇮🇪',
    coatColors: 'Bay, black, brown, chestnut, gray, dun, and roan; pinto markings may also occur.',
    relatedBreedIds: ['connemara', 'dales-pony', 'exmoor-pony'],
  },
  'exmoor-pony': {
    flag: '🇬🇧',
    coatColors: 'Bay, brown, or dun shades with a mealy muzzle and pale eye rings; conspicuous white markings are not accepted.',
    relatedBreedIds: ['shetland', 'dales-pony', 'eriskay-pony'],
  },
  camargue: {
    flag: '🇫🇷',
    coatColors: 'Adults are gray or nearly white, but foals are born black, dark brown, or bay and lighten gradually.',
    relatedBreedIds: ['maremmano', 'sorraia', 'andalusian'],
  },
  poitevin: {
    flag: '🇫🇷',
    coatColors: 'Bay, black, gray, dun or isabella, and roan, often with long, coarse hair.',
    relatedBreedIds: ['percheron', 'boulonnais', 'breton'],
  },
  'mangalarga-marchador': {
    flag: '🇧🇷',
    coatColors: 'Chestnut, bay, black, and gray are widespread, alongside palomino, buckskin, roan, and pinto variations.',
    relatedBreedIds: ['campolina', 'peruvian-paso', 'tennessee-walker'],
  },
  boulonnais: {
    flag: '🇫🇷',
    coatColors: 'Gray is the signature color, ranging from steel to nearly white; black and chestnut are rare.',
    relatedBreedIds: ['percheron', 'ardennais', 'poitevin'],
  },
  comtois: {
    flag: '🇫🇷',
    coatColors: 'Copper chestnut or silver-dapple bay with a flaxen or silver mane and tail; bay and black are less common.',
    relatedBreedIds: ['ardennais', 'breton', 'black-forest'],
  },
  campolina: {
    flag: '🇧🇷',
    coatColors: 'Bay, chestnut, black, and gray, plus buckskin, palomino, roan, and pinto patterns.',
    relatedBreedIds: ['mangalarga-marchador', 'peruvian-paso', 'tennessee-walker'],
  },
  zemaitukas: {
    flag: '🇱🇹',
    coatColors: 'Bay, dark brown, black, and dun are characteristic; chestnut is less common and primitive markings may appear.',
    relatedBreedIds: ['hucul', 'konik', 'gotland-russ'],
  },
  karabakh: {
    flag: '🇦🇿',
    coatColors: 'Golden chestnut or sorrel is especially prized, with bay and gray also occurring.',
    relatedBreedIds: ['akhal-teke', 'arabian', 'caspian'],
  },
  breton: {
    flag: '🇫🇷',
    coatColors: 'Chestnut and sorrel, often with flaxen hair, are most common; bay, roan, gray, and black also occur.',
    relatedBreedIds: ['comtois', 'ardennais', 'percheron'],
  },
  ardennais: {
    flag: '🇧🇪',
    coatColors: 'Bay, roan, chestnut, and gray are common, with dark bay or brown and occasional palomino also seen.',
    relatedBreedIds: ['belgian-draft', 'breton', 'comtois'],
  },
  lusitano: {
    flag: '🇵🇹',
    coatColors: 'Gray and bay are most common, with black, chestnut, palomino, buckskin, cremello, and perlino also occurring.',
    relatedBreedIds: ['andalusian', 'sorraia', 'menorquin'],
  },
  'suffolk-punch': {
    flag: '🇬🇧',
    coatColors: 'Always chestnut, traditionally described in shades such as bright, red, golden, yellow, light, or dark chestnut; white is limited.',
    relatedBreedIds: ['shire', 'clydesdale', 'belgian-draft'],
  },
  'irish-draught': {
    flag: '🇮🇪',
    coatColors: 'Gray, bay, chestnut, brown, and black are usual, with roan also occurring; excessive white is discouraged.',
    relatedBreedIds: ['connemara', 'cleveland-bay', 'thoroughbred'],
  },
  'fell-pony': {
    flag: '🇬🇧',
    coatColors: 'Black is predominant, followed by dark brown, bay, and gray; white markings are generally limited to a small star or modest hind pasterns.',
    relatedBreedIds: ['dales-pony', 'highland-pony', 'shire'],
  },
  'highland-pony': {
    flag: '🇬🇧',
    coatColors: 'Mouse, yellow, gray, cream, and fox dun are characteristic; gray, brown, black, bay, and liver chestnut with a flaxen mane also occur.',
    relatedBreedIds: ['fell-pony', 'eriskay-pony', 'fjord'],
  },
  pottok: {
    flag: '🇪🇸',
    coatColors: 'Traditional mountain Pottoks are black or very dark bay; broader modern populations also include chestnut, bay, and tobiano pinto.',
    relatedBreedIds: ['asturcon', 'garrano', 'sorraia'],
  },
  asturcon: {
    flag: '🇪🇸',
    coatColors: 'Black is classic, while chestnut and bay or brown lines are also recognized; markings are minimal, usually no more than a small star.',
    relatedBreedIds: ['pottok', 'garrano', 'exmoor-pony'],
  },
  menorquin: {
    flag: '🇪🇸',
    coatColors: 'Black only, ranging from sun-faded brownish black to deep jet black; small white markings may occur within registry limits.',
    relatedBreedIds: ['lusitano', 'andalusian', 'friesian'],
  },
  standardbred: {
    flag: '🇺🇸',
    coatColors: 'Bay and brown dominate, with black, chestnut, and gray also seen; roan is uncommon but recognized.',
    relatedBreedIds: ['french-trotter', 'orlov-trotter', 'ljutomer-trotter'],
  },
  'french-trotter': {
    flag: '🇫🇷',
    coatColors: 'Bay and chestnut are most common, including dark bay and liver chestnut; brown, black, gray, and roan occur less often.',
    relatedBreedIds: ['standardbred', 'orlov-trotter', 'ljutomer-trotter'],
  },
  trakehner: {
    flag: '🇩🇪',
    coatColors: 'All colors are accepted; bay, dark bay, chestnut, black, and gray are most familiar, with rare roan and pinto individuals.',
    relatedBreedIds: ['thoroughbred', 'arabian', 'shagya-arabian'],
  },
  'american-cream-draft': {
    flag: '🇺🇸',
    coatColors: 'Gold champagne from light cream to rich gold, with ivory mane and tail, pink or mottled skin, and amber or hazel eyes.',
    relatedBreedIds: ['belgian-draft', 'suffolk-punch', 'percheron'],
  },
  'missouri-fox-trotter': {
    flag: '🇺🇸',
    coatColors: 'Every solid equine color appears, including bay, chestnut, black, gray, palomino, buckskin, and roan, plus tobiano and other pinto patterns.',
    relatedBreedIds: ['tennessee-walker', 'standardbred', 'morgan'],
  },
}
