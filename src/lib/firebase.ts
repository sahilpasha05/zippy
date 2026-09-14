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

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

// Never let a missing/invalid config crash module evaluation — this file is
// evaluated during server-side prerendering (no window, skip entirely) and
// can also fail client-side if the env vars aren't set in the deployment
// (Firebase throws synchronously on a bad API key). `auth` degrades to null
// in either case; callers must handle that instead of assuming it's ready.
function initAuth(): Auth | null {
  if (typeof window === 'undefined') return null
  try {
    return getAuth(getFirebaseApp())
  } catch {
    return null
  }
}

export const auth: Auth | null = initAuth()
