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
import { Checkbox } from "@/components/ui/checkbox"
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
import { useToast } from "@/hooks/use-toast"
import { User, Clock } from "lucide-react"


interface AddEmployeeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddEmployee: (data: z.infer<typeof formSchema>) => Promise<void>
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
  role: z.enum(['employee', 'manager']),
  title: z.string().optional(),
  notes: z.string().optional(),
  schedule: z.object({
    monday: z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    }).default({ start: "08:00", end: "17:00", available: true }),
    tuesday: z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    }).default({ start: "08:00", end: "17:00", available: true }),
    wednesday: z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    }).default({ start: "08:00", end: "17:00", available: true }),
    thursday: z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    }).default({ start: "08:00", end: "17:00", available: true }),
    friday: z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    }).default({ start: "08:00", end: "17:00", available: true }),
    saturday: z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    }).default({ start: "08:00", end: "17:00", available: false }),
    sunday: z.object({
      start: z.string(),
      end: z.string(),
      available: z.boolean(),
    }).default({ start: "08:00", end: "17:00", available: false }),
  }),
})

export function AddEmployeeSheet({ open, onOpenChange, onAddEmployee }: AddEmployeeSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)


  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "employee",
      title: "",
      notes: "",
      schedule: {
        monday: { start: "08:00", end: "17:00", available: true },
        tuesday: { start: "08:00", end: "17:00", available: true },
        wednesday: { start: "08:00", end: "17:00", available: true },
        thursday: { start: "08:00", end: "17:00", available: true },
        friday: { start: "08:00", end: "17:00", available: true },
        saturday: { start: "08:00", end: "17:00", available: false },
        sunday: { start: "08:00", end: "17:00", available: false },
      },
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      await onAddEmployee(values)
      toast({
        title: "Employee Added",
        description: `${values.name} has been added to your team.`,
      })
      form.reset()
    } catch {
      toast({
        title: "Error",
        description: "Failed to add employee. Please try again.",
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
              <SheetTitle>Add New Employee</SheetTitle>
              <SheetDescription>
                Fill in the details for the new employee. Click save when you are done.
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
                      <Input placeholder="John Smith" {...field} />
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
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="john@company.com" type="email" {...field} />
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
                    <FormLabel>Phone Number (Optional)</FormLabel>
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
                      <Input placeholder="Lead, Senior, etc." {...field} />
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
                  <User className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Work Schedule</h3>
                </div>
                
                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                  <div key={day} className="space-y-4 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name={`schedule.${day}.available`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium capitalize">
                              {day}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {form.watch(`schedule.${day}.available`) && (
                      <FormField
                        control={form.control}
                        name={`schedule.${day}`}
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4" />
                              <FormLabel className="text-sm">Work Hours</FormLabel>
                            </div>
                            <FormControl>
                              <div className="space-y-4">
                                <Slider
                                  value={[
                                    parseInt(field.value?.start?.split(':')[0] || '8') * 60 + parseInt(field.value?.start?.split(':')[1] || '0'),
                                    parseInt(field.value?.end?.split(':')[0] || '17') * 60 + parseInt(field.value?.end?.split(':')[1] || '0')
                                  ]}
                                  onValueChange={(values) => {
                                    const [start, end] = values;
                                    field.onChange({
                                      ...field.value,
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
            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Employee"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
} 