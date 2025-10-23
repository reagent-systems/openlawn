"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScheduleStatusCard } from "./ScheduleStatusCard"
import { TimeBreakdownWidget } from "./TimeBreakdownWidget"
import { StopTimer } from "./StopTimer"
import { PerStopTimingTable } from "./PerStopTimingTable"
import type { Route, RouteStop } from "@/lib/types"
import { RouteProgressCalculator } from "@/lib/route-progress-service"
import { autoDetectArrival } from "@/lib/route-tracking-service"

interface EmployeeRouteViewProps {
  route: Route
  employeeLocation?: { lat: number; lng: number }
  onStopArrival: (customerId: string) => void
  onStopDeparture: (customerId: string) => void
  onStopPause?: (customerId: string) => void
  onStopResume?: (customerId: string) => void
}

/**
 * Employee Route View Component
 *
 * Complete employee dashboard with:
 * - Schedule status tracking
 * - Stop timer for clock-in/out
 * - Time breakdown analytics
 * - Per-stop timing details
 */
export function EmployeeRouteView({
  route,
  employeeLocation,
  onStopArrival,
  onStopDeparture,
  onStopPause,
  onStopResume
}: EmployeeRouteViewProps) {
  const [currentTime, setCurrentTime] = React.useState(new Date())

  // Update current time every minute
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Auto-detect arrival at stops (if employee location is available)
  React.useEffect(() => {
    if (!employeeLocation) return

    const stopToArrive = autoDetectArrival(employeeLocation, route, 50) // 50 meter threshold
    if (stopToArrive) {
      console.log(`Auto-detected arrival at ${stopToArrive.customerName}`)
      // Optionally auto-trigger arrival
      // onStopArrival(stopToArrive.customerId)
    }
  }, [employeeLocation, route])

  // Get current and next stops
  const currentStop = route.stops.find(stop => stop.status === 'in_progress')
  const nextStop = route.stops.find(stop => stop.status === 'pending')
  const recentStops = route.stops.filter(stop => stop.status === 'completed').slice(-3)

  return (
    <div className="space-y-4 p-4">
      {/* Schedule Status Card - Always visible at top */}
      <ScheduleStatusCard route={route} currentTime={currentTime} showDetails={true} />

      {/* Tabs for different views */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="all-stops">All Stops</TabsTrigger>
        </TabsList>

        {/* Current Stop Tab */}
        <TabsContent value="current" className="space-y-4 mt-4">
          {/* Current Stop Timer */}
          {currentStop && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Current Stop</h3>
              <StopTimer
                stop={currentStop}
                onArrive={() => onStopArrival(currentStop.customerId)}
                onDepart={() => onStopDeparture(currentStop.customerId)}
                onPause={onStopPause ? () => onStopPause(currentStop.customerId) : undefined}
                onResume={onStopResume ? () => onStopResume(currentStop.customerId) : undefined}
                showTimer={true}
              />
            </div>
          )}

          {/* Next Stop Preview */}
          {nextStop && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Next Stop</h3>
              <StopTimer
                stop={nextStop}
                onArrive={() => onStopArrival(nextStop.customerId)}
                onDepart={() => onStopDeparture(nextStop.customerId)}
                showTimer={false}
              />
            </div>
          )}

          {/* Recent Completed Stops */}
          {recentStops.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">Recently Completed</h3>
              <div className="space-y-2">
                {recentStops.map(stop => (
                  <div key={stop.customerId} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-green-800">{stop.customerName}</span>
                      {stop.workTime && (
                        <span className="text-sm text-green-600">{stop.workTime} min</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No active stops message */}
          {!currentStop && !nextStop && (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600">All stops completed!</p>
              <p className="text-sm text-gray-500 mt-2">Great work today!</p>
            </div>
          )}
        </TabsContent>

        {/* Time Breakdown Tab */}
        <TabsContent value="time" className="mt-4">
          <TimeBreakdownWidget route={route} showPercentages={true} compact={false} />
        </TabsContent>

        {/* All Stops Tab */}
        <TabsContent value="all-stops" className="mt-4">
          <PerStopTimingTable route={route} compact={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
