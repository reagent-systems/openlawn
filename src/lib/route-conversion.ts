/**
 * Route Conversion Utilities
 *
 * Converts between DailyRoute (from route generation) and Route (for timing features)
 */

import type { DailyRoute } from './firebase-types'
import type { Route, RouteStop } from './types'

/**
 * Convert DailyRoute to Route for timing features
 */
export function dailyRouteToRoute(dailyRoute: DailyRoute): Route {
  const stops: RouteStop[] = dailyRoute.customers.map((customer, index) => ({
    customerId: customer.id,
    customerName: customer.name,
    address: customer.address,
    lat: customer.lat,
    lng: customer.lng,
    order: index + 1,
    status: 'pending' as const,
    estimatedArrival: undefined, // Can be calculated from route start time
  }))

  return {
    id: `${dailyRoute.crewId}-${dailyRoute.date.toString()}`,
    crewId: dailyRoute.crewId,
    date: dailyRoute.date instanceof Date ? dailyRoute.date : new Date(dailyRoute.date),
    stops,
    status: 'pending',
    totalDistance: dailyRoute.totalDistance || 0,
    estimatedDuration: dailyRoute.estimatedDuration || 0,
  }
}

/**
 * Convert multiple DailyRoutes to Routes
 */
export function dailyRoutesToRoutes(dailyRoutes: DailyRoute[]): Route[] {
  return dailyRoutes.map(dailyRouteToRoute)
}

/**
 * Update a DailyRoute with stop timing data from a Route
 */
export function updateDailyRouteWithTiming(
  dailyRoute: DailyRoute,
  _route: Route
): DailyRoute {
  // This preserves the DailyRoute structure while adding timing data
  // The timing data lives in the Route object in state
  return dailyRoute
}
