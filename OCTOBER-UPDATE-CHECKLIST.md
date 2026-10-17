# October 17 release — expansion paused at user request

## Published and verified

- `81ec8cf`: navigation/logo/subtitle changes, alphabetical sorting, continent hints, Hungarian Sport Horse and Miyako Horse.
- `df4c48f`: community-favorites sorting and Kundudo Horse (204 breeds). GitHub build 38905455986 and Pages 38905518028 succeeded. Live browser verified Most favorited placing Orlov Trotter first with 6 points (3 hearts + 2 top bonuses + 1 crown bonus).
- Firestore rules deployed. Isolated emulator integration passed allowed atomic votes, bonuses and account-deletion decrements; rejected forged totals, duplicate increments, other-user reads, bonus rollbacks and unmatched deletion.
- One-time atomic migration applied: 58 heart documents and 41 breed aggregate documents, 99 writes. Do NOT rerun the migration. Existing anonymous top/crown choices replay idempotently after account restoration.
- Counts are unique per Firebase identity, not proof of unique humans. Repeated toggles do not inflate counts. Clearing browser identity or creating additional accounts remains a limitation.

## Next breed release

- Hungarian Coldblood and Timor Pony bring the total to 206: **5 of the requested 21 additions**. Sixteen remain; Hungarian registry/alias audit is not complete.
- Both have inspected color photographs without people and documented height, uses, coat colors and traits. Hungarian Coldblood accepts Hungary's actual polygon. Timor accepts both national parts of the island, extracted from Natural Earth country geometry.
- October 16 and October 17 daily pools remain unchanged. Kundudo activated October 17; Hungarian Coldblood and Timor Pony activate October 18. Practice/identification/Field Guide can use them immediately.

## Sources and photo review

- Hungarian Sport Horse: https://mlosz.hu/lofajtak/magyar-sportlo . Joe Haupt, CC BY-SA 2.0, https://commons.wikimedia.org/wiki/File:Viscount_Starburst_-_Hungarian_Warmblood.jpg . Large clear horse; rider present.
- Miyako: https://miyakoumahozonkai.jimdofree.com/宮古馬について/ . Paipateroma, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Miyako_miyakouma_2014_(cropped).jpg . Color, full horse, no people.
- Kundudo: https://www.veteringroup.us/articles/GJZ-7-122.php . Marcoetio, CC BY-SA 3.0, https://commons.wikimedia.org/wiki/File:Kundudo_mare_with_foal.jpg . Large color mare and foal, no people. No unsupported breed-wide measurements.
- Hungarian Coldblood: https://mlosz.hu/en/breeds/hungarian-coldblood and https://pmc.ncbi.nlm.nih.gov/articles/PMC12108329/ . Figure 1 by János Oláh, article CC BY 4.0. Unmodified color mare and foal, clear side view, no people. Direct attribution visible in full view.
- Timor Pony: https://rarebreedstrust.com.au/public/pages/sh-timor-pony (traits/uses only; speculative historical passages not adopted). Photograph by J. Patrick Fischer, CC BY 2.5, https://commons.wikimedia.org/wiki/File:Pferde_in_Maubisse_klein.jpg . Unmodified color group, foreground horses visible, no people; tack present. Viqueque and mountain-group candidates rejected as too distant.

## Remaining research

Paused by the user on October 17. Do not add further breeds without a new request. Finish and publish the current 206-breed catalog.

- Hungarian missing candidates: Kunfakó, Székely, Turáni. Federation also lists Hungarian Halfblood (open registration population) and Muraközi Coldblood (check modern registry distinction from existing Međimurje). Do not duplicate aliases or classify imported breeds as Hungarian origins.
- Hokkaido `File:Hokkaido Pony.jpg` rejected as default: harness and people obscure horse. Never substitute Ban'ei drafts for Dosanko.
- Sparse-region leads: Arabian-Barb, Kazakh Horse, Nooitgedachter, Vlaamperd, Taishu. Require verified reusable color photos and primary breed sources before adding.

## Repeatable validation

- `node scripts/check-breed-features.mjs`
- `node scripts/check-favorite-counts.mjs` (mocked REST, no production traffic)
- `node scripts/check-favorite-rules.mjs` (only with isolated demo-horseguessr Firestore emulator on port 8189)
- `npm run build`
