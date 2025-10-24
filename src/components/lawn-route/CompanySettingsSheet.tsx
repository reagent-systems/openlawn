"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
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
import { Home, Loader2 } from "lucide-react"

interface CompanySettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyId: string
  currentBaseLocation?: { lat: number; lng: number; address: string } | null
  onLocationUpdated?: () => void
}

export function CompanySettingsSheet({
  open,
  onOpenChange,
  companyId,
  currentBaseLocation,
  onLocationUpdated
}: CompanySettingsSheetProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm({
    defaultValues: {
      address: currentBaseLocation?.address || '',
      coordinates: currentBaseLocation ? { lat: currentBaseLocation.lat, lng: currentBaseLocation.lng } : undefined,
    },
  })

  // Update form when current location changes
  React.useEffect(() => {
    if (currentBaseLocation) {
      form.setValue('address', currentBaseLocation.address)
      form.setValue('coordinates', { lat: currentBaseLocation.lat, lng: currentBaseLocation.lng })
    }
  }, [currentBaseLocation, form])

  const onSubmit = async (values: { address: string; coordinates?: { lat: number; lng: number } }) => {
    setIsSubmitting(true)
    try {
      if (!values.address) {
        toast({
          title: "Error",
          description: "Please enter an address",
          variant: "destructive",
        })
        return
      }

      if (!values.coordinates) {
        toast({
          title: "Location Required",
          description: "Please select an address from the autocomplete suggestions.",
          variant: "destructive",
        })
        return
      }

      // Update company base location
      const { updateCompanyBaseLocation } = await import('@/lib/company-service')
      await updateCompanyBaseLocation(companyId, {
        lat: values.coordinates.lat,
        lng: values.coordinates.lng,
        address: values.address,
      })

      toast({
        title: "Success",
        description: "Home base location updated successfully",
      })

      onLocationUpdated?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating base location:', error)
      toast({
        title: "Error",
        description: "Failed to update home base location. Please try again.",
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
              <SheetTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Company Settings
              </SheetTitle>
              <SheetDescription>
                Set your home base location where crews start and end their day
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4 py-6">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home Base Address</FormLabel>
                    <FormControl>
                      <PlacesAutocompleteSimple
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Start typing an address..."
                        disabled={isSubmitting}
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
                    <FormDescription>
                      Start typing and select your business address from the suggestions
                    </FormDescription>
                    {currentBaseLocation && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Current: {currentBaseLocation.address}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Location'
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
