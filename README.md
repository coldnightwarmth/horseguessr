# HorseGuessr

A browser-based horse-breed geography and identification game with a nostalgic 2000s horse-club look.

## Game modes

- **Origin challenge:** place a pin inside the breed's accepted historic homeland. Guesses outside the region are scored from its nearest border.
- **Name the breed:** identify one horse photograph from five breed names.
- **Pick the photo:** match one breed name to the correct photograph among four horses.

The field guide and end-of-quiz maps cover 58 breeds and 174 photographic examples.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

## Data and imagery

Breed profile and photo source links are shown in the game. Geographic acceptance zones use OpenStreetMap/Nominatim boundary geometry where a suitable modern region exists, plus documented gameplay approximations for historic regions and local stud districts.
