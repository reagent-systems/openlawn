"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { UserPlus, Check, X, Mail, Clock, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { subscribeToPendingUsers, approveUser, rejectUser } from "@/lib/user-service"
import { useAuth } from "@/hooks/use-auth"
import type { User } from "@/lib/firebase-types"

interface PendingUsersSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const PendingUsersSheet: React.FC<PendingUsersSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const [pendingUsers, setPendingUsers] = React.useState<User[]>([])
  const [processingUserId, setProcessingUserId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!userProfile?.companyId) return

    const unsubscribe = subscribeToPendingUsers(userProfile.companyId, (users) => {
      setPendingUsers(users)
    })

    return () => unsubscribe()
  }, [userProfile?.companyId])

  const handleApprove = async (userId: string, userName: string) => {
    setProcessingUserId(userId)
    try {
      await approveUser(userId)
      toast({
        title: "User Approved",
        description: `${userName} has been approved and can now sign in.`,
      })
    } catch (error) {
      console.error('Error approving user:', error)
      toast({
        title: "Error",
        description: "Failed to approve user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleReject = async (userId: string, userName: string) => {
    setProcessingUserId(userId)
    try {
      await rejectUser(userId)
      toast({
        title: "User Rejected",
        description: `${userName}'s registration has been rejected.`,
      })
    } catch (error) {
      console.error('Error rejecting user:', error)
      toast({
        title: "Error",
        description: "Failed to reject user. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingUserId(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Pending Registrations
            {pendingUsers.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {pendingUsers.length}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Review and approve employee registration requests
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {pendingUsers.length === 0 ? (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                No pending registration requests at this time.
              </AlertDescription>
            </Alert>
          ) : (
            pendingUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{user.name || 'Unnamed User'}</CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <Clock className="h-3 w-3" />
                    Registered {user.createdAt?.toDate?.()?.toLocaleDateString() || 'recently'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.id, user.name)}
                      disabled={processingUserId === user.id}
                      className="flex-1"
                    >
                      {processingUserId === user.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleReject(user.id, user.name)}
                      disabled={processingUserId === user.id}
                      className="flex-1"
                    >
                      {processingUserId === user.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <X className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
