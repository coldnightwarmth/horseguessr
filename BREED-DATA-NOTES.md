# Breed regions and comparison data

## Regional scoring

The October 2026 update replaces 96 breed region assignments with country or administrative-region boundaries. Each assignment and its explanation is in `src/boundaryAssignments.json`; all remaining local or historical zones are in `src/originRegions.ts`. Natural Earth public-domain administrative outlines supplement the existing OpenStreetMap outlines. These generalized educational boundaries are not survey-grade borders or political claims.

Examples: the Netherlands is accepted for Friesians and both Dutch sport/harness breeds, while Gelderland and Groningen retain their particular provincial homelands. Hungarian stud breeds accept Hungary with their associated stud town retained as the reference pin. Paso Fino accepts Puerto Rico and Colombia without accepting the sea between them. Specific studs, small islands, and non-administrative mountain or river regions retain local zones where a country-wide answer would lose useful origin information.

All accepted locations score equally. Outside guesses use distance to the closest boundary, not distance to the pin. Exact boundary points count as inside. Scores just outside cannot round up to 5,000. Each of two hints subtracts ten percentage points of the unhinted score. An unhinted 5,000-point answer collects a stamp in daily and practice games.

Boundary generator inputs: Natural Earth `ne_50m_admin_0_countries.geojson` and `ne_10m_admin_1_states_provinces.geojson`, available from https://github.com/nvkelso/natural-earth-vector/tree/master/geojson . Run `node scripts/build-origin-boundaries.mjs countries.geojson provinces.geojson` to regenerate.

## Trait coverage and limitations

Every breed uses the same schema, but missing evidence is explicitly displayed as “not recorded,” never inferred as absence. Controlled vocabulary is extracted from the existing sourced catalog, with individually sourced refinements for selected breeds. This is a first comparison dataset, not a claim that all breed standards have been exhaustively researched.

Current coverage across 201 breeds: 199 coat palettes, 164 traditional-use records, 107 types, 95 builds, 77 proportions, 72 coat patterns, 69 terrain records, 55 gait/action records, and 32 height records. Head, ear, mane, feathering, and climate fields remain more sparsely documented. Height entries retain whether they describe a range, average, or minimum. Physical traits and uses can vary within a breed.

October 14 refinements add documented Connemara, Shetland, Exmoor, Marsh Tacky and Haflinger traits, using the British Connemara Pony Society, Oklahoma State University breed directory, Carolina Marsh Tacky Association standard and South Tyrol Haflinger breeders' federation. Exact source links are attached to the trait cards.

## October 14 photo report review

Eight reports covered seven files across five breeds. The explicit reviewed pools in `src/media.ts` remove the monochrome Barb archive, Karabair illustration, Jaca Navarra award ceremony with no horse, New Forest breed-sign photo, and three poor/spoiling Marsh Tacky examples. Replacements are locally served with original Commons source links. Jaca Navarra reuses its remaining suitable photograph. Marsh Tacky and Karabair replacements still contain riders; available licensed alternatives were limited. Karabair identification follows Commons structured data/category and the French breed article's use of the image, not individual registration papers. These rare breeds would benefit from breeder-supplied, documented horse-only portraits. Reports remain preserved for admin review.

Completed daily rides now save their round results on the current browser for reopening. Earlier completed rides cannot recover unsaved individual guesses; they show an explanatory result screen instead.

Wrong-answer comparisons only contrast fields documented for both breeds. Shared foundation breeds are shown only from explicit sourced relationships, not from look-alike or related-breed lists. The geographic quizzes generate hints only from controlled trait labels, not from biographies or ancestry, avoiding geographic and ethnic names.

Run `node scripts/check-breed-features.mjs` for reference-pin, boundary, hint, scoring, trait and stamp-order regression checks. Account persistence, clearing a crown/order, private-account protection, bans, recovery and account deletion were additionally tested against Firebase using a disposable account, removed afterward.
