# MyFitness Gal

Vite + React + TypeScript + Firebase (Auth, Firestore). Track plans, meals, recipes, and progress.

## Security

- **Never commit** `.env` or the `data/` folder (local photos, OCR output, recipe exports). Both are gitignored.
- Firebase **client config** is public by design; restrict usage in the [Firebase Console](https://console.firebase.google.com/) (authorized domains, App Check).
- `npm audit` runs on every Pages deploy (fails on high severity).

## Local setup

```bash
cp .env.example .env
# Fill VITE_FIREBASE_* from Firebase project settings

npm ci
npm run dev
```

Optional: keep `data/recipes.json` locally, then `npm run sync:recipes` copies it to `public/data/` for the in-app import button. The `data/` directory is not in this repository.

## Deploy to GitHub Pages

1. Push this repo to GitHub (without `data/` or `.env`).
2. **Repository → Settings → Pages**: set **Source** to **GitHub Actions**.
3. **Repository → Settings → Secrets and variables → Actions**: add optional secrets so the built app can talk to Firebase:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`  
   If these are missing, the app still builds and shows the Firebase setup screen until you configure them.
4. In Firebase **Authentication → Settings → Authorized domains**, add `YOUR_USERNAME.github.io`.

The workflow sets `VITE_BASE` to `/<repository-name>/` by default. To override, add a **repository variable** `VITE_BASE` (Settings → Secrets and variables → Actions → Variables), e.g. `/` for a user site root.

## Firestore rules

Deploy `firestore.rules` with Firebase CLI or the console so users can only read/write their own `users/{uid}` tree.
