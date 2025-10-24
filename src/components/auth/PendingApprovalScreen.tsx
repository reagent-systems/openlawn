"use client"

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export const PendingApprovalScreen: React.FC = () => {
  const { signOut } = useAuth();

  const handleBackToSignIn = async () => {
    // Clear pending approval flag from sessionStorage
    sessionStorage.removeItem('pendingApproval');

    // Also clear any other auth-related storage
    localStorage.clear();
    sessionStorage.clear();

    // Sign out the user
    await signOut();

    // Refresh the page to reset all state
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Clock className="h-16 w-16 text-yellow-500" />
              <CheckCircle2 className="h-6 w-6 text-green-500 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
          <CardDescription>
            Your registration was successful!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              Your account is currently pending approval from your company manager.
              You will receive an email notification once your account has been approved.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">What happens next?</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Your manager will review your registration request</li>
              <li>You'll receive an email once approved</li>
              <li>After approval, you can sign in and start using OpenLawn</li>
            </ol>
          </div>

          <div className="pt-4 space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              If you have any questions, please contact your manager directly.
            </p>
            <Button
              onClick={handleBackToSignIn}
              variant="outline"
              className="w-full"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
