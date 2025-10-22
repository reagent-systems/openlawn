import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { Company } from './firebase-types';

/**
 * Company service for multi-tenant operations
 */

/**
 * Create a new company
 */
export const createCompany = async (
  data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  const now = Timestamp.now();
  const companyData = {
    ...data,
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };

  const docRef = await addDoc(collection(db, 'companies'), companyData);
  return docRef.id;
};

/**
 * Get company by ID
 */
export const getCompany = async (companyId: string): Promise<Company | null> => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  const docRef = doc(db, 'companies', companyId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Company;
  }

  return null;
};

/**
 * Get company by owner (user ID)
 */
export const getCompanyByOwner = async (userId: string): Promise<Company | null> => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  const q = query(
    collection(db, 'companies'),
    where('owner', '==', userId),
    where('isActive', '==', true)
  );

  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Company;
  }

  return null;
};

/**
 * Update company
 */
export const updateCompany = async (
  companyId: string,
  data: Partial<Omit<Company, 'id' | 'createdAt'>>
): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  const docRef = doc(db, 'companies', companyId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

/**
 * Subscribe to company changes
 */
export const subscribeToCompany = (
  companyId: string,
  callback: (company: Company | null) => void
): (() => void) => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  const docRef = doc(db, 'companies', companyId);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Company);
    } else {
      callback(null);
    }
  });
};

/**
 * Check if user can access company
 */
export const canUserAccessCompany = async (
  userId: string,
  companyId: string
): Promise<boolean> => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  // Check if user belongs to this company
  const userDoc = await getDoc(doc(db, 'users', userId));

  if (!userDoc.exists()) {
    return false;
  }

  const userData = userDoc.data();
  return userData.companyId === companyId;
};

/**
 * Get all active companies (admin only)
 */
export const getAllCompanies = async (): Promise<Company[]> => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  const q = query(
    collection(db, 'companies'),
    where('isActive', '==', true)
  );

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Company[];
};
