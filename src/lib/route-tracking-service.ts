/**
 * Route Tracking Service
 *
 * Handles automatic arrival/departure detection and time tracking for route stops
 */

import { Route, RouteStop } from './types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Detect if employee has arrived at a customer location
 * Uses geofencing with configurable threshold
 */
export function detectArrival(
  employeeLocation: { lat: number; lng: number },
  stopLocation: { lat: number; lng: number },
  thresholdMeters: number = 50
): boolean {
  const distance = calculateDistance(
    employeeLocation.lat,
    employeeLocation.lng,
    stopLocation.lat,
    stopLocation.lng
  );

  return distance <= thresholdMeters;
}

/**
 * Find the nearest stop to the employee's current location
 */
export function findNearestStop(
  employeeLocation: { lat: number; lng: number },
  stops: RouteStop[]
): { stop: RouteStop; distance: number } | null {
  if (stops.length === 0) return null;

  let nearestStop = stops[0];
  let minDistance = calculateDistance(
    employeeLocation.lat,
    employeeLocation.lng,
    stops[0].lat,
    stops[0].lng
  );

  for (let i = 1; i < stops.length; i++) {
    const distance = calculateDistance(
      employeeLocation.lat,
      employeeLocation.lng,
      stops[i].lat,
      stops[i].lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestStop = stops[i];
    }
  }

  return { stop: nearestStop, distance: minDistance };
}

/**
 * Get the next pending stop for a route
 */
export function getNextPendingStop(route: Route): RouteStop | null {
  return route.stops.find(stop => stop.status === 'pending') || null;
}

/**
 * Get the current in-progress stop for a route
 */
export function getCurrentStop(route: Route): RouteStop | null {
  return route.stops.find(stop => stop.status === 'in_progress') || null;
}

/**
 * Calculate work time for a completed stop (in minutes)
 */
export function calculateStopWorkTime(stop: RouteStop): number | null {
  if (!stop.actualArrival || !stop.actualDeparture) {
    return null;
  }

  const arrivalTime = stop.actualArrival instanceof Date
    ? stop.actualArrival.getTime()
    : new Date(stop.actualArrival).getTime();

  const departureTime = stop.actualDeparture instanceof Date
    ? stop.actualDeparture.getTime()
    : new Date(stop.actualDeparture).getTime();

  return Math.round((departureTime - arrivalTime) / 1000 / 60); // Minutes
}

/**
 * Calculate drive time to a stop (time from previous stop's departure to this stop's arrival)
 */
export function calculateStopDriveTime(
  currentStop: RouteStop,
  previousStop: RouteStop | null
): number | null {
  if (!currentStop.actualArrival || !previousStop?.actualDeparture) {
    return null;
  }

  const previousDepartureTime = previousStop.actualDeparture instanceof Date
    ? previousStop.actualDeparture.getTime()
    : new Date(previousStop.actualDeparture).getTime();

  const currentArrivalTime = currentStop.actualArrival instanceof Date
    ? currentStop.actualArrival.getTime()
    : new Date(currentStop.actualArrival).getTime();

  return Math.round((currentArrivalTime - previousDepartureTime) / 1000 / 60); // Minutes
}

/**
 * Auto-detect arrival and return the stop that should be marked as arrived
 */
export function autoDetectArrival(
  employeeLocation: { lat: number; lng: number },
  route: Route,
  thresholdMeters: number = 50
): RouteStop | null {
  // Check if there's already an in-progress stop
  const currentStop = getCurrentStop(route);
  if (currentStop) {
    return null; // Already at a stop
  }

  // Get the next pending stop
  const nextStop = getNextPendingStop(route);
  if (!nextStop) {
    return null; // No more stops
  }

  // Check if employee is within threshold of the next stop
  const isAtStop = detectArrival(employeeLocation, nextStop, thresholdMeters);

  if (isAtStop) {
    return nextStop;
  }

  return null;
}

/**
 * Mark a stop as arrived (updates the stop object)
 */
export function markStopArrival(stop: RouteStop, arrivalTime?: Date): RouteStop {
  return {
    ...stop,
    status: 'in_progress',
    actualArrival: arrivalTime || new Date(),
  };
}

/**
 * Mark a stop as departed/completed (updates the stop object and calculates times)
 */
export function markStopDeparture(
  stop: RouteStop,
  previousStop: RouteStop | null,
  departureTime?: Date
): RouteStop {
  const departure = departureTime || new Date();
  const workTime = stop.actualArrival
    ? Math.round((departure.getTime() - (stop.actualArrival instanceof Date ? stop.actualArrival.getTime() : new Date(stop.actualArrival).getTime())) / 1000 / 60)
    : undefined;

  const driveTime = previousStop?.actualDeparture && stop.actualArrival
    ? Math.round(
        ((stop.actualArrival instanceof Date ? stop.actualArrival.getTime() : new Date(stop.actualArrival).getTime()) -
         (previousStop.actualDeparture instanceof Date ? previousStop.actualDeparture.getTime() : new Date(previousStop.actualDeparture).getTime())) / 1000 / 60
      )
    : undefined;

  return {
    ...stop,
    status: 'completed',
    actualDeparture: departure,
    workTime,
    driveTime,
  };
}

/**
 * Pause a stop (records pause time)
 */
export function pauseStop(stop: RouteStop, pauseTime?: Date): RouteStop {
  return {
    ...stop,
    pausedAt: pauseTime || new Date(),
  };
}

/**
 * Resume a stop (records resume time)
 */
export function resumeStop(stop: RouteStop, resumeTime?: Date): RouteStop {
  return {
    ...stop,
    resumedAt: resumeTime || new Date(),
  };
}

/**
 * Get route start time from first stop's estimated arrival
 */
export function getRouteStartTime(route: Route): Date | null {
  const firstStop = route.stops[0];
  if (!firstStop?.estimatedArrival) return null;

  const [hours, minutes] = firstStop.estimatedArrival.split(':').map(Number);
  const startTime = new Date(route.date);
  startTime.setHours(hours, minutes, 0, 0);

  return startTime;
}

/**
 * Get route end time (estimated based on duration)
 */
export function getRouteEndTime(route: Route): Date | null {
  const startTime = getRouteStartTime(route);
  if (!startTime) return null;

  const endTime = new Date(startTime);
  endTime.setMinutes(endTime.getMinutes() + route.estimatedDuration);

  return endTime;
}
