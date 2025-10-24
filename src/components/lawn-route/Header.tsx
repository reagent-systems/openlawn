"use client"

import { Leaf, User, LogOut, Settings, Calendar, Building2, Download } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  onOpenCompanySettings?: () => void;
  onExportMetrics?: () => void;
  onOpenProfile?: () => void;
  onOpenSchedule?: () => void;
  onOpenCompanyManagement?: () => void;
}

export function Header({
  onOpenCompanySettings,
  onExportMetrics,
  onOpenProfile,
  onOpenSchedule,
  onOpenCompanyManagement
}: HeaderProps) {
  const { user, userProfile, signOut, loading } = useAuth();
  const { toast } = useToast();

  // Debug logging
  console.log('Header Auth State:', { 
    user: user ? 'Present' : 'Missing', 
    userProfile: userProfile ? 'Present' : 'Missing',
    loading 
  });

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  return (
    <header className="flex items-center justify-between p-4 border-b bg-background z-10 shadow-sm">
      <div className="flex items-center">
        <Leaf className="text-primary w-6 h-6 mr-2" />
        <h1 className="text-xl font-bold text-gray-800 font-headline">
          openlawn
        </h1>
      </div>

      {loading ? (
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse"></div>
        </div>
      ) : user ? (
        <div className="flex items-center space-x-3 ml-auto">
          {userProfile && (
            <Badge className={getRoleColor(userProfile.role)}>
              {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
            </Badge>
          )}

          {/* Export Button - Only for managers and admins */}
          {onExportMetrics && userProfile && (userProfile.role === 'manager' || userProfile.role === 'admin') && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportMetrics}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage 
                    src={userProfile?.photoURL || ''} 
                    alt={userProfile?.displayName || user.email || ''} 
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {getInitials(userProfile?.displayName || user.email || 'U')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={userProfile?.photoURL || ''} 
                        alt={userProfile?.displayName || user.email || ''} 
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getInitials(userProfile?.displayName || user.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold leading-none">
                        {userProfile?.displayName || user.email || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mt-1">
                        {user.email}
                      </p>
                      {userProfile && (
                        <Badge className={`mt-1 w-fit text-xs ${getRoleColor(userProfile.role)}`}>
                          {userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSchedule} className="cursor-pointer">
                <Calendar className="mr-2 h-4 w-4" />
                <span>Schedule</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenProfile} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                <DropdownMenuItem onClick={onOpenCompanyManagement} className="cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Company</span>
                </DropdownMenuItem>
              )}
              {onOpenCompanySettings && userProfile?.role === 'employee' && (
                <DropdownMenuItem onClick={onOpenCompanySettings} className="cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>Company Settings</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            Sign In
          </Button>
        </div>
      )}
    </header>
  );
}
