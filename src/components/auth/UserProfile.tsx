"use client"

import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LogOut, User, Mail, Calendar, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const UserProfile: React.FC = () => {
  const { user, userProfile, signOut, loading } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user || !userProfile) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={userProfile.photoURL || ''} alt={userProfile.displayName || ''} />
            <AvatarFallback className="text-lg">
              {getInitials(userProfile.displayName || userProfile.email)}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">{userProfile.displayName || 'User'}</CardTitle>
        <CardDescription>{userProfile.email}</CardDescription>
        <Badge className={`mt-2 ${getRoleColor(userProfile.role)}`}>
          <Shield className="w-3 h-3 mr-1" />
          {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{userProfile.email}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {userProfile.displayName || 'No name provided'}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Member since {userProfile.createdAt instanceof Date
                ? userProfile.createdAt.toLocaleDateString()
                : typeof userProfile.createdAt === 'object' && 'toDate' in userProfile.createdAt
                ? userProfile.createdAt.toDate().toLocaleDateString()
                : new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={userProfile.isActive ? "default" : "secondary"}>
              {userProfile.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          
          {userProfile.companyId && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Company ID:</span>
              <span className="font-mono text-xs">{userProfile.companyId}</span>
            </div>
          )}
        </div>

        <Separator />

        <Button 
          onClick={handleSignOut} 
          variant="outline" 
          className="w-full" 
          disabled={loading}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}; 