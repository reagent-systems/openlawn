"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react"
import type { Route } from "@/lib/types"
import { calculateScheduleStatus, formatTime, getStatusIcon } from "@/lib/schedule-status-service"

interface ScheduleStatusCardProps {
  route: Route
  currentTime?: Date
  showDetails?: boolean
}

/**
 * Schedule Status Card Component
 *
 * Shows employees if they're on schedule, ahead, or behind
 * with visual progress indicators
 */
export function ScheduleStatusCard({
  route,
  currentTime = new Date(),
  showDetails = true
}: ScheduleStatusCardProps) {
  const [status, setStatus] = React.useState(calculateScheduleStatus(route, currentTime))

  // Update status every 30 seconds
  React.useEffect(() => {
    const updateStatus = () => {
      setStatus(calculateScheduleStatus(route, new Date()))
    }

    updateStatus()
    const interval = setInterval(updateStatus, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [route])

  const completedStops = route.stops.filter(stop => stop.status === 'completed').length
  const totalStops = route.stops.length
  const progressPercentage = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0

  const getStatusColor = () => {
    switch (status.status) {
      case 'on_schedule':
        return 'text-green-600'
      case 'ahead':
        return 'text-blue-600'
      case 'behind':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusBadgeColor = () => {
    switch (status.status) {
      case 'on_schedule':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'ahead':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'behind':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = () => {
    switch (status.status) {
      case 'on_schedule':
        return <CheckCircle2 className="w-5 h-5" />
      case 'ahead':
        return <TrendingUp className="w-5 h-5" />
      case 'behind':
        return <TrendingDown className="w-5 h-5" />
      default:
        return <Clock className="w-5 h-5" />
    }
  }

  const getStatusLabel = () => {
    switch (status.status) {
      case 'on_schedule':
        return 'On Schedule'
      case 'ahead':
        return 'Ahead of Schedule'
      case 'behind':
        return 'Running Behind'
      default:
        return 'Unknown'
    }
  }

  const nextStop = route.stops.find(stop => stop.status === 'pending')

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Today&apos;s Schedule</CardTitle>
          </div>
          <Badge variant="outline" className={getStatusBadgeColor()}>
            <span className="mr-1">{getStatusIcon()}</span>
            {getStatusLabel()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              Stop {completedStops} of {totalStops}
            </span>
            <span className="font-bold text-blue-600">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Status Message */}
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className={`flex items-center justify-center gap-2 text-lg font-bold ${getStatusColor()}`}>
              {getStatusIcon()}
              <span>{status.message}</span>
            </div>
            {status.minutesDelta > 0 && status.status !== 'on_schedule' && (
              <div className="mt-1 text-sm text-gray-600">
                {status.status === 'ahead' ? '-' : '+'}{status.minutesDelta} minutes
              </div>
            )}
          </div>
        </div>

        {showDetails && (
          <>
            {/* Next Stop ETA */}
            {nextStop && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Next Stop ETA:</span>
                </div>
                <span className="text-sm font-bold text-blue-800">
                  {nextStop.estimatedArrival || 'Calculating...'}
                </span>
              </div>
            )}

            {/* Estimated Finish Time */}
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Estimated Finish:</span>
              </div>
              <span className="text-sm font-bold text-gray-800">
                {formatTime(status.estimatedFinishTime)}
              </span>
            </div>

            {/* Stops Remaining */}
            {status.stopsRemaining > 0 && (
              <div className="text-center text-sm text-gray-600">
                {status.stopsRemaining} {status.stopsRemaining === 1 ? 'stop' : 'stops'} remaining
              </div>
            )}

            {/* Completion Message */}
            {status.stopsRemaining === 0 && (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-green-600 font-bold text-lg">
                  ✓ All stops completed!
                </div>
                <div className="text-sm text-green-600 mt-1">
                  Great work today!
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
