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
import { PlacesAutocompleteSimple } from "@/components/ui/places-autocomplete-simple"
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
import { Calendar, Clock, Trash2, Camera, CheckCircle2 } from "lucide-react"
import type { DayOfWeek, Customer } from "@/lib/types"
import { ServicePhotoManager } from "@/components/lawn-route/ServicePhotoManager"

interface EditCustomerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
  onUpdateCustomer: (data: z.infer<typeof formSchema>) => Promise<void>
  onDeleteCustomer: (customerId: string) => Promise<void>
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Please enter a valid address." }),
  coordinates: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  notes: z.string().optional(),
  serviceType: z.enum(['push-mow', 'edge', 'blow', 'detail', 'riding-mow']),
  servicePreferences: z.object({
    preferredDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).default([]),
    preferredTimeRange: z.object({
      start: z.string(),
      end: z.string(),
    }),
    serviceFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'one-time']).default('weekly'),
    specialInstructions: z.string().optional(),
  }),
})

export function EditCustomerSheet({ open, onOpenChange, customer, onUpdateCustomer, onDeleteCustomer }: EditCustomerSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('details')

  const SERVICE_TYPES = [
    { value: 'push-mow', label: 'Push Mow' },
    { value: 'edge', label: 'Edge' },
    { value: 'blow', label: 'Blow' },
    { value: 'detail', label: 'Detail' },
    { value: 'riding-mow', label: 'Riding Mow' },
  ];

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      name: "",
      address: "",
      coordinates: undefined,
      notes: "",
      serviceType: "push-mow",
      servicePreferences: {
        preferredDays: [],
        preferredTimeRange: {
          start: "08:00",
          end: "17:00",
        },
        serviceFrequency: 'weekly',
        specialInstructions: '',
      },
    },
  })

  // Update form when customer changes
  React.useEffect(() => {
    if (customer) {
      const serviceType = customer.services?.[0]?.type || 'push-mow';
      const frequency = customer.servicePreferences?.serviceFrequency || 7;
      const serviceFrequency = frequency === 7 ? 'weekly' : 
                             frequency === 14 ? 'biweekly' : 
                             frequency === 30 ? 'monthly' : 'one-time';

      form.reset({
        name: customer.name,
        address: customer.address,
        coordinates: { lat: customer.lat, lng: customer.lng },
        notes: customer.notes || '',
        serviceType: serviceType as any,
        servicePreferences: {
          preferredDays: customer.servicePreferences?.preferredDays || [],
          preferredTimeRange: customer.servicePreferences?.preferredTimeRange || { start: "08:00", end: "17:00" },
          serviceFrequency: serviceFrequency as any,
          specialInstructions: customer.servicePreferences?.specialInstructions || '',
        },
      });
    }
  }, [customer, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!customer) return;
    
    setIsSubmitting(true)
    try {
      await onUpdateCustomer(values)
      toast({
        title: "Customer Updated",
        description: `${values.name} has been updated successfully.`,
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!customer) return;
    
    setIsDeleting(true)
    try {
      await onDeleteCustomer(customer.id)
      toast({
        title: "Customer Deleted",
        description: `${customer.name} has been deleted.`,
      })
      setShowDeleteDialog(false)
      onOpenChange(false)
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete customer. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (!customer) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-lg max-h-[90svh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            // Don't close if clicking on autocomplete
            if (e.target && (e.target as Element).closest('.pac-container')) {
              e.preventDefault()
            }
          }}
        >
          <SheetHeader className="text-left">
            <SheetTitle>Edit Customer</SheetTitle>
            <SheetDescription>
              Update the details for {customer.name}
            </SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Services & Photos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <div className="grid gap-4 py-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <PlacesAutocompleteSimple
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Start typing an address..."
                          onPlaceSelect={(place: google.maps.places.PlaceResult) => {
                            // Extract coordinates when a place is selected
                            if (place.geometry?.location) {
                              const lat = place.geometry.location.lat()
                              const lng = place.geometry.location.lng()
                              form.setValue('coordinates', { lat, lng })
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVICE_TYPES.map((service) => (
                            <SelectItem key={service.value} value={service.value}>
                              {service.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                {/* Service Preferences Section */}
                <div className="space-y-4 border-t pt-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Service Preferences</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="servicePreferences.preferredDays"
                    render={() => (
                      <FormItem>
                        <FormLabel>Preferred Service Days</FormLabel>
                        <div className="grid grid-cols-7 gap-3">
                          {[
                            { value: 'monday', short: 'Mon' },
                            { value: 'tuesday', short: 'Tue' },
                            { value: 'wednesday', short: 'Wed' },
                            { value: 'thursday', short: 'Thu' },
                            { value: 'friday', short: 'Fri' },
                            { value: 'saturday', short: 'Sat' },
                            { value: 'sunday', short: 'Sun' },
                          ].map((day) => (
                            <FormField
                              key={day.value}
                              control={form.control}
                              name="servicePreferences.preferredDays"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={day.value}
                                    className="flex flex-col items-center space-y-2"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(day.value as DayOfWeek)}
                                        onCheckedChange={(checked) => {
                                          const currentDays = field.value || [];
                                          return checked
                                            ? field.onChange([...currentDays, day.value as DayOfWeek])
                                            : field.onChange(
                                                currentDays.filter(
                                                  (value) => value !== day.value
                                                )
                                              )
                                        }}
                                        className="w-10 h-10"
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-medium cursor-pointer">
                                      {day.short}
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

                  <FormField
                    control={form.control}
                    name="servicePreferences.preferredTimeRange"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5" />
                          <FormLabel>Preferred Time Range</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="servicePreferences.serviceFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="one-time">One-time</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      Delete Customer
                    </Button>
                    <div className="flex gap-2">
                      <SheetClose asChild>
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                      </SheetClose>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Updating..." : "Update Customer"}
                      </Button>
                    </div>
                  </SheetFooter>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <div className="py-6 space-y-6">
                {customer.services && customer.services.length > 0 ? (
                  customer.services.map((service) => (
                    <div key={service.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg capitalize">
                            {service.type.replace('-', ' ')}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {service.description || 'No description'}
                          </p>
                          {service.scheduledDate && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Scheduled: {typeof service.scheduledDate === 'object' && 'seconds' in service.scheduledDate
                                ? new Date(service.scheduledDate.seconds * 1000).toLocaleDateString()
                                : new Date(service.scheduledDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          service.status === 'completed' ? 'bg-green-100 text-green-800' :
                          service.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {service.status === 'completed' && <CheckCircle2 className="w-4 h-4 inline mr-1" />}
                          {service.status}
                        </div>
                      </div>

                      {/* Photo Manager */}
                      <ServicePhotoManager
                        customerId={customer.id}
                        serviceId={service.id}
                        onPhotosChanged={() => {
                          toast({
                            title: "Photos Updated",
                            description: "Service photos have been updated successfully",
                          });
                        }}
                        canEdit={service.status !== 'completed'}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No services found for this customer</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {customer.name}? This action cannot be undone.
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