// Calculate distance between two points using Haversine formula
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in kilometers
  return distance * 3280.84 // Convert to feet
}

// Group employees that are within a certain distance of each other
export function groupNearbyEmployees<T extends {
  id: string
  name: string
  location?: { lat: number; lng: number; lastUpdated: Date }
}>(
  employees: T[],
  maxDistanceFeet: number = 20
): Array<{
  type: 'group' | 'individual'
  employees: T[]
  centerLocation?: { lat: number; lng: number }
}> {
  const groups: Array<{
    type: 'group' | 'individual'
    employees: Array<{
      id: string
      name: string
      location?: { lat: number; lng: number; lastUpdated: Date }
    }>
    centerLocation?: { lat: number; lng: number }
  }> = []

  const processed = new Set<string>()

  employees.forEach((employee) => {
    if (processed.has(employee.id) || !employee.location) return

    const nearbyEmployees: T[] = [employee]
    processed.add(employee.id)
    
    // We know employee.location exists at this point due to the check above
    const employeeLocation = employee.location!

    // Find all employees within the specified distance
    employees.forEach((otherEmployee) => {
      if (
        otherEmployee.id !== employee.id &&
        !processed.has(otherEmployee.id) &&
        otherEmployee.location
      ) {
        const distance = calculateDistance(
          employeeLocation.lat,
          employeeLocation.lng,
          otherEmployee.location.lat,
          otherEmployee.location.lng
        )

        if (distance <= maxDistanceFeet) {
          nearbyEmployees.push(otherEmployee)
          processed.add(otherEmployee.id)
        }
      }
    })

    // Calculate center location for groups
    let centerLocation: { lat: number; lng: number } | undefined
    if (nearbyEmployees.length > 1) {
      const avgLat =
        nearbyEmployees.reduce((sum, emp) => sum + (emp.location?.lat || 0), 0) /
        nearbyEmployees.length
      const avgLng =
        nearbyEmployees.reduce((sum, emp) => sum + (emp.location?.lng || 0), 0) /
        nearbyEmployees.length
      centerLocation = { lat: avgLat, lng: avgLng }
    } else {
      centerLocation = { lat: employeeLocation.lat, lng: employeeLocation.lng }
    }

    const group: {
      type: 'group' | 'individual'
      employees: T[]
      centerLocation?: { lat: number; lng: number }
    } = {
      type: nearbyEmployees.length > 1 ? 'group' : 'individual',
      employees: nearbyEmployees,
      centerLocation: centerLocation,
    }
    groups.push(group)
  })

  return groups as Array<{
    type: 'group' | 'individual'
    employees: T[]
    centerLocation?: { lat: number; lng: number }
  }>
}

// Check if two locations are within a specified distance
export function areLocationsNearby(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  maxDistanceFeet: number = 20
): boolean {
  const distance = calculateDistance(lat1, lon1, lat2, lon2)
  return distance <= maxDistanceFeet
}

// Format distance for display
export function formatDistance(feet: number): string {
  if (feet < 1) {
    return `${Math.round(feet * 12)} inches`
  } else if (feet < 5280) {
    return `${Math.round(feet)} feet`
  } else {
    const miles = feet / 5280
    return `${miles.toFixed(1)} miles`
  }
} 
 