import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

import { firebaseConfig, isFirebaseConfigured } from './env';

// Initialize Firebase only if configuration is available
let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

// Check if we're in a build environment or if Firebase is properly configured
const shouldInitializeFirebase = () => {
  // Don't initialize during build time if config is missing
  if (typeof window === 'undefined' && !isFirebaseConfigured()) {
    return false;
  }
  return isFirebaseConfigured();
};

// Initialize Firebase with proper error handling
const initializeFirebase = () => {
  if (!shouldInitializeFirebase()) {
    console.warn('Firebase not initialized: Missing configuration');
    return;
  }

  try {
    // Check if Firebase is already initialized
    if (app) {
      return;
    }

    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);

    // Connect to Firebase Emulators if in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ||
                          window.location.hostname === 'localhost' ||
                          window.location.hostname === '127.0.0.1';

      if (useEmulators) {
        try {
          connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
          connectFirestoreEmulator(db, '127.0.0.1', 8080);
          connectStorageEmulator(storage, '127.0.0.1', 9199);
          console.log('✅ Connected to Firebase Emulators');
        } catch (error) {
          console.warn('Emulator connection failed (may already be connected):', error);
        }
      }
    }

    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    // Provide fallback objects to prevent runtime errors
    app = null;
    db = null;
    auth = null;
    storage = null;
  }
};

// Initialize Firebase immediately
initializeFirebase();

// Export with null checks
export const getFirebaseAuth = () => {
  if (!auth) {
    console.warn('Firebase auth not initialized, attempting to initialize...');
    initializeFirebase();
  }
  return auth;
};

export const getFirebaseDb = () => {
  if (!db) {
    console.warn('Firebase db not initialized, attempting to initialize...');
    initializeFirebase();
  }
  return db;
};

export const getFirebaseStorage = () => {
  if (!storage) {
    console.warn('Firebase storage not initialized, attempting to initialize...');
    initializeFirebase();
  }
  return storage;
};

// Export the initialized instances
export { db, auth, storage };
export default app; 