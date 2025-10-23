"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useGeolocation } from "@/hooks/use-geolocation"
import { MapPin, Wifi, WifiOff, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface EmployeeLocationTrackerProps {
  employeeId: string
  employeeName: string
  onLocationUpdate?: (location: { lat: number; lng: number; timestamp: number }) => void
}

export function EmployeeLocationTracker({
  employeeId: _employeeId,
  employeeName: _employeeName,
  onLocationUpdate
}: EmployeeLocationTrackerProps) {
  const { toast } = useToast()
  const {
    latitude,
    longitude,
    accuracy,
    timestamp,
    error,
    isTracking,
    startTracking,
    stopTracking,
    getCurrentPosition
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000
  })

  const handleStartTracking = () => {
    startTracking()
    toast({
      title: "Location Tracking Started",
      description: "Your location is now being shared with your manager.",
    })
  }

  const handleStopTracking = () => {
    stopTracking()
    toast({
      title: "Location Tracking Stopped",
      description: "Your location is no longer being shared.",
    })
  }

  const handleGetCurrentLocation = async () => {
    try {
      const position = await getCurrentPosition()
      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: position.timestamp
      }
      
      onLocationUpdate?.(location)
      
      toast({
        title: "Location Updated",
        description: "Your current location has been sent to your manager.",
      })
    } catch {
      toast({
        title: "Location Error",
        description: "Failed to get your current location.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location Sharing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={isTracking ? "default" : "secondary"}>
            {isTracking ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                Sharing
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                Not Sharing
              </>
            )}
          </Badge>
        </div>

        {/* Current Location */}
        {latitude && longitude && (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Current Location:</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Latitude: {latitude.toFixed(6)}</div>
              <div>Longitude: {longitude.toFixed(6)}</div>
              {accuracy && <div>Accuracy: ±{Math.round(accuracy)} meters</div>}
              {timestamp && (
                <div>Updated: {new Date(timestamp).toLocaleTimeString()}</div>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button onClick={handleStartTracking} className="flex-1">
              Start Sharing Location
            </Button>
          ) : (
            <Button onClick={handleStopTracking} variant="outline" className="flex-1">
              Stop Sharing
            </Button>
          )}
          
          <Button 
            onClick={handleGetCurrentLocation} 
            variant="outline" 
            size="sm"
            disabled={!navigator.geolocation}
          >
            Update Now
          </Button>
        </div>

        {/* Privacy Notice */}
        <div className="text-xs text-muted-foreground">
          Your location is only shared with your manager and crew members. 
          You can stop sharing at any time.
        </div>
      </CardContent>
    </Card>
  )
} 
 