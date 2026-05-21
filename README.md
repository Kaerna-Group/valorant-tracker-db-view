# Player Match Search

A React application for searching and viewing player matches using Firebase Cloud Firestore.

## Features

- Search players by nickname or discriminator
- View player match history
- Read Firestore collections: `players`, `matches`, `matchPlayers`
- Responsive design with Tailwind CSS
- GitHub Pages deployment

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. Run development server:
```bash
npm run dev
```

## Firestore Data

The app expects these collections:

```text
players
matches
matchPlayers
```

Player history is read from:

```js
matchPlayers.where("playerId", "==", playerId).orderBy("dateOfPlay", "desc")
```

If Firebase asks for an index, create the suggested composite index for `matchPlayers`:

- `playerId` ascending
- `dateOfPlay` descending

## GitHub Pages Deployment

The project is configured for automatic deployment to GitHub Pages via GitHub Actions.

### Setup Instructions

1. Enable GitHub Pages:
   - Go to repository Settings -> Pages
   - Under Source, select GitHub Actions

2. Add Actions secrets:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

3. Push to `main` or `master`.

## Build

```bash
npm run build
```

The build output will be in the `dist` directory.
