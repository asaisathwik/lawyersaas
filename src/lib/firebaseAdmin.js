import admin from 'firebase-admin';

// Initialize Firebase Admin SDK once per server process
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey && privateKey.startsWith('"')) {
    try {
      privateKey = JSON.parse(privateKey);
    } catch {
      // ignore JSON parse errors
    }
  }
  if (privateKey && typeof privateKey === 'string' && privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.appspot.com` : undefined);

  try {
    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        storageBucket,
      });
    } else {
      // Fallback to ADC if service account env vars are not provided
      admin.initializeApp({
        storageBucket,
      });
    }
  } catch {
    // No-op: if already initialized due to hot reloads
  }
}

export { admin };

export function getAdminFirestore() {
  return admin.firestore();
}

export function getAdminStorageBucket() {
  return admin.storage().bucket();
}


