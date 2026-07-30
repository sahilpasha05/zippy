import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Only initialize in the browser — this file gets module-evaluated during
// server-side prerendering too, and Firebase throws synchronously if the API
// key is missing/invalid (e.g. env vars not set in the build environment).
// `auth` is never actually used outside client-triggered event handlers, so a
// server-side placeholder is safe.
function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

export const auth: Auth = typeof window !== 'undefined'
  ? getAuth(getFirebaseApp())
  : (null as unknown as Auth)
