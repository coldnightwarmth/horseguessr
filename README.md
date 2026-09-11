# HorseGuessr

A browser-based horse-breed geography and identification game with a nostalgic 2000s horse-club look.

## Game modes

- **Origin challenge:** place a pin inside the breed's accepted historic homeland. Guesses outside the region are scored from its nearest border.
- **Name the breed:** identify one horse photograph from four breed names.
- **Pick the photo:** match one breed name to the correct photograph among four horses.

The field guide, favorites stable, and end-of-quiz maps cover 66 breeds and 198 photographic examples. The daily ride changes at midnight in the `America/Chicago` time zone, allows one browser attempt per day, and stores initials, the personal record, and favorites in first-party cookies.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

## Connect the public Firebase leaderboard

The leaderboard works immediately in local preview mode. To share one Top 10 board across every player:

1. Create a project in the [Firebase console](https://console.firebase.google.com/) and add a Web app.
2. Create a Firestore database. In **Authentication → Sign-in method**, enable **Anonymous**.
3. Copy `.env.example` to `.env.local`, then add the Firebase project ID and the Web API key shown in the app configuration.
4. Install or run the Firebase CLI, log in, and select the new project:

   ```bash
   npx firebase-tools login
   npx firebase-tools use --add
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

5. Restart `npm run dev`. The leaderboard label changes from **Device preview board** to **Live worldwide board** when the connection succeeds.

For GitHub Pages, add repository Actions secrets named `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_API_KEY`. The included Pages workflow supplies them only while Vite builds the deployable bundle; `.env.local` remains ignored and is never committed.

Firebase Web API keys identify the project but do not grant database access by themselves. `firestore.rules` limits writes to authenticated anonymous players, validates initials and score ranges, and prevents score edits or deletion. The browser cookie and the daily document ID both enforce one submitted daily score per player identity.

## Data and imagery

Breed profile and photo source links are shown in the game. Geographic acceptance zones use OpenStreetMap/Nominatim boundary geometry where a suitable modern region exists, plus documented gameplay approximations for historic regions and local stud districts.
