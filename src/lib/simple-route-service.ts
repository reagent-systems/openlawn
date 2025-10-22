import { Timestamp } from 'firebase/firestore';
import type { Customer, User, DayOfWeek } from './firebase-types';
import { getCustomers } from './customer-service';
import { getUsers } from './user-service';
import { getTSPOptimizationService } from './tsp-optimization-service';

// Route cache for daily routes
const routeCache = new Map<string, any>();

export interface SimpleRoute {
  crewId: string;
  crewName: string;
  date: Date;
  customers: Customer[];
  estimatedDuration: number; // minutes
  totalDistance: number; // miles
  crewMembers: User[];
}

export interface CustomerNeed {
  customer: Customer;
  priority: number;
  daysSinceLastService: number;
  serviceType: string;
}

// Get customers that need service in the next 48 hours
export const getCustomersNeedingService = async (): Promise<CustomerNeed[]> => {
  const customers = await getCustomers();
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  return customers
    .filter(customer => customer.status === 'active')
    .map(customer => {
      // Calculate days since last service
      const lastService = customer.lastServiceDate?.toDate() || new Date(0);
      const daysSinceLastService = Math.floor((now.getTime() - lastService.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine service type from customer's services
      const serviceType = customer.services[0]?.type || 'push-mow';
      
      // Calculate priority based on frequency and days since last service
      const frequency = customer.servicePreferences?.serviceFrequency || 7;
      const priority = Math.max(0, daysSinceLastService - frequency + 1) * 10;
      
      return {
        customer,
        priority: Math.min(100, priority),
        daysSinceLastService,
        serviceType
      };
    })
    .filter(need => need.priority > 0) // Only customers who need service
    .sort((a, b) => b.priority - a.priority); // Highest priority first
};

// Get available crews for today and tomorrow
export const getAvailableCrewsForNext48Hours = async (): Promise<Map<string, User[]>> => {
  const users = await getUsers();
  const crews = new Map<string, User[]>();
  
  // Group users by crewId
  users.forEach(user => {
    if (user.crewId && user.status === 'available') {
      if (!crews.has(user.crewId)) {
        crews.set(user.crewId, []);
      }
      crews.get(user.crewId)!.push(user);
    }
  });
  
  // Filter crews that have at least 2 members (manager + employee)
  const validCrews = new Map<string, User[]>();
  crews.forEach((members, crewId) => {
    if (members.length >= 2) {
      validCrews.set(crewId, members);
    }
  });
  
  return validCrews;
};

// Match customers to crews based on service types
export const matchCustomersToCrews = (
  customersNeedingService: CustomerNeed[],
  crews: Map<string, User[]>
): Map<string, CustomerNeed[]> => {
  const crewAssignments = new Map<string, CustomerNeed[]>();
  
  // Initialize crew assignments
  crews.forEach((members, crewId) => {
    crewAssignments.set(crewId, []);
  });
  
  // Assign customers to crews based on service type compatibility
  customersNeedingService.forEach(customerNeed => {
    let bestCrewId: string | null = null;
    let bestCrewMembers: User[] | null = null;
    
    // Find crew that can handle this service type
    crews.forEach((members, crewId) => {
      const manager = members.find(m => m.role === 'manager');
      if (manager?.crewServiceTypes?.includes(customerNeed.serviceType)) {
        // Prefer crews with fewer assigned customers
        const currentAssignments = crewAssignments.get(crewId)?.length || 0;
        const bestCurrentAssignments = bestCrewMembers ? (crewAssignments.get(bestCrewId!)?.length || 0) : Infinity;
        
        if (currentAssignments < bestCurrentAssignments) {
          bestCrewId = crewId;
          bestCrewMembers = members;
        }
      }
    });
    
    // Assign to best crew if found
    if (bestCrewId && bestCrewMembers) {
      const assignments = crewAssignments.get(bestCrewId)!;
      assignments.push(customerNeed);
    }
  });
  
  return crewAssignments;
};

// Calculate distance between two points (Haversine formula)
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

// Route optimization using TSP service
const optimizeRoute = async (customers: Customer[]): Promise<{ customers: Customer[]; totalDistance: number }> => {
  if (customers.length <= 1) {
    return { customers, totalDistance: 0 };
  }

  try {
    // Use TSP optimization service
    const tspService = getTSPOptimizationService(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');

    // Use first customer as starting point
    const startLocation = { lat: customers[0].lat, lng: customers[0].lng };

    const optimizationResult = await tspService.optimizeRoute(customers, {
      startLocation,
      optimizeFor: 'distance',
      travelMode: 'driving',
    });

    return {
      customers: optimizationResult.optimizedCustomers,
      totalDistance: optimizationResult.totalDistance,
    };
  } catch (error) {
    console.error('TSP optimization failed in simple route service, falling back to nearest neighbor:', error);

    // Fallback to simple nearest neighbor algorithm
    const optimizedCustomers: Customer[] = [];
    const unvisited = [...customers];

    // Start with first customer
    let current = unvisited.shift()!;
    optimizedCustomers.push(current);

    // Find nearest neighbor for each remaining customer
    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const distance = calculateDistance(
          current.lat, current.lng,
          unvisited[i].lat, unvisited[i].lng
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      current = unvisited.splice(nearestIndex, 1)[0];
      optimizedCustomers.push(current);
    }

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < optimizedCustomers.length; i++) {
      totalDistance += calculateDistance(
        optimizedCustomers[i - 1].lat, optimizedCustomers[i - 1].lng,
        optimizedCustomers[i].lat, optimizedCustomers[i].lng
      );
    }

    return { customers: optimizedCustomers, totalDistance };
  }
};

// Generate routes for the next 48 hours
export const generateRoutesForNext48Hours = async (): Promise<SimpleRoute[]> => {
  // Get customers needing service
  const customersNeedingService = await getCustomersNeedingService();
  
  // Get available crews
  const crews = await getAvailableCrewsForNext48Hours();
  
  if (crews.size === 0 || customersNeedingService.length === 0) {
    return [];
  }
  
  // Match customers to crews
  const crewAssignments = matchCustomersToCrews(customersNeedingService, crews);
  
  // Generate routes for each crew
  const routes: SimpleRoute[] = [];
  const today = new Date();

  for (const [crewId, customerNeeds] of crewAssignments.entries()) {
    if (customerNeeds.length === 0) continue;

    // Limit to 12 customers per crew per day
    const limitedCustomers = customerNeeds.slice(0, 12).map(need => need.customer);

    // Optimize route
    const { customers: optimizedCustomers, totalDistance } = await optimizeRoute(limitedCustomers);

    // Calculate estimated duration (30 minutes per customer + travel time)
    const estimatedDuration = optimizedCustomers.length * 30 + Math.ceil(totalDistance * 5); // 5 min per mile

    // Get crew members
    const crewMembers = crews.get(crewId)!;
    const crewName = crewId; // Use crew ID as name for now

    routes.push({
      crewId,
      crewName,
      date: today,
      customers: optimizedCustomers,
      estimatedDuration,
      totalDistance,
      crewMembers
    });
  }
  
  return routes;
};

// Get cached route or generate new one
export const getRouteForCrew = async (crewId: string): Promise<SimpleRoute | null> => {
  const cacheKey = `${crewId}-${new Date().toISOString().split('T')[0]}`;
  
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }
  
  const routes = await generateRoutesForNext48Hours();
  const crewRoute = routes.find(route => route.crewId === crewId);
  
  if (crewRoute) {
    routeCache.set(cacheKey, crewRoute);
    return crewRoute;
  }
  
  return null;
};

// Clear route cache
export const clearRouteCache = (): void => {
  routeCache.clear();
};

// Mark customer as visited (update lastServiceDate)
export const markCustomerAsVisited = async (customerId: string): Promise<void> => {
  const { updateDocument } = await import('./firebase-services');
  
  await updateDocument('customers', customerId, {
    lastServiceDate: new Date() as any,
  });
  
  // Clear cache to regenerate routes
  clearRouteCache();
}; 