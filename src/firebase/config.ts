import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

export function firebaseConfigured(): boolean {
  return required.every((k) => {
    const v = import.meta.env[k as keyof ImportMetaEnv];
    return typeof v === "string" && v.length > 0 && !v.includes("YOUR_");
  });
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseConfigured()) throw new Error("Firebase env not configured");
  if (!app) {
    app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

export function getDb(): Firestore {
  if (!db) db = getFirestore(getFirebaseApp());
  return db;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
