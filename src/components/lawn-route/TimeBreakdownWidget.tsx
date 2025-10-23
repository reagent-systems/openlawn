"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, DollarSign, Coffee, Clock } from "lucide-react"
import type { Route } from "@/lib/types"
import { calculateTimeBreakdown, calculateRouteEfficiency, formatDuration } from "@/lib/time-analytics-service"

interface TimeBreakdownWidgetProps {
  route: Route
  showPercentages?: boolean
  compact?: boolean
}

/**
 * Time Breakdown Widget Component
 *
 * Displays drive time vs work time breakdown with visual indicators
 */
export function TimeBreakdownWidget({
  route,
  showPercentages = true,
  compact = false
}: TimeBreakdownWidgetProps) {
  const timeBreakdown = calculateTimeBreakdown(route)
  const efficiency = calculateRouteEfficiency(timeBreakdown)

  const totalTime =
    timeBreakdown.driveTime +
    timeBreakdown.workTime +
    timeBreakdown.breakTime +
    timeBreakdown.idleTime

  const drivePercentage = totalTime > 0 ? (timeBreakdown.driveTime / totalTime) * 100 : 0
  const workPercentage = totalTime > 0 ? (timeBreakdown.workTime / totalTime) * 100 : 0
  const breakPercentage = totalTime > 0 ? (timeBreakdown.breakTime / totalTime) * 100 : 0
  const idlePercentage = totalTime > 0 ? (timeBreakdown.idleTime / totalTime) * 100 : 0

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <Car className="w-4 h-4 text-blue-600" />
            <span>Drive</span>
          </div>
          <span className="font-medium">{formatDuration(timeBreakdown.driveTime)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span>Work</span>
          </div>
          <span className="font-medium">{formatDuration(timeBreakdown.workTime)}</span>
        </div>
        {timeBreakdown.breakTime > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Coffee className="w-4 h-4 text-orange-600" />
              <span>Break</span>
            </div>
            <span className="font-medium">{formatDuration(timeBreakdown.breakTime)}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Today&apos;s Time Breakdown
        </CardTitle>
        <CardDescription>Drive vs Revenue-Generating Time</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Visual Progress Bar */}
        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${drivePercentage}%` }}
          />
          <div
            className="absolute h-full bg-green-500 transition-all duration-300"
            style={{
              left: `${drivePercentage}%`,
              width: `${workPercentage}%`
            }}
          />
          <div
            className="absolute h-full bg-orange-400 transition-all duration-300"
            style={{
              left: `${drivePercentage + workPercentage}%`,
              width: `${breakPercentage}%`
            }}
          />
          {idlePercentage > 0 && (
            <div
              className="absolute h-full bg-gray-400 transition-all duration-300"
              style={{
                left: `${drivePercentage + workPercentage + breakPercentage}%`,
                width: `${idlePercentage}%`
              }}
            />
          )}
        </div>

        {/* Time Details */}
        <div className="grid grid-cols-2 gap-3">
          {/* Drive Time */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Car className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-800">Driving</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {formatDuration(timeBreakdown.driveTime)}
            </div>
            {showPercentages && totalTime > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                {Math.round(drivePercentage)}%
              </div>
            )}
          </div>

          {/* Work Time */}
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-800">Working</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {formatDuration(timeBreakdown.workTime)}
            </div>
            {showPercentages && totalTime > 0 && (
              <div className="text-xs text-green-600 mt-1">
                {Math.round(workPercentage)}%
              </div>
            )}
          </div>

          {/* Break Time */}
          {timeBreakdown.breakTime > 0 && (
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Coffee className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-medium text-orange-800">Breaks</span>
              </div>
              <div className="text-lg font-bold text-orange-900">
                {formatDuration(timeBreakdown.breakTime)}
              </div>
              {showPercentages && totalTime > 0 && (
                <div className="text-xs text-orange-600 mt-1">
                  {Math.round(breakPercentage)}%
                </div>
              )}
            </div>
          )}

          {/* Idle Time (if any) */}
          {timeBreakdown.idleTime > 0 && (
            <div className="p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-gray-600" />
                <span className="text-xs font-medium text-gray-800">Idle</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatDuration(timeBreakdown.idleTime)}
              </div>
              {showPercentages && totalTime > 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  {Math.round(idlePercentage)}%
                </div>
              )}
            </div>
          )}
        </div>

        {/* Efficiency Score */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Efficiency Score</span>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(efficiency * 100)}%
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Work time / Total time (higher is better)
          </div>
        </div>

        {/* Total Time */}
        {totalTime > 0 && (
          <div className="text-center text-sm text-gray-600 pt-2 border-t">
            Total Time: <span className="font-medium">{formatDuration(totalTime)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
