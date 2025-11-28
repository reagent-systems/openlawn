/**
 * Clock Service
 * 
 * Handles employee clock in/out at customer locations
 */

import type { RouteStop } from './types'

/**
 * Clock in at a location
 * Records the clock in time for a stop
 */
export function clockInAtLocation(stop: RouteStop): RouteStop {
  const now = new Date()
  
  return {
    ...stop,
    clockInTime: now,
    status: stop.status === 'pending' ? 'in_progress' : stop.status,
    actualArrival: stop.actualArrival || now,
  }
}

/**
 * Clock out at a location
 * Records the clock out time and calculates total hours
 */
export function clockOutAtLocation(stop: RouteStop, clockOutTime?: Date): RouteStop {
  const now = clockOutTime || new Date()
  
  if (!stop.clockInTime) {
    // If no clock in time, use actualArrival or now
    const clockInTime = stop.actualArrival || now
    return {
      ...stop,
      clockInTime: clockInTime instanceof Date ? clockInTime : new Date(clockInTime),
      clockOutTime: now,
      status: 'completed',
      actualDeparture: stop.actualDeparture || now,
      totalHoursAtLocation: calculateHoursAtLocation(clockInTime, now),
    }
  }
  
  const clockIn = stop.clockInTime instanceof Date ? stop.clockInTime : new Date(stop.clockInTime)
  const totalHours = calculateHoursAtLocation(clockIn, now)
  
  return {
    ...stop,
    clockOutTime: now,
    status: 'completed',
    actualDeparture: stop.actualDeparture || now,
    totalHoursAtLocation: totalHours,
    workTime: Math.round(totalHours * 60), // Convert hours to minutes for workTime
  }
}

/**
 * Calculate total hours worked at a location
 */
export function calculateHoursAtLocation(
  clockInTime: Date | string,
  clockOutTime: Date | string
): number {
  const clockIn = clockInTime instanceof Date ? clockInTime : new Date(clockInTime)
  const clockOut = clockOutTime instanceof Date ? clockOutTime : new Date(clockOutTime)
  
  const diffMs = clockOut.getTime() - clockIn.getTime()
  const diffHours = diffMs / (1000 * 60 * 60) // Convert to hours
  
  return Math.round(diffHours * 100) / 100 // Round to 2 decimal places
}

/**
 * Get hours at location for a stop
 * Returns the calculated hours if available, or calculates from clock times
 */
export function getHoursAtLocation(stop: RouteStop): number | null {
  if (stop.totalHoursAtLocation !== undefined) {
    return stop.totalHoursAtLocation
  }
  
  if (stop.clockInTime && stop.clockOutTime) {
    return calculateHoursAtLocation(stop.clockInTime, stop.clockOutTime)
  }
  
  // If in progress, calculate current hours
  if (stop.clockInTime && stop.status === 'in_progress') {
    const clockIn = stop.clockInTime instanceof Date ? stop.clockInTime : new Date(stop.clockInTime)
    const now = new Date()
    return calculateHoursAtLocation(clockIn, now)
  }
  
  return null
}

/**
 * Check if employee is currently clocked in at a location
 */
export function isClockedIn(stop: RouteStop): boolean {
  return !!stop.clockInTime && !stop.clockOutTime && stop.status === 'in_progress'
}

/**
 * Get formatted hours string (e.g., "2.5 hours" or "0.25 hours")
 */
export function formatHours(hours: number | null): string {
  if (hours === null) return 'N/A'
  
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes} min`
  }
  
  return `${hours.toFixed(2)} hrs`
}

