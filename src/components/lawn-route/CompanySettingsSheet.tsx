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
import { Input } from "@/components/ui/input"
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
  const [isGeocoding, setIsGeocoding] = React.useState(false)

  const form = useForm({
    defaultValues: {
      address: currentBaseLocation?.address || '',
    },
  })

  // Update form when current location changes
  React.useEffect(() => {
    if (currentBaseLocation) {
      form.setValue('address', currentBaseLocation.address)
    }
  }, [currentBaseLocation, form])

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      setIsGeocoding(true)

      // Use Google Maps Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      )

      const data = await response.json()

      if (data.status === 'OK' && data.results.length > 0) {
        const location = data.results[0].geometry.location
        return {
          lat: location.lat,
          lng: location.lng,
        }
      } else {
        console.error('Geocoding failed:', data.status)
        return null
      }
    } catch (error) {
      console.error('Error geocoding address:', error)
      return null
    } finally {
      setIsGeocoding(false)
    }
  }

  const onSubmit = async (values: { address: string }) => {
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

      // Geocode the address
      const coordinates = await geocodeAddress(values.address)

      if (!coordinates) {
        toast({
          title: "Geocoding Failed",
          description: "Could not find coordinates for this address. Please check the address and try again.",
          variant: "destructive",
        })
        return
      }

      // Update company base location
      const { updateCompanyBaseLocation } = await import('@/lib/company-service')
      await updateCompanyBaseLocation(companyId, {
        lat: coordinates.lat,
        lng: coordinates.lng,
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
                      <Input
                        placeholder="123 Main St, City, State ZIP"
                        {...field}
                        disabled={isSubmitting || isGeocoding}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter your business address or where crews start their day
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
                <Button type="button" variant="outline" disabled={isSubmitting || isGeocoding}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={isSubmitting || isGeocoding}>
                {isSubmitting || isGeocoding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isGeocoding ? "Finding Location..." : "Saving..."}
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
