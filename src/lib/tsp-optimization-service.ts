import type { Customer } from './firebase-types';

/**
 * Travelling Salesman Problem (TSP) Solver
 *
 * Uses Google Distance Matrix API + TSP algorithm to find optimal customer order.
 * This properly solves the TSP for maximum efficiency.
 *
 * Required APIs:
 * - Google Distance Matrix API (maps.googleapis.com/maps/api/distancematrix)
 * - Google Routes API (routes.googleapis.com) - for final routing
 *
 * Enable in Google Cloud Console:
 * - Distance Matrix API
 * - Routes API
 */

export interface OptimizedRoute {
  optimizedCustomers: Customer[];
  totalDistance: number; // in miles
  estimatedDuration: number; // in minutes
  optimizedPath: { lat: number; lng: number }[];
}

export interface RouteOptimizationOptions {
  apiKey: string;
  startLocation?: { lat: number; lng: number };
  endLocation?: { lat: number; lng: number };
  optimizeFor: 'distance' | 'duration';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: Date;
}

class TSPOptimizationService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Solve the Travelling Salesman Problem using Distance Matrix API + TSP algorithm
   * This properly optimizes the customer order for maximum efficiency
   */
  async optimizeRoute(
    customers: Customer[],
    options: RouteOptimizationOptions
  ): Promise<OptimizedRoute> {
    if (customers.length < 2) {
      return {
        optimizedCustomers: customers,
        totalDistance: 0,
        estimatedDuration: 0,
        optimizedPath: customers.map(c => ({ lat: c.lat, lng: c.lng }))
      };
    }

    try {
      console.log('🚀 Solving TSP with', customers.length, 'customers');
      console.log('📋 Original customer order:', customers.map(c => c.name));

      // Step 1: Get distance matrix using Google Distance Matrix API
      const distanceMatrix = await this.getDistanceMatrix(customers, options);

      // Step 2: Solve TSP to find optimal path
      const optimizedOrder = this.solveTSP(distanceMatrix, customers.length);
      console.log('📋 TSP optimized order indices:', optimizedOrder);

      // TEMP: Check if optimization actually changed the order
      const originalOrder = Array.from({length: customers.length}, (_, i) => i);
      if (JSON.stringify(optimizedOrder) === JSON.stringify(originalOrder)) {
        console.warn('⚠️ WARNING: TSP optimization returned the same order as original!');
      }

      // Step 3: Apply optimized order to customers
      const optimizedCustomers = optimizedOrder.map(index => customers[index]);

      // Step 4: Calculate total distance of optimized route
      const totalDistance = this.calculateRouteDistance(distanceMatrix, optimizedOrder);

      console.log(`✅ TSP solved: ${customers.length} customers optimized, distance: ${totalDistance.toFixed(1)} miles`);

      return {
        optimizedCustomers,
        totalDistance,
        estimatedDuration: optimizedCustomers.length * 30, // 30 minutes per customer
        optimizedPath: optimizedCustomers.map(c => ({ lat: c.lat, lng: c.lng }))
      };

    } catch (error) {
      console.error('❌ TSP optimization failed:', error);
      console.log('📋 Using fallback optimization - customer order will remain unchanged');

      // Fallback to enhanced local optimization
      return this.fallbackOptimization(customers, options);
    }
  }

  /**
   * Get distance matrix using Google Distance Matrix API
   */
  private async getDistanceMatrix(
    customers: Customer[],
    options: RouteOptimizationOptions
  ): Promise<number[][]> {
    const endpoint = `https://maps.googleapis.com/maps/api/distancematrix/json`;

    // Prepare origins and destinations (all customer locations)
    const locations = customers.map(customer => `${customer.lat},${customer.lng}`);

    // Build request parameters
    const params = new URLSearchParams({
      origins: locations.join('|'),
      destinations: locations.join('|'),
      mode: 'driving',
      units: 'imperial',
      key: this.apiKey
    });

    if (options.avoidTolls) params.append('avoidTolls', 'true');
    if (options.avoidHighways) params.append('avoidHighways', 'true');

    const response = await fetch(`${endpoint}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Distance Matrix API request:', `${endpoint}?${params.toString()}`);
    console.log('🔑 Using API key:', this.apiKey.substring(0, 10) + '...');

    if (!response.ok) {
      console.error('❌ Distance Matrix API HTTP error:', response.status, response.statusText);
      throw new Error(`Distance Matrix API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('❌ Distance Matrix API failed:', data);
      throw new Error(`Distance Matrix API error: ${data.error_message || data.status}`);
    }

    console.log('📊 Distance Matrix API response:', {
      status: data.status,
      rows: data.rows.length,
      sampleDistances: data.rows[0]?.elements?.slice(0, 3).map((el: any) => ({
        status: el.status,
        distance: el.distance?.text,
        value: el.distance?.value
      }))
    });

    // Extract distance matrix from response
    const distanceMatrix: number[][] = [];
    for (let i = 0; i < data.rows.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < data.rows[i].elements.length; j++) {
        const element = data.rows[i].elements[j];
        if (element.status === 'OK') {
          row.push(element.distance.value / 1609.34); // Convert meters to miles
        } else {
          // If no route found, use a large penalty value
          console.warn(`⚠️ No route from ${i} to ${j}: ${element.status}`);
          row.push(1000); // 1000 miles penalty
        }
      }
      distanceMatrix.push(row);
    }

    console.log('📊 Distance matrix calculated:', distanceMatrix.length, 'x', distanceMatrix[0]?.length);
    console.log('📊 Sample distances:', distanceMatrix.slice(0, 2).map(row => row.slice(0, 2)));
    return distanceMatrix;
  }

  /**
   * Solve the Travelling Salesman Problem using dynamic programming
   * This finds the optimal order to visit all customers and return to start
   *
   * For each route, this creates a complete round trip:
   * Start → Customer1 → Customer2 → ... → CustomerN → Start
   */
  private solveTSP(distanceMatrix: number[][], numCities: number): number[] {
    const n = numCities;

    // TSP with dynamic programming (held-karp algorithm)
    // For small instances (n <= 20), we can use DP
    // For larger instances, we would need approximation algorithms

    if (n > 15) {
      console.warn('⚠️ Large TSP instance, using approximation algorithm');
      return this.approximateTSP(distanceMatrix, n);
    }

    // Dynamic Programming approach for exact solution
    const dpSize = 1 << n; // 2^n subsets
    const dp: number[][] = Array(dpSize).fill(null).map(() => Array(n).fill(Infinity));
    const path: number[][] = Array(dpSize).fill(null).map(() => Array(n).fill(-1));

    // Start from city 0 (1467 Creeks Edge Ct)
    dp[1][0] = 0; // Subset {0}, ending at city 0

    // Iterate through all subsets
    for (let mask = 1; mask < dpSize; mask++) {
      for (let u = 0; u < n; u++) {
        if (!(mask & (1 << u))) continue; // City u not in subset

        for (let v = 0; v < n; v++) {
          if (mask & (1 << v)) continue; // City v already in subset

          const newMask = mask | (1 << v);
          const newDistance = dp[mask][u] + distanceMatrix[u][v];

          if (newDistance < dp[newMask][v]) {
            dp[newMask][v] = newDistance;
            path[newMask][v] = u;
          }
        }
      }
    }

    // Find the minimum distance tour that returns to start
    let minDistance = Infinity;
    let endCity = -1;

    for (let i = 1; i < n; i++) {
      const distance = dp[dpSize - 1][i] + distanceMatrix[i][0]; // Return to start
      if (distance < minDistance) {
        minDistance = distance;
        endCity = i;
      }
    }

    console.log(`🔍 TSP DP result: minDistance=${minDistance}, endCity=${endCity}`);

    // Reconstruct the path: Start → Customer1 → Customer2 → ... → Start
    const tour: number[] = [];
    let currentMask = dpSize - 1;
    let currentCity = endCity;

    console.log(`🔍 Reconstructing path: endCity=${endCity}, dpSize=${dpSize}`);
    while (currentCity !== -1) {
      tour.unshift(currentCity);
      const prevCity = path[currentMask][currentCity];
      console.log(`📋 Path step: currentCity=${currentCity}, prevCity=${prevCity}, currentMask=${currentMask.toString(2)}`);
      currentMask ^= (1 << currentCity);
      currentCity = prevCity;
    }

    console.log(`🎯 TSP round-trip solution: ${minDistance.toFixed(2)} miles total (start/end at 1467 Creeks Edge Ct)`);
    console.log(`📋 Optimized tour order: [${tour.join(' → ')}]`);
    return tour;
  }

  /**
   * Approximate TSP solution for larger instances
   */
  private approximateTSP(distanceMatrix: number[][], n: number): number[] {
    // Use a greedy approach with 2-opt improvement
    const tour = this.greedyTSP(distanceMatrix, n);

    // Apply 2-opt local search for improvement
    return this.twoOpt(tour, distanceMatrix);
  }

  /**
   * Greedy TSP starting from city 0
   */
  private greedyTSP(distanceMatrix: number[][], n: number): number[] {
    const visited = new Array(n).fill(false);
    const tour: number[] = [0];
    visited[0] = true;

    for (let i = 1; i < n; i++) {
      let bestCity = -1;
      let bestDistance = Infinity;

      for (let j = 0; j < n; j++) {
        if (!visited[j] && distanceMatrix[tour[i-1]][j] < bestDistance) {
          bestDistance = distanceMatrix[tour[i-1]][j];
          bestCity = j;
        }
      }

      if (bestCity !== -1) {
        tour.push(bestCity);
        visited[bestCity] = true;
      }
    }

    return tour;
  }

  /**
   * 2-opt local search for TSP improvement
   */
  private twoOpt(tour: number[], distanceMatrix: number[][]): number[] {
    const n = tour.length;
    let improved = true;

    while (improved) {
      improved = false;

      for (let i = 1; i < n - 2; i++) {
        for (let j = i + 1; j < n - 1; j++) {
          // Calculate current distance
          const currentDist = distanceMatrix[tour[i-1]][tour[i]] +
                             distanceMatrix[tour[j]][tour[j+1]];

          // Calculate swapped distance
          const swappedDist = distanceMatrix[tour[i-1]][tour[j]] +
                             distanceMatrix[tour[i]][tour[j+1]];

          if (swappedDist < currentDist) {
            // Perform 2-opt swap
            const temp = tour[i];
            tour[i] = tour[j];
            tour[j] = temp;
            improved = true;
          }
        }
      }
    }

    return tour;
  }

  /**
   * Calculate total distance of a route given the order
   */
  private calculateRouteDistance(distanceMatrix: number[][], order: number[]): number {
    let totalDistance = 0;
    for (let i = 0; i < order.length - 1; i++) {
      totalDistance += distanceMatrix[order[i]][order[i + 1]];
    }
    // Add return to start
    totalDistance += distanceMatrix[order[order.length - 1]][order[0]];
    return totalDistance;
  }

  /**
   * Fallback optimization when Google API fails
   */
  private fallbackOptimization(
    customers: Customer[],
    options: RouteOptimizationOptions
  ): Promise<OptimizedRoute> {
    console.log('⚠️ Using fallback TSP approximation');

    // Simple greedy TSP approximation
    const optimizedCustomers = this.approximateGreedyTSP(customers, options);

    console.log('📋 Fallback optimized customer order:', optimizedCustomers.map(c => c.name));

    return Promise.resolve({
      optimizedCustomers,
      totalDistance: 0, // We don't have exact distances without API
      estimatedDuration: optimizedCustomers.length * 30,
      optimizedPath: optimizedCustomers.map(c => ({ lat: c.lat, lng: c.lng }))
    });
  }

  /**
   * Simple greedy TSP approximation for fallback
   */
  private approximateGreedyTSP(customers: Customer[], options: RouteOptimizationOptions): Customer[] {
    if (customers.length <= 2) return customers;

    const optimizedCustomers: Customer[] = [];
    const unvisited = [...customers];

    // Start with customer closest to start location
    let currentIndex = 0;
    let minDistance = Infinity;

    if (options.startLocation) {
      for (let i = 0; i < customers.length; i++) {
        const distance = this.calculateDistance(
          options.startLocation.lat, options.startLocation.lng,
          customers[i].lat, customers[i].lng
        );
        if (distance < minDistance) {
          minDistance = distance;
          currentIndex = i;
        }
      }
    }

    const current = unvisited.splice(currentIndex, 1)[0];
    optimizedCustomers.push(current);

    // Build route using nearest neighbor
    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.calculateDistance(
          current.lat, current.lng,
          unvisited[i].lat, unvisited[i].lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      const next = unvisited.splice(nearestIndex, 1)[0];
      optimizedCustomers.push(next);
    }

    console.log(`✅ Fallback TSP: ${customers.length} customers optimized`);
    return optimizedCustomers;
  }

  /**
   * Haversine formula for distance calculation (fallback)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

// Export singleton instance
let tspService: TSPOptimizationService | null = null;

export const getTSPOptimizationService = (apiKey?: string): TSPOptimizationService => {
  if (!tspService || (apiKey && tspService['apiKey'] !== apiKey)) {
    if (!apiKey) {
      throw new Error('Google Maps API key is required for TSP optimization');
    }
    tspService = new TSPOptimizationService(apiKey);
  }
  return tspService;
};

// Export the service class for direct usage
export { TSPOptimizationService };
