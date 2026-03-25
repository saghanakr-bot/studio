
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

export type FirebaseInstances = {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
};

export function initializeFirebase(): FirebaseInstances | null {
  try {
    // Basic validation to prevent SDK crash if environment variables are missing
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
      console.warn("Firebase configuration is incomplete. Please set your NEXT_PUBLIC_FIREBASE environment variables.");
      return null;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    return { app, db, auth };
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    return null;
  }
}

export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
