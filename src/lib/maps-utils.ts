import type { DailyRoute } from './firebase-types'

/**
 * Generate a Google Maps URL that opens the route in the Google Maps app
 * with all stops listed in order
 */
export function generateGoogleMapsRouteUrl(
  route: DailyRoute,
  baseLocation?: { lat: number; lng: number; address: string } | null
): string {
  const baseUrl = 'https://www.google.com/maps/dir/?api=1'
  
  // Determine origin (start point)
  let origin: string
  let destination: string
  let waypoints: string[] = []

  if (baseLocation) {
    // Use home base as start and end
    origin = `${baseLocation.lat},${baseLocation.lng}`
    destination = `${baseLocation.lat},${baseLocation.lng}`
    
    // All customers become waypoints
    waypoints = route.customers.map(customer => 
      `${customer.lat},${customer.lng}`
    )
  } else {
    // Fallback: use first customer as origin, last as destination
    if (route.customers.length === 0) {
      return baseUrl
    }
    
    const firstCustomer = route.customers[0]
    const lastCustomer = route.customers[route.customers.length - 1]
    
    origin = `${firstCustomer.lat},${firstCustomer.lng}`
    destination = `${lastCustomer.lat},${lastCustomer.lng}`
    
    // Middle customers become waypoints
    if (route.customers.length > 2) {
      waypoints = route.customers.slice(1, -1).map(customer => 
        `${customer.lat},${customer.lng}`
      )
    }
  }

  // Build URL with waypoints
  const params = new URLSearchParams({
    origin,
    destination,
  })

  // Add waypoints if any
  if (waypoints.length > 0) {
    // Google Maps API supports up to 25 waypoints, but we'll use the waypoints parameter
    // Format: waypoints=lat1,lng1|lat2,lng2|...
    params.append('waypoints', waypoints.join('|'))
  }

  return `${baseUrl}&${params.toString()}`
}

/**
 * Generate Google Maps URL for multiple routes (for manager view)
 * Returns URL for the first route, or can be extended to handle multiple routes
 */
export function generateGoogleMapsUrlForRoutes(
  routes: DailyRoute[],
  baseLocation?: { lat: number; lng: number; address: string } | null
): string {
  if (routes.length === 0) {
    return 'https://www.google.com/maps'
  }

  // For now, return URL for the first route
  // Could be extended to show all routes or let user select
  return generateGoogleMapsRouteUrl(routes[0], baseLocation)
}

