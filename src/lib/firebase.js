import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Guard for Next.js SSR: only create browser SDK instances on the client
export const auth = typeof window !== 'undefined' ? getAuth(app) : undefined;
export const db = typeof window !== 'undefined' ? getFirestore(app) : undefined;
// Force the bucket from env if provided to avoid ambiguous default bucket issues
export const storage = typeof window !== 'undefined'
  ? (() => {
      try {
        const envBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        // Prefer appspot default if envBucket is missing or looks like an invalid host (e.g., firebasestorage.app)
        const bucket =
          envBucket && /\.appspot\.com$/.test(envBucket)
            ? envBucket
            : (projectId ? `${projectId}.appspot.com` : envBucket);
        // getStorage(app, bucketUrl) accepts 'gs://bucket' or a custom URL
        return bucket ? getStorage(app, `gs://${bucket}`) : getStorage(app);
      } catch {
        return getStorage(app);
      }
    })()
  : undefined;


