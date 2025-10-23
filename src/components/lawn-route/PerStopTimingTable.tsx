"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, Car, DollarSign, MapPin } from "lucide-react"
import type { Route } from "@/lib/types"
import { formatDuration } from "@/lib/time-analytics-service"

interface PerStopTimingTableProps {
  route: Route
  compact?: boolean
}

/**
 * Per-Stop Timing Table Component
 *
 * Displays detailed timing information for each stop in a route
 */
export function PerStopTimingTable({ route, compact = false }: PerStopTimingTableProps) {
  const formatTime = (date: Date | undefined) => {
    if (!date) return '-'
    const d = date instanceof Date ? date : new Date(date)
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 text-xs">Completed</Badge>
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">In Progress</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 text-xs">Pending</Badge>
      case 'skipped':
        return <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">Skipped</Badge>
      default:
        return null
    }
  }

  const getEfficiencyColor = (driveTime: number | undefined, workTime: number | undefined) => {
    if (!driveTime || !workTime) return ''
    const efficiency = workTime / (workTime + driveTime)
    if (efficiency >= 0.7) return 'text-green-600'
    if (efficiency >= 0.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {route.stops.map((stop, index) => (
          <div key={stop.customerId} className="p-3 bg-white border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">#{index + 1}</span>
                <span className="text-sm">{stop.customerName}</span>
              </div>
              {getStatusBadge(stop.status)}
            </div>
            {stop.status === 'completed' && (
              <div className="flex gap-4 text-xs text-gray-600">
                {stop.driveTime && (
                  <div className="flex items-center gap-1">
                    <Car className="w-3 h-3" />
                    <span>{stop.driveTime}min</span>
                  </div>
                )}
                {stop.workTime && (
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span>{stop.workTime}min</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Per-Stop Timing Details
        </CardTitle>
        <CardDescription>Detailed breakdown of time spent at each location</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Arrival</TableHead>
                <TableHead className="text-right">Departure</TableHead>
                <TableHead className="text-right">Drive</TableHead>
                <TableHead className="text-right">Work</TableHead>
                <TableHead className="text-right">Efficiency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {route.stops.map((stop, index) => {
                const efficiency = stop.driveTime && stop.workTime
                  ? (stop.workTime / (stop.workTime + stop.driveTime)) * 100
                  : null

                return (
                  <TableRow key={stop.customerId}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{stop.customerName}</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {stop.address}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(stop.status)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatTime(stop.actualArrival)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatTime(stop.actualDeparture)}
                    </TableCell>
                    <TableCell className="text-right">
                      {stop.driveTime ? (
                        <div className="flex items-center justify-end gap-1 text-blue-600">
                          <Car className="w-3 h-3" />
                          <span className="font-medium">{stop.driveTime}m</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {stop.workTime ? (
                        <div className="flex items-center justify-end gap-1 text-green-600">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium">{stop.workTime}m</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {efficiency !== null ? (
                        <span className={`font-bold ${getEfficiencyColor(stop.driveTime, stop.workTime)}`}>
                          {Math.round(efficiency)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary Row */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-600 mb-1">Total Stops</div>
              <div className="text-xl font-bold text-gray-900">{route.stops.length}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Completed</div>
              <div className="text-xl font-bold text-green-600">
                {route.stops.filter(s => s.status === 'completed').length}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Remaining</div>
              <div className="text-xl font-bold text-blue-600">
                {route.stops.filter(s => s.status === 'pending' || s.status === 'in_progress').length}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
