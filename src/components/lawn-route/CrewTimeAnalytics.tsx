"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Car, DollarSign, TrendingUp, TrendingDown, Clock, Users } from "lucide-react"
import type { Route } from "@/lib/types"
import { getPerformanceSummary, formatDuration } from "@/lib/time-analytics-service"
import { calculateScheduleStatus } from "@/lib/schedule-status-service"

interface CrewTimeAnalyticsProps {
  route: Route
  crewName?: string
  showComparison?: boolean
  averageEfficiency?: number // For comparison
}

/**
 * Crew Time Analytics Component
 *
 * Displays crew performance metrics for managers
 */
export function CrewTimeAnalytics({
  route,
  crewName = `Crew ${route.crewId}`,
  showComparison = false,
  averageEfficiency = 0.65 // Default 65% efficiency
}: CrewTimeAnalyticsProps) {
  const performance = getPerformanceSummary(route)
  const scheduleStatus = calculateScheduleStatus(route)

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 0.7) return "text-green-600"
    if (efficiency >= 0.5) return "text-yellow-600"
    return "text-red-600"
  }

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 0.7) return "bg-green-100 text-green-800 border-green-200"
    if (efficiency >= 0.5) return "bg-yellow-100 text-yellow-800 border-yellow-200"
    return "bg-red-100 text-red-800 border-red-200"
  }

  const getStatusBadge = () => {
    switch (scheduleStatus.status) {
      case 'on_schedule':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">On Schedule</Badge>
      case 'ahead':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Ahead</Badge>
      case 'behind':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Behind</Badge>
      default:
        return null
    }
  }

  const completedStops = route.stops.filter(s => s.status === 'completed').length
  const totalStops = route.stops.length

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              {crewName}
            </CardTitle>
            <CardDescription>
              {completedStops}/{totalStops} stops completed
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Time Breakdown Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Car className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">Drive Time</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {formatDuration(performance.totalTime * (performance.driveTimePercentage / 100))}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              {Math.round(performance.driveTimePercentage)}%
            </div>
          </div>

          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-800">Work Time</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {formatDuration(performance.totalTime * (performance.workTimePercentage / 100))}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {Math.round(performance.workTimePercentage)}%
            </div>
          </div>
        </div>

        {/* Efficiency Score */}
        <div className={`p-4 rounded-lg border-2 ${getEfficiencyBadge(performance.efficiency)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Efficiency Score</span>
            <div className={`text-2xl font-bold ${getEfficiencyColor(performance.efficiency)}`}>
              {Math.round(performance.efficiency * 100)}%
            </div>
          </div>
          {showComparison && (
            <div className="flex items-center gap-2 text-xs">
              {performance.efficiency > averageEfficiency ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">
                    {Math.round((performance.efficiency - averageEfficiency) * 100)}% above average
                  </span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600">
                    {Math.round((averageEfficiency - performance.efficiency) * 100)}% below average
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Avg Time per Stop</span>
            <span className="font-medium text-gray-900">
              {formatDuration(performance.averageTimePerStop)}
            </span>
          </div>

          {performance.fastestStop && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Fastest Stop</span>
              <div className="text-right">
                <div className="font-medium text-green-600">
                  {formatDuration(performance.fastestStop.workDuration)}
                </div>
                <div className="text-xs text-gray-500">{performance.fastestStop.customerName}</div>
              </div>
            </div>
          )}

          {performance.slowestStop && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Slowest Stop</span>
              <div className="text-right">
                <div className="font-medium text-yellow-600">
                  {formatDuration(performance.slowestStop.workDuration)}
                </div>
                <div className="text-xs text-gray-500">{performance.slowestStop.customerName}</div>
              </div>
            </div>
          )}

          {performance.totalTime > 0 && (
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
              <span className="text-gray-600">Total Time</span>
              <span className="font-bold text-gray-900">
                {formatDuration(performance.totalTime)}
              </span>
            </div>
          )}
        </div>

        {/* Schedule Status */}
        <div className="p-3 bg-white border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Schedule Status</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {scheduleStatus.message}
            </span>
          </div>
          {scheduleStatus.minutesDelta > 0 && scheduleStatus.status !== 'on_schedule' && (
            <div className="mt-2 text-xs text-gray-600">
              {scheduleStatus.status === 'ahead' ? 'Ahead by' : 'Behind by'} {scheduleStatus.minutesDelta} minutes
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
