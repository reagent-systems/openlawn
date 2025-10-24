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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Clock, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import type { User } from "@/lib/firebase-types"

interface EditEmployeeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: User | null
  onUpdateEmployee: (data: z.infer<typeof formSchema>) => Promise<void>
  onDeleteEmployee: (employeeId: string) => Promise<void>
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  role: z.enum(['employee', 'manager', 'admin']),
  title: z.string().optional(),
  notes: z.string().optional(),
  schedule: z.object({
    monday: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    tuesday: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    wednesday: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    thursday: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    friday: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    saturday: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
    sunday: z.object({
      start: z.string(),
      end: z.string(),
    }).optional(),
  }),
})

export function EditEmployeeSheet({ open, onOpenChange, employee, onUpdateEmployee, onDeleteEmployee }: EditEmployeeSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  // Track which days are enabled
  const [enabledDays, setEnabledDays] = React.useState<Record<string, boolean>>({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "employee",
      title: "",
      notes: "",
      schedule: {
        monday: { start: "08:00", end: "17:00" },
        tuesday: { start: "08:00", end: "17:00" },
        wednesday: { start: "08:00", end: "17:00" },
        thursday: { start: "08:00", end: "17:00" },
        friday: { start: "08:00", end: "17:00" },
        saturday: { start: "08:00", end: "17:00" },
        sunday: { start: "08:00", end: "17:00" },
      },
    },
  })

  // Update form when employee changes
  React.useEffect(() => {
    if (employee) {
      const schedule = employee.schedule || {};

      // Set enabled days based on what's in the schedule
      const newEnabledDays: Record<string, boolean> = {
        monday: !!schedule.monday,
        tuesday: !!schedule.tuesday,
        wednesday: !!schedule.wednesday,
        thursday: !!schedule.thursday,
        friday: !!schedule.friday,
        saturday: !!schedule.saturday,
        sunday: !!schedule.sunday,
      };
      setEnabledDays(newEnabledDays);

      form.reset({
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        role: employee.role || "employee",
        title: employee.title || "",
        notes: employee.notes || "",
        schedule: {
          monday: schedule.monday || { start: "08:00", end: "17:00" },
          tuesday: schedule.tuesday || { start: "08:00", end: "17:00" },
          wednesday: schedule.wednesday || { start: "08:00", end: "17:00" },
          thursday: schedule.thursday || { start: "08:00", end: "17:00" },
          friday: schedule.friday || { start: "08:00", end: "17:00" },
          saturday: schedule.saturday || { start: "08:00", end: "17:00" },
          sunday: schedule.sunday || { start: "08:00", end: "17:00" },
        },
      });
    }
  }, [employee, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!employee) return;

    setIsSubmitting(true)
    try {
      // Filter out disabled days from the schedule
      const filteredSchedule: any = {};
      (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).forEach((day) => {
        if (enabledDays[day] && values.schedule[day]) {
          filteredSchedule[day] = values.schedule[day];
        }
      });

      const updatedValues = {
        ...values,
        schedule: filteredSchedule,
      };

      await onUpdateEmployee(updatedValues)
      toast({
        title: "Employee Updated",
        description: `${values.name} has been updated successfully.`,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to update employee. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!employee) return;
    
    setIsDeleting(true)
    try {
      await onDeleteEmployee(employee.id)
      toast({
        title: "Employee Deleted",
        description: `${employee.name} has been deleted.`,
      })
      setShowDeleteDialog(false)
      onOpenChange(false)
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete employee. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (!employee) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="bottom" 
          className="rounded-t-lg max-h-[90svh] overflow-y-auto"
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <SheetHeader className="text-left">
                <SheetTitle>Edit Employee</SheetTitle>
                <SheetDescription>
                  Update the details for {employee.name}. Click save when you are done.
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Lead Technician, Senior Manager" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Any important details..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Schedule Section */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Work Schedule</h3>
                  </div>

                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                    <div key={day} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${day}-toggle`} className="text-base capitalize">{day}</Label>
                        <Switch
                          id={`${day}-toggle`}
                          checked={enabledDays[day]}
                          onCheckedChange={(checked) => {
                            setEnabledDays(prev => ({ ...prev, [day]: checked }));
                          }}
                        />
                      </div>

                      {enabledDays[day] && (
                        <FormField
                          control={form.control}
                          name={`schedule.${day}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="space-y-4 pl-4">
                                  <Slider
                                    value={[
                                      parseInt(field.value?.start?.split(':')[0] || '8') * 60 + parseInt(field.value?.start?.split(':')[1] || '0'),
                                      parseInt(field.value?.end?.split(':')[0] || '17') * 60 + parseInt(field.value?.end?.split(':')[1] || '0')
                                    ]}
                                    onValueChange={(values) => {
                                      const [start, end] = values;
                                      field.onChange({
                                        start: `${Math.floor(start / 60).toString().padStart(2, '0')}:${(start % 60).toString().padStart(2, '0')}`,
                                        end: `${Math.floor(end / 60).toString().padStart(2, '0')}:${(end % 60).toString().padStart(2, '0')}`,
                                      });
                                    }}
                                    max={24 * 60}
                                    min={0}
                                    step={15}
                                    className="w-full"
                                  />
                                  <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>{field.value?.start || '08:00'}</span>
                                    <span>{field.value?.end || '17:00'}</span>
                                  </div>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <SheetFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Employee
                </Button>
                <div className="flex gap-2">
                  <SheetClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </SheetClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Updating..." : "Update Employee"}
                  </Button>
                </div>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {employee.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 