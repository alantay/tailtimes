import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfigRaw = process.env.EXPO_PUBLIC_FIREBASE_CONFIG;

if (!firebaseConfigRaw) {
  throw new Error('EXPO_PUBLIC_FIREBASE_CONFIG is required');
}

const firebaseConfig = JSON.parse(firebaseConfigRaw);

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
