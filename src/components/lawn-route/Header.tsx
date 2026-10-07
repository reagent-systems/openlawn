"use client"

import { Menu, MoreVertical, ClipboardList } from 'lucide-react';
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
import { useState, useEffect } from 'react';
import { subscribeToPendingUsers } from '@/lib/user-service';
import { LogOut, Calendar, Building2, User, Download, UserPlus, Users, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  onOpenCompanySettings?: () => void;
  onExportMetrics?: () => void;
  onOpenProfile?: () => void;
  onOpenSchedule?: () => void;
  onOpenCompanyManagement?: () => void;
  onOpenPendingUsers?: () => void;
  onOpenMenu?: () => void;
  onOpenCustomers?: () => void;
  onOpenEmployees?: () => void;
  onOpenCrews?: () => void;
}

export function Header({
  onOpenCompanySettings,
  onExportMetrics,
  onOpenProfile,
  onOpenSchedule,
  onOpenCompanyManagement,
  onOpenPendingUsers,
  onOpenMenu,
  onOpenCustomers,
  onOpenEmployees,
  onOpenCrews,
}: HeaderProps) {
  const { user, userProfile, signOut, loading } = useAuth();
  const { toast } = useToast();
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  useEffect(() => {
    if (!userProfile?.companyId) return;
    if (userProfile.role !== 'manager' && userProfile.role !== 'admin') return;

    const unsubscribe = subscribeToPendingUsers(userProfile.companyId, (users) => {
      setPendingUsersCount(users.length);
    });

    return () => unsubscribe();
  }, [userProfile?.companyId, userProfile?.role]);

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

  const isManager = userProfile?.role === 'manager' || userProfile?.role === 'admin';

  return (
    <header className="flex items-center justify-between gap-3 px-3 py-3 border-b bg-card z-10">
      <div className="flex items-center gap-1 min-w-[2.5rem]">
        {(onOpenMenu || isManager) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary" onClick={onOpenMenu}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {isManager && (
                <>
                  <DropdownMenuItem onClick={onOpenCustomers} className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Customers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenEmployees} className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    Employees
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onOpenCrews} className="cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" />
                    Crews
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onExportMetrics && isManager && (
                <DropdownMenuItem onClick={onExportMetrics} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" />
                  Export metrics
                </DropdownMenuItem>
              )}
              {onOpenPendingUsers && isManager && (
                <DropdownMenuItem onClick={onOpenPendingUsers} className="cursor-pointer">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Pending
                  {pendingUsersCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 min-w-5 justify-center px-1">
                      {pendingUsersCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <h1 className="font-brand text-2xl sm:text-3xl text-primary leading-none">
        OpenLawn
      </h1>

      <div className="flex items-center justify-end gap-1 min-w-[2.5rem]">
        {loading ? (
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        ) : user ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hidden sm:inline-flex"
              onClick={onOpenSchedule}
            >
              <ClipboardList className="h-5 w-5" />
              <span className="sr-only">Schedule</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary">
                  <MoreVertical className="h-5 w-5" />
                  <span className="sr-only">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={userProfile?.photoURL || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getInitials(userProfile?.displayName || user.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold">
                        {userProfile?.displayName || user.email || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onOpenSchedule} className="cursor-pointer">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenProfile} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                  <DropdownMenuItem onClick={onOpenCompanyManagement} className="cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" />
                    Company
                  </DropdownMenuItem>
                )}
                {onOpenCompanySettings && userProfile?.role === 'employee' && (
                  <DropdownMenuItem onClick={onOpenCompanySettings} className="cursor-pointer">
                    <Building2 className="mr-2 h-4 w-4" />
                    Company Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>
    </header>
  );
}
