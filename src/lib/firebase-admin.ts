import { getApps, initializeApp, cert, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Server-only. Never import this file from a 'use client' component.

function getFirebaseAdminApp(): App {
  if (getApps().length) return getApps()[0]!

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKeyRaw = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      'Firebase Admin is not configured — set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY'
    )
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    }),
  })
}

// Verifies a Firebase ID token obtained client-side after signInWithPhoneNumber + confirm().
// Returns the verified E.164 phone number (e.g. "+919999999999"), or throws.
export async function verifyPhoneIdToken(idToken: string): Promise<string> {
  const decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(idToken)
  const phone = decoded.phone_number
  if (!phone) throw new Error('Token has no verified phone_number claim')
  return phone
}
