"use client"

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AuthForm } from './AuthForm';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'admin' | 'employee' | 'manager';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback,
  requireAuth = true,
  requiredRole
}) => {
  const { user, userProfile, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If user is not authenticated, show auth form
  if (!user) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-6">
          <AuthForm />
        </div>
      </div>
    );
  }

  // If role is required but user doesn't have the required role
  if (requiredRole && userProfile && userProfile.role !== requiredRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to access this page. Required role: {requiredRole}
          </p>
          <p className="text-sm text-muted-foreground">
            Your current role: {userProfile.role}
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and has required role (if specified)
  return <>{children}</>;
}; 