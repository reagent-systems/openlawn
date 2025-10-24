import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import { doc, setDoc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import type { User } from './firebase-types';
import { createCompany } from './company-service';

// Authentication state interface
export interface AuthState {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
}

// Create user profile in Firestore
const createUserProfile = async (user: FirebaseUser, companyId: string | undefined, additionalData?: Partial<User>): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  // Only admins can have undefined companyId (super-admins)
  const isAdmin = additionalData?.role === 'admin';
  if (!companyId && !isAdmin) {
    throw new Error('Company ID is required for non-admin users');
  }

  const userProfile: Record<string, any> = {
    name: user.displayName || '',
    email: user.email || '',
    phone: '',
    role: 'employee', // Default role
    status: 'available',
  };

  // Only add companyId if it exists (admins don't have one)
  if (companyId) {
    userProfile.companyId = companyId;
  }

  // Add additional data, filtering out undefined values
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      if (value !== undefined) {
        userProfile[key] = value;
      }
    });
  }

  await setDoc(doc(db, 'users', user.uid), {
    ...userProfile,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

// Update user profile (creates if doesn't exist)
export const updateUserProfile = async (uid: string, updates: Partial<User>): Promise<void> => {
  const db = getFirebaseDb();
  if (!db) {
    throw new Error('Firebase database not initialized');
  }

  const userRef = doc(db, 'users', uid);

  // Check if document exists
  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    // Update existing document - filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );
    await updateDoc(userRef, {
      ...cleanUpdates,
      updatedAt: Timestamp.now()
    });
  } else {
    // Create new document with basic profile - only include defined values
    const basicProfile: Record<string, any> = {
      name: '',
      email: '',
      phone: '',
      role: 'employee',
      status: 'available',
    };

    // Add updates, filtering out undefined values
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        basicProfile[key] = value;
      }
    });

    await setDoc(userRef, {
      ...basicProfile,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  }
};

// Get user profile from Firestore with retry logic
export const getUserProfile = async (uid: string, retries = 3): Promise<User | null> => {
  try {
    const db = getFirebaseDb();
    if (!db) {
      console.error('Firebase database not initialized');
      return null;
    }

    for (let i = 0; i < retries; i++) {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: userDoc.id,
          companyId: data.companyId, // Optional for admins (super-admins see all companies)
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role || 'employee',
          crewId: data.crewId,
          schedule: data.schedule,
          currentLocation: data.currentLocation,
          status: data.status || 'available',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          displayName: data.displayName,
          photoURL: data.photoURL,
          isActive: data.isActive,
          notes: data.notes,
          title: data.title,
        };
      }

      // If document doesn't exist yet, wait a bit and retry (for signup race condition)
      if (i < retries - 1) {
        console.log(`User profile not found, retrying... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Sign up with email and password
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName?: string,
  role?: 'employee' | 'manager' | 'admin',
  companyName?: string,
  companyId?: string
): Promise<UserCredential> => {
  try {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) {
      throw new Error('Firebase not initialized');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name if provided
    if (displayName) {
      await firebaseUpdateProfile(userCredential.user, { displayName });
    }

    // Handle company assignment
    let finalCompanyId = companyId;
    const userRole = role || 'employee';

    if (!finalCompanyId) {
      if (userRole === 'admin') {
        // Admin: No company assignment - they are super-admins who see ALL companies
        finalCompanyId = undefined;
      } else if (userRole === 'manager') {
        // Manager: Create a new company
        const defaultCompanyName = companyName || `${displayName || email}'s Company`;
        finalCompanyId = await createCompany({
          name: defaultCompanyName,
          owner: userCredential.user.uid,
          isActive: true,
        });
      } else if (userRole === 'employee' && companyName) {
        // Employee: Find existing company by name (case-insensitive search)
        const companiesRef = collection(db, 'companies');
        const q = query(companiesRef, where('isActive', '==', true));
        const querySnapshot = await getDocs(q);

        // Normalize company name for comparison (trim and lowercase)
        const normalizedSearchName = companyName.trim().toLowerCase();

        // Find matching company (case-insensitive)
        const matchingCompany = querySnapshot.docs.find(doc =>
          doc.data().name.trim().toLowerCase() === normalizedSearchName
        );

        if (!matchingCompany) {
          throw new Error(`Company "${companyName}" not found. Please check the name and try again, or contact your manager.`);
        }

        // Use the matching company
        finalCompanyId = matchingCompany.id;
      } else {
        throw new Error('Company name is required.');
      }
    }

    // Create user profile in Firestore
    await createUserProfile(userCredential.user, finalCompanyId, {
      name: displayName || '',
      role: userRole,
    });

    // Small delay to ensure Firestore write propagates (especially important for emulators)
    await new Promise(resolve => setTimeout(resolve, 100));

    return userCredential;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string): Promise<UserCredential> => {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update or create user profile
    await updateUserProfile(userCredential.user.uid, { 
      email: userCredential.user.email || email,
      name: userCredential.user.displayName || '',
    });
    
    return userCredential;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }

    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    const auth = getFirebaseAuth();
    if (!auth) {
      throw new Error('Firebase auth not initialized');
    }

    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Update user profile (both Auth and Firestore)
export const updateProfile = async (updates: {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
}): Promise<void> => {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  if (!currentUser) {
    throw new Error('No user is currently signed in');
  }

  // Update Firebase Auth profile if displayName or photoURL changed
  if (updates.displayName !== undefined || updates.photoURL !== undefined) {
    const authUpdates: { displayName?: string; photoURL?: string } = {};
    if (updates.displayName !== undefined) authUpdates.displayName = updates.displayName;
    if (updates.photoURL !== undefined) authUpdates.photoURL = updates.photoURL;

    await firebaseUpdateProfile(currentUser, authUpdates);
  }

  // Update Firestore profile
  const firestoreUpdates: Partial<User> = {};
  if (updates.displayName !== undefined) firestoreUpdates.displayName = updates.displayName;
  if (updates.phoneNumber !== undefined) firestoreUpdates.phone = updates.phoneNumber;
  if (updates.photoURL !== undefined) firestoreUpdates.photoURL = updates.photoURL;

  if (Object.keys(firestoreUpdates).length > 0) {
    await updateUserProfile(currentUser.uid, firestoreUpdates);
  }
};

// Get current user
export const getCurrentUser = (): FirebaseUser | null => {
  const auth = getFirebaseAuth();
  return auth?.currentUser || null;
};

// Listen to authentication state changes
export const onAuthStateChange = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.error('Firebase auth not initialized, cannot listen to auth state changes');
    // Return a no-op unsubscribe function
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  const auth = getFirebaseAuth();
  return !!auth?.currentUser;
};

// Get authentication error message
export const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return 'An error occurred. Please try again.';
  }
}; 