"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  AuthState, 
  signInWithEmail, 
  signUpWithEmail, 
  signOutUser, 
  resetPassword, 
  getUserProfile,
  onAuthStateChange,
  getAuthErrorMessage
} from '@/lib/auth';
import type { User } from '@/lib/firebase-types';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
    role?: 'employee' | 'manager' | 'admin',
    companyName?: string,
    companyId?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthStateChange(async (user: FirebaseUser | null) => {
        if (user) {
          // User is signed in
          try {
            const userProfile = await getUserProfile(user.uid);
            setAuthState({
              user,
              userProfile,
              loading: false,
              error: null,
            });
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setAuthState({
              user,
              userProfile: null,
              loading: false,
              error: 'Failed to load user profile',
            });
          }
        } else {
          // User is signed out
          setAuthState({
            user: null,
            userProfile: null,
            loading: false,
            error: null,
          });
        }
      });
    } catch (error) {
      console.error('Error setting up auth state listener:', error);
      setAuthState({
        user: null,
        userProfile: null,
        loading: false,
        error: 'Failed to initialize authentication',
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userCredential = await signInWithEmail(email, password);

      // Immediately fetch the user profile after signin
      const userProfile = await getUserProfile(userCredential.user.uid);
      setAuthState({
        user: userCredential.user,
        userProfile,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.code);
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName?: string,
    role?: 'employee' | 'manager' | 'admin',
    companyName?: string,
    companyId?: string
  ) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const userCredential = await signUpWithEmail(email, password, displayName, role, companyName, companyId);

      // Immediately fetch the user profile after signup
      const userProfile = await getUserProfile(userCredential.user.uid);
      setAuthState({
        user: userCredential.user,
        userProfile,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.code);
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const signOut = async () => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await signOutUser();
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.code);
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const handleResetPassword = async (email: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await resetPassword(email);
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.code);
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  const value: AuthContextType = {
    ...authState,
    signIn,
    signUp,
    signOut,
    resetPassword: handleResetPassword,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 