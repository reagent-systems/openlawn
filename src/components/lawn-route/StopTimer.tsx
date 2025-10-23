"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Play, Square, MapPin, Pause } from "lucide-react"
import type { RouteStop } from "@/lib/types"

interface StopTimerProps {
  stop: RouteStop
  onArrive: () => void
  onDepart: () => void
  onPause?: () => void
  onResume?: () => void
  showTimer?: boolean
  disabled?: boolean
}

/**
 * StopTimer Component
 *
 * Allows employees to clock in/out at customer stops with a live timer
 */
export function StopTimer({
  stop,
  onArrive,
  onDepart,
  onPause,
  onResume,
  showTimer = true,
  disabled = false
}: StopTimerProps) {
  const [elapsedTime, setElapsedTime] = React.useState(0)
  const [isPaused, setIsPaused] = React.useState(false)

  // Calculate elapsed time at stop
  React.useEffect(() => {
    if (stop.status !== 'in_progress' || !stop.actualArrival) {
      setElapsedTime(0)
      return
    }

    // Check if paused
    if (stop.pausedAt && !stop.resumedAt) {
      setIsPaused(true)
      return
    } else {
      setIsPaused(false)
    }

    const arrivalTime = stop.actualArrival instanceof Date
      ? stop.actualArrival.getTime()
      : new Date(stop.actualArrival).getTime()

    // Account for pause time
    let pauseTimeMs = 0
    if (stop.pausedAt && stop.resumedAt) {
      const pausedTime = stop.pausedAt instanceof Date
        ? stop.pausedAt.getTime()
        : new Date(stop.pausedAt).getTime()
      const resumedTime = stop.resumedAt instanceof Date
        ? stop.resumedAt.getTime()
        : new Date(stop.resumedAt).getTime()
      pauseTimeMs = resumedTime - pausedTime
    }

    const calculateElapsed = () => {
      const now = Date.now()
      const elapsed = Math.floor((now - arrivalTime - pauseTimeMs) / 1000)
      setElapsedTime(Math.max(0, elapsed))
    }

    // Initial calculation
    calculateElapsed()

    // Update every second
    const interval = setInterval(calculateElapsed, 1000)

    return () => clearInterval(interval)
  }, [stop.status, stop.actualArrival, stop.pausedAt, stop.resumedAt])

  const handlePause = () => {
    if (onPause) {
      onPause()
    }
  }

  const handleResume = () => {
    if (onResume) {
      onResume()
    }
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusBadge = () => {
    switch (stop.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-gray-100">Pending</Badge>
      case 'in_progress':
        return isPaused
          ? <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Paused</Badge>
          : <Badge variant="outline" className="bg-blue-100 text-blue-800">In Progress</Badge>
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>
      case 'skipped':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Skipped</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">{stop.customerName}</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription className="text-sm">{stop.address}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timer Display */}
        {showTimer && stop.status === 'in_progress' && (
          <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-6 h-6 text-gray-600" />
              <span className="text-sm text-gray-600 font-medium">Time at location</span>
            </div>
            <div className="text-4xl font-bold text-blue-600 font-mono">
              {formatTime(elapsedTime)}
            </div>
            {isPaused && (
              <div className="mt-2 text-sm text-yellow-600">
                ⏸ Paused
              </div>
            )}
          </div>
        )}

        {/* Completed Time Display */}
        {stop.status === 'completed' && stop.workTime && (
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Work Time:</span>
            </div>
            <span className="text-lg font-bold text-green-800">
              {stop.workTime} min
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {stop.status === 'pending' && (
            <Button
              onClick={onArrive}
              disabled={disabled}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Arrive at Stop
            </Button>
          )}

          {stop.status === 'in_progress' && !isPaused && (
            <>
              <Button
                onClick={onDepart}
                disabled={disabled}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Square className="w-4 h-4 mr-2" />
                Complete & Depart
              </Button>
              {onPause && (
                <Button
                  onClick={handlePause}
                  disabled={disabled}
                  variant="outline"
                  className="px-4"
                >
                  <Pause className="w-4 h-4" />
                </Button>
              )}
            </>
          )}

          {stop.status === 'in_progress' && isPaused && onResume && (
            <Button
              onClick={handleResume}
              disabled={disabled}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}

          {stop.status === 'completed' && (
            <div className="flex-1 text-center py-2 text-green-600 font-medium">
              ✓ Stop Completed
            </div>
          )}
        </div>

        {/* Stop Details */}
        {stop.estimatedArrival && stop.status === 'pending' && (
          <div className="text-sm text-gray-600 text-center">
            Estimated Arrival: {stop.estimatedArrival}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
