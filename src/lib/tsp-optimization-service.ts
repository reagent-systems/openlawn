import type { Customer } from './firebase-types';

export interface TSPOptimizationOptions {
  startLocation: { lat: number; lng: number };
  endLocation?: { lat: number; lng: number };
  optimizeFor: 'distance' | 'time';
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit';
}

export interface TSPOptimizationResult {
  optimizedCustomers: Customer[];
  optimizedPath: { lat: number; lng: number }[];
  estimatedDuration: number; // in minutes
  totalDistance: number; // in miles
  waypoints: google.maps.DirectionsWaypoint[];
}

declare global {
  interface Window {
    google: any;
  }
}

export class TSPOptimizationService {
  private apiKey: string;
  private directionsService: any;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Note: This service needs to be used in a browser context where Google Maps is loaded
    // For server-side usage, we would need a different approach
  }

  /**
   * Optimize route using Google's TSP optimization capabilities
   * Note: This is a client-side implementation that should be called from the frontend
   */
  async optimizeRoute(
    customers: Customer[],
    options: TSPOptimizationOptions
  ): Promise<TSPOptimizationResult> {
    if (customers.length === 0) {
      return {
        optimizedCustomers: [],
        optimizedPath: [],
        estimatedDuration: 0,
        totalDistance: 0,
        waypoints: [],
      };
    }

    // For small datasets (≤ 10 customers), use simple nearest neighbor algorithm
    if (customers.length <= 10) {
      return this.optimizeWithNearestNeighbor(customers, options);
    }

    // For larger datasets, try Google Maps Directions API with optimization
    // If that fails, fall back to nearest neighbor
    try {
      return await this.optimizeWithGoogleMaps(customers, options);
    } catch (error) {
      console.warn('Google Maps optimization failed, falling back to nearest neighbor:', error);
      return this.optimizeWithNearestNeighbor(customers, options);
    }
  }

  /**
   * Simple nearest neighbor algorithm for small datasets
   */
  private async optimizeWithNearestNeighbor(
    customers: Customer[],
    options: TSPOptimizationOptions
  ): Promise<TSPOptimizationResult> {
    const { startLocation } = options;

    // Start with the starting location
    let currentLocation = startLocation;
    const remainingCustomers = [...customers];
    const optimizedCustomers: Customer[] = [];
    const optimizedPath: { lat: number; lng: number }[] = [startLocation];

    // Calculate Haversine distance for nearest neighbor
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 3959; // Earth's radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let totalDistance = 0;
    let estimatedDuration = 0;

    // Find nearest neighbor until all customers are assigned
    while (remainingCustomers.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remainingCustomers.length; i++) {
        const distance = calculateDistance(
          currentLocation.lat,
          currentLocation.lng,
          remainingCustomers[i].lat,
          remainingCustomers[i].lng
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      const nearestCustomer = remainingCustomers[nearestIndex];
      optimizedCustomers.push(nearestCustomer);
      optimizedPath.push({ lat: nearestCustomer.lat, lng: nearestCustomer.lng });

      totalDistance += nearestDistance;
      estimatedDuration += 30; // 30 minutes per customer

      currentLocation = { lat: nearestCustomer.lat, lng: nearestCustomer.lng };
      remainingCustomers.splice(nearestIndex, 1);
    }

    // Add travel time back to start/end if specified
    if (options.endLocation) {
      const returnDistance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        options.endLocation.lat,
        options.endLocation.lng
      );
      totalDistance += returnDistance;
      estimatedDuration += returnDistance * 2; // Rough estimate: 2 minutes per mile
    }

    return {
      optimizedCustomers,
      optimizedPath,
      estimatedDuration,
      totalDistance,
      waypoints: [],
    };
  }

  /**
   * Use Google Maps Directions API for optimization
   * Note: This requires the Google Maps API to be loaded in the browser
   */
  private async optimizeWithGoogleMaps(
    customers: Customer[],
    options: TSPOptimizationOptions
  ): Promise<TSPOptimizationResult> {
    // Check if we're in a browser environment with Google Maps loaded
    if (typeof window === 'undefined') {
      throw new Error('Google Maps API not available in server environment. Falling back to nearest neighbor algorithm.');
    }

    if (!window.google || !window.google.maps) {
      throw new Error('Google Maps API not loaded. Falling back to nearest neighbor algorithm.');
    }

    return new Promise((resolve, reject) => {
      try {
        if (!this.directionsService) {
          this.directionsService = new window.google.maps.DirectionsService();
        }

        // Create waypoints for Google Maps (limit to 23 for Directions API)
        const waypoints = customers.slice(0, 23).map(customer => ({
          location: new window.google.maps.LatLng(customer.lat, customer.lng),
          stopover: true,
        }));

        // Set origin and destination
        const origin = new window.google.maps.LatLng(options.startLocation.lat, options.startLocation.lng);
        const destination = options.endLocation
          ? new window.google.maps.LatLng(options.endLocation.lat, options.endLocation.lng)
          : origin; // Return to start if no end location specified

        const request = {
          origin,
          destination,
          waypoints,
          optimizeWaypoints: true, // This enables TSP optimization
          travelMode: options.travelMode.toUpperCase() as google.maps.TravelMode,
          drivingOptions: {
            departureTime: new Date(), // Use current time for traffic data
            trafficModel: 'best_guess' as google.maps.TrafficModel,
          },
          unitSystem: window.google.maps.UnitSystem.IMPERIAL,
        };

        this.directionsService.route(request, (response: any, status: any) => {
          if (status === 'OK' && response && response.routes && response.routes.length > 0) {
            const route = response.routes[0];
            const optimizedWaypoints = route.waypoint_order || [];

            // Reorder customers based on optimized waypoint order
            const optimizedCustomers = optimizedWaypoints.map((index: number) => customers[index]);
            const optimizedPath = route.overview_path.map((point: any) => ({
              lat: point.lat(),
              lng: point.lng(),
            }));

            const totalDistance = route.legs.reduce((total: number, leg: any) => {
              return total + (leg.distance?.value || 0);
            }, 0) / 1609.34; // Convert meters to miles

            const estimatedDuration = route.legs.reduce((total: number, leg: any) => {
              return total + (leg.duration?.value || 0);
            }, 0) / 60; // Convert seconds to minutes

            resolve({
              optimizedCustomers,
              optimizedPath,
              estimatedDuration,
              totalDistance,
              waypoints,
            });
          } else {
            const errorMsg = status === 'OK' ? 'No routes found' : `Google Maps API error: ${status}`;
            reject(new Error(errorMsg));
          }
        });
      } catch (error) {
        reject(new Error(`Error initializing Google Maps Directions API: ${error}`));
      }
    });
  }
}

/**
 * Factory function to get TSP optimization service instance
 */
export const getTSPOptimizationService = (apiKey: string): TSPOptimizationService => {
  return new TSPOptimizationService(apiKey);
};