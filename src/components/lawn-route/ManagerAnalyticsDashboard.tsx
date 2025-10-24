"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { CrewTimeAnalytics } from "./CrewTimeAnalytics"
import { PerStopTimingTable } from "./PerStopTimingTable"
import { TimeBreakdownWidget } from "./TimeBreakdownWidget"
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import type { Route } from "@/lib/types"
import type { User } from "@/lib/firebase-types"
import { calculateScheduleStatus, isSignificantlyDelayed } from "@/lib/schedule-status-service"
import { getPerformanceSummary } from "@/lib/time-analytics-service"

interface ManagerAnalyticsDashboardProps {
  routes: Route[]
  users: User[]
  currentTime?: Date
}

/**
 * Manager Analytics Dashboard Component
 *
 * Comprehensive crew performance dashboard for managers
 */
export function ManagerAnalyticsDashboard({
  routes,
  users,
  currentTime = new Date()
}: ManagerAnalyticsDashboardProps) {
  const [selectedCrewId, setSelectedCrewId] = React.useState<string | null>(
    routes.length > 0 ? routes[0].crewId : null
  )

  // Calculate overall metrics
  const totalRoutes = routes.length
  const onScheduleRoutes = routes.filter(route => {
    const status = calculateScheduleStatus(route, currentTime)
    return status.status === 'on_schedule'
  }).length
  const behindRoutes = routes.filter(route => {
    const status = calculateScheduleStatus(route, currentTime)
    return status.status === 'behind'
  }).length
  const delayedRoutes = routes.filter(route =>
    isSignificantlyDelayed(route, currentTime)
  ).length

  // Calculate average efficiency
  const performances = routes.map(route => getPerformanceSummary(route))
  const averageEfficiency = performances.length > 0
    ? performances.reduce((sum, p) => sum + p.efficiency, 0) / performances.length
    : 0

  // Get selected route
  const selectedRoute = selectedCrewId
    ? routes.find(r => r.crewId === selectedCrewId) || null
    : null

  // Get crew name
  const getCrewName = (crewId: string) => {
    const crewMembers = users.filter(u => u.crewId === crewId)
    if (crewMembers.length > 0) {
      return `Crew ${crewId} (${crewMembers.length} members)`
    }
    return `Crew ${crewId}`
  }

  return (
    <div className="space-y-4 p-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Crews</div>
            <div className="text-2xl font-bold">{totalRoutes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">On Schedule</div>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-5 h-5" />
              {onScheduleRoutes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Behind</div>
            <div className="text-2xl font-bold text-yellow-600 flex items-center gap-1">
              <Clock className="w-5 h-5" />
              {behindRoutes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600 mb-1">Avg Efficiency</div>
            <div className={`text-2xl font-bold ${
              averageEfficiency >= 0.7 ? 'text-green-600' :
              averageEfficiency >= 0.5 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {Math.round(averageEfficiency * 100)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delayed Crews Alert */}
      {delayedRoutes > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                {delayedRoutes} crew{delayedRoutes > 1 ? 's' : ''} significantly delayed (30+ min)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Crew Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Crew Performance</CardTitle>
          <CardDescription>Select a crew to view detailed analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {routes.map(route => {
              const status = calculateScheduleStatus(route, currentTime)
              const isSelected = selectedCrewId === route.crewId

              return (
                <button
                  key={route.crewId}
                  onClick={() => setSelectedCrewId(route.crewId)}
                  className={`px-4 py-2 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{getCrewName(route.crewId)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        status.status === 'on_schedule' ? 'bg-green-100 text-green-800' :
                        status.status === 'ahead' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {status.status === 'on_schedule' ? 'On Track' :
                       status.status === 'ahead' ? 'Ahead' : 'Behind'}
                    </Badge>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Crew Details */}
      {selectedRoute && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="time">Time Analysis</TabsTrigger>
            <TabsTrigger value="stops">Stop Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            <CrewTimeAnalytics
              route={selectedRoute}
              crewName={getCrewName(selectedRoute.crewId)}
              showComparison={true}
              averageEfficiency={averageEfficiency}
            />
          </TabsContent>

          {/* Time Analysis Tab */}
          <TabsContent value="time" className="mt-4">
            <TimeBreakdownWidget
              route={selectedRoute}
              showPercentages={true}
              compact={false}
            />
          </TabsContent>

          {/* Stop Details Tab */}
          <TabsContent value="stops" className="mt-4">
            <PerStopTimingTable
              route={selectedRoute}
              compact={false}
            />
          </TabsContent>
        </Tabs>
      )}

      {routes.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">No active routes today</p>
            <p className="text-sm text-gray-500 mt-2">Routes will appear when crews start their day</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
