"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { Users } from "lucide-react"
import { getUsers } from "@/lib/user-service"
import type { User } from "@/lib/firebase-types"
import { TimeAnalysisBar } from "./TimeAnalysisBar"

interface AddCrewSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddCrew: (data: z.infer<typeof formSchema>) => Promise<void>
  editingCrew?: {
    crewId: string;
    members: User[];
    serviceTypes: string[];
  } | null
  crewTiming?: {
    workTime: number;
    nonWorkTime: number;
  }
}

const formSchema = z.object({
  serviceTypes: z.array(z.string()).min(1, { message: "At least one service type is required." }),
  assignedEmployees: z.array(z.string()).default([]),
})

export function AddCrewSheet({ open, onOpenChange, onAddCrew, editingCrew, crewTiming }: AddCrewSheetProps) {
  const { toast } = useToast()
  const { userProfile } = useAuth()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [availableUsers, setAvailableUsers] = React.useState<User[]>([])

  const SERVICE_TYPES = [
    { value: 'push-mow', label: 'Push Mow' },
    { value: 'edge', label: 'Edge' },
    { value: 'blow', label: 'Blow' },
    { value: 'detail', label: 'Detail' },
    { value: 'riding-mow', label: 'Riding Mow' },
  ];

  React.useEffect(() => {
    // Load available users
    const loadUsers = async () => {
      if (!userProfile?.companyId) return;

      try {
        const users = await getUsers(userProfile.companyId)
        // Filter to only show employees and managers (not admins)
        const availableUsers = users.filter(user =>
          user.role === 'employee' || user.role === 'manager'
        )
        setAvailableUsers(availableUsers)
      } catch (error) {
        console.error('Error loading users:', error)
      }
    }

    loadUsers()
  }, [userProfile])

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      serviceTypes: [],
      assignedEmployees: [],
    },
  })

  // Update form when editing crew changes
  React.useEffect(() => {
    if (editingCrew) {
      form.reset({
        serviceTypes: editingCrew.serviceTypes,
        assignedEmployees: editingCrew.members.map(member => member.id),
      });
    } else {
      form.reset({
        serviceTypes: [],
        assignedEmployees: [],
      });
    }
  }, [editingCrew, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      await onAddCrew(values)
      toast({
        title: editingCrew ? "Crew Updated" : "Crew Created",
        description: editingCrew ? "Crew has been updated successfully." : "Crew has been created successfully.",
      })
      form.reset()
    } catch {
      toast({
        title: "Error",
        description: editingCrew ? "Failed to update crew. Please try again." : "Failed to create crew. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }



  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="rounded-t-lg max-h-[90svh] overflow-y-auto"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SheetHeader className="text-left">
              <SheetTitle>{editingCrew ? 'Edit Crew' : 'Create New Crew'}</SheetTitle>
              <SheetDescription>
                {editingCrew ? 'Update crew assignments and service types.' : 'Assign employees to a crew and set the service type they\'ll handle.'}
              </SheetDescription>

              {/* Time Analysis - Only show when editing a crew */}
              {editingCrew && crewTiming && (crewTiming.workTime > 0 || crewTiming.nonWorkTime > 0) && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="text-sm font-semibold mb-2">Today's Time Breakdown</h4>
                  <TimeAnalysisBar
                    workTimeMinutes={crewTiming.workTime}
                    nonWorkTimeMinutes={crewTiming.nonWorkTime}
                    showLegend={true}
                  />
                </div>
              )}
            </SheetHeader>
            <div className="grid gap-4 py-6">
              <FormField
                control={form.control}
                name="serviceTypes"
                render={() => (
                  <FormItem>
                    <FormLabel>Service Types</FormLabel>
                    <div className="space-y-3">
                      {SERVICE_TYPES.map((service) => (
                        <FormField
                          key={service.value}
                          control={form.control}
                          name="serviceTypes"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={service.value}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(service.value)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, service.value])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== service.value
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {service.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Employee Assignment Section */}
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Assign Employees</h3>
                </div>

                <FormField
                  control={form.control}
                  name="assignedEmployees"
                  render={() => (
                    <FormItem>
                      <FormLabel>Select Employees</FormLabel>
                      <div className="space-y-3">
                        {availableUsers.map((user) => (
                          <FormField
                            key={user.id}
                            control={form.control}
                            name="assignedEmployees"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={user.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(user.id)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, user.id])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== user.id
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal cursor-pointer">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{user.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {user.role} {user.title && `(${user.title})`}
                                      </span>
                                    </div>
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>


            </div>
            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (editingCrew ? "Updating..." : "Creating...") : (editingCrew ? "Update Crew" : "Create Crew")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
} 