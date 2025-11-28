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
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock } from "lucide-react"
import type { DayOfWeek } from "@/lib/types"

interface AddCustomerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddCustomer: (data: z.infer<typeof formSchema>) => Promise<void>
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  address: z.string().min(5, { message: "Please enter a valid address." }),
  coordinates: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  notes: z.string().optional(),
  serviceTypes: z.array(z.string()).min(1, { message: "At least one service type is required." }),
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

export function AddCustomerSheet({ open, onOpenChange, onAddCustomer }: AddCustomerSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

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
      serviceTypes: ["push-mow"],
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      await onAddCustomer(values)
      toast({
        title: "Customer Added",
        description: `${values.name} has been added to your customer list.`,
      })
      form.reset()
    } catch {
      toast({
        title: "Error",
        description: "Failed to add customer. Please try again.",
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
        onPointerDownOutside={(e) => {
          // Don't close if clicking on autocomplete
          if (e.target && (e.target as Element).closest('.pac-container')) {
            e.preventDefault()
          }
        }}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <SheetHeader className="text-left">
              <SheetTitle>Add New Customer</SheetTitle>
              <SheetDescription>
                Fill in the details for the new customer. Click save when you are done.
              </SheetDescription>
            </SheetHeader>
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
            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Customer"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
