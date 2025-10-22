import { Timestamp } from 'firebase/firestore';
import type {
  Customer,
  CustomerPriority,
  CrewAvailability,
  DailyRoute,
  User,
  DayOfWeek
} from './firebase-types';
import { calculateCustomerPriorities, getCustomersNeedingService, getCustomers } from './customer-service';
import { getUsers, getUsersByRole } from './user-service';
import { getTSPOptimizationService } from './tsp-optimization-service';

// Route cache for daily routes
const routeCache = new Map<string, DailyRoute>();

// Get available crews for a specific date within a company
export const getAvailableCrews = async (companyId: string, date: Date): Promise<CrewAvailability[]> => {
  const users = await getUsers(companyId);
  const dayOfWeek = getDayOfWeek(date);
  console.log(`getAvailableCrews - Checking availability for ${dayOfWeek}:`, users.length, 'total users');
  
  // Group users by crewId to create crews
  const crewMap = new Map<string, {
    crewId: string;
    crewServiceTypes: string[];
    employees: User[];
    manager?: User;
  }>();
  
  // Process all users with crew assignments
  users.forEach(user => {
    // Check if user is available based on their schedule for the given date
    const daySchedule = user.schedule?.[dayOfWeek];
    
    // Consider user available if they have a schedule for this day with valid start/end times
    const isAvailable = daySchedule && daySchedule.start && daySchedule.end;
    
    console.log(`User ${user.name} (${user.crewId}) - Schedule for ${dayOfWeek}:`, daySchedule, 'Available:', isAvailable);
    
    if (user.crewId && isAvailable) {
      if (!crewMap.has(user.crewId)) {
        crewMap.set(user.crewId, {
          crewId: user.crewId,
          crewServiceTypes: user.crewServiceTypes || ['general'],
          employees: [],
          manager: undefined
        });
      }
      
      const crew = crewMap.get(user.crewId)!;
      // Just add all users to the employees array regardless of role
      crew.employees.push(user);
    }
  });
  
  // Convert to CrewAvailability format
  const availableCrews = Array.from(crewMap.values())
    .filter(crew => crew.employees.length > 0) // Only crews with at least one available user
    .map(crew => {
      // Use the first available user as the effective manager for routing purposes
      const effectiveManager = crew.employees[0];
      
      return {
        crewId: crew.crewId,
        managerId: effectiveManager.id,
        employeeIds: crew.employees.map(emp => emp.id),
        availability: {
          date,
          startTime: effectiveManager.schedule?.[getDayOfWeek(date)]?.start || '08:00',
          endTime: effectiveManager.schedule?.[getDayOfWeek(date)]?.end || '17:00',
          maxCustomers: 12 as const,
          currentLocation: effectiveManager.currentLocation ? {
            lat: effectiveManager.currentLocation.lat,
            lng: effectiveManager.currentLocation.lng
          } : undefined,
        },
        capabilities: crew.crewServiceTypes, // Crew can handle multiple service types
        region: effectiveManager.region || 'default',
      };
    });
    
  console.log(`Found ${availableCrews.length} available crews for ${dayOfWeek}:`, availableCrews.map(c => ({ crewId: c.crewId, capabilities: c.capabilities, employeeCount: c.employeeIds.length })));
  return availableCrews;
};

// Get day of week as string
const getDayOfWeek = (date: Date): DayOfWeek => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as DayOfWeek;
};

// Geographic clustering by zip code
export const clusterByZipCode = (customers: CustomerPriority[]): Map<string, CustomerPriority[]> => {
  const clusters = new Map<string, CustomerPriority[]>();
  
  customers.forEach(customer => {
    const zipCode = customer.factors.location.zipCode;
    if (!clusters.has(zipCode)) {
      clusters.set(zipCode, []);
    }
    clusters.get(zipCode)!.push(customer);
  });
  
  return clusters;
};

// Assign clusters to crews based on region
export const assignClustersToCrews = (
  clusters: Map<string, CustomerPriority[]>,
  crews: CrewAvailability[]
): Array<{ crew: CrewAvailability; customers: CustomerPriority[] }> => {
  const assignments: Array<{ crew: CrewAvailability; customers: CustomerPriority[] }> = [];
  
  // Group all customers by crew (one route per crew)
  const crewCustomers = new Map<string, CustomerPriority[]>();
  
  clusters.forEach((customers, zipCode) => {
    // Find crew in same region or assign to first available crew
    const matchingCrew = crews.find(crew => crew.region === zipCode) || crews[0];
    
    if (matchingCrew) {
      if (!crewCustomers.has(matchingCrew.crewId)) {
        crewCustomers.set(matchingCrew.crewId, []);
      }
      
      // Add customers to this crew's list
      crewCustomers.get(matchingCrew.crewId)!.push(...customers);
    }
  });
  
  // Create one assignment per crew with all their customers
  crews.forEach(crew => {
    const customers = crewCustomers.get(crew.crewId);
    if (customers && customers.length > 0) {
      assignments.push({
        crew,
        customers: customers.sort((a, b) => b.priority - a.priority)
      });
    }
  });
  
  return assignments;
};

// Optimize route for a crew using TSP optimization
export const optimizeRouteForCrew = async (
  companyId: string,
  crew: CrewAvailability,
  customers: CustomerPriority[],
  date: Date
): Promise<DailyRoute> => {
  // Get all customers to match with priorities
  const allCustomers = await getCustomers(companyId);

  // Filter customers by crew service types and get full customer data
  const compatibleCustomers = customers
    .map(customerPriority => {
      const customer = allCustomers.find(c => c.id === customerPriority.customerId);
      if (!customer) return null;

      // Check if customer's service type matches crew's capabilities
      const hasCompatibleService = customer.services.some(service =>
        crew.capabilities.includes(service.type)
      );

      return hasCompatibleService ? customer : null;
    })
    .filter(Boolean) as Customer[];

  // Sort by priority (keep high priority customers first)
  const sortedCustomers = compatibleCustomers.sort((a, b) => {
    const aPriority = customers.find(c => c.customerId === a.id)?.priority || 0;
    const bPriority = customers.find(c => c.customerId === b.id)?.priority || 0;
    return bPriority - aPriority;
  });

  // Limit to max customers per crew
  const limitedCustomers = sortedCustomers.slice(0, crew.availability.maxCustomers);

  if (limitedCustomers.length === 0) {
    return {
      companyId, // REQUIRED: Multi-tenant isolation
      crewId: crew.crewId,
      date,
      customers: [],
      optimizedPath: [],
      estimatedDuration: 0,
      totalDistance: 0,
    };
  }

  // Use TSP optimization service
  const tspService = getTSPOptimizationService(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');

  try {
    // Determine start location - prioritize company base location
    let startLocation = { lat: 30.0997, lng: -81.7065 }; // Default fallback

    // Try to get company's base location
    const { getCompany } = await import('./company-service');
    const company = await getCompany(companyId);
    if (company?.baseLocation) {
      startLocation = { lat: company.baseLocation.lat, lng: company.baseLocation.lng };
      console.log('Using company base location:', startLocation);
    } else if (crew.availability.currentLocation) {
      startLocation = crew.availability.currentLocation;
      console.log('Using crew current location:', startLocation);
    } else {
      console.log('Using default start location:', startLocation);
    }

    const optimizationResult = await tspService.optimizeRoute(limitedCustomers, {
      startLocation,
      endLocation: startLocation, // Crews return to the same base location
      optimizeFor: 'distance',
      travelMode: 'driving',
    });

    return {
      companyId, // REQUIRED: Multi-tenant isolation
      crewId: crew.crewId,
      date,
      customers: optimizationResult.optimizedCustomers,
      optimizedPath: optimizationResult.optimizedPath,
      estimatedDuration: optimizationResult.estimatedDuration,
      totalDistance: optimizationResult.totalDistance,
    };
  } catch (error) {
    console.error('TSP optimization failed in optimizeRouteForCrew, falling back to simple order:', error);

    // Fallback to simple order (preserving priority sorting)
    const optimizedPath = limitedCustomers.map(customer => ({
      lat: customer.lat,
      lng: customer.lng
    }));

    return {
      companyId, // REQUIRED: Multi-tenant isolation
      crewId: crew.crewId,
      date,
      customers: limitedCustomers,
      optimizedPath,
      estimatedDuration: limitedCustomers.length * 30,
      totalDistance: 0,
    };
  }
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

// Generate simple routes for a specific date based on your intended system
export const generateOptimalRoutes = async (companyId: string, date: Date): Promise<DailyRoute[]> => {
  console.log('generateOptimalRoutes called for companyId:', companyId, 'date:', date);

  // Step 1: Get available crews (employees with schedules for this day)
  const availableCrews = await getAvailableCrews(companyId, date);
  console.log('Available crews:', availableCrews.length);

  if (availableCrews.length === 0) {
    console.log('No available crews, returning empty array');
    return [];
  }

  // Step 2: Get all customers who want service on this day
  const allCustomers = await getCustomers(companyId);
  const dayOfWeek = getDayOfWeek(date);
  
  const customersWantingService = allCustomers.filter(customer => {
    // Check if customer wants service on this day
    const wantsServiceToday = customer.servicePreferences?.preferredDays?.includes(dayOfWeek) || false;
    
    // Check if customer needs service (not serviced in last 5 days)
    const lastService = customer.lastServiceDate?.toDate();
    const fiveDaysAgo = new Date(date);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const needsService = !lastService || lastService < fiveDaysAgo;
    
    return customer.status === 'active' && wantsServiceToday && needsService;
  });
  
  console.log(`Customers wanting service on ${dayOfWeek}:`, customersWantingService.length);
  
  // Step 3: Simple assignment - assign customers to crews based on service type compatibility
  const routes: DailyRoute[] = [];
  
  for (const crew of availableCrews) {
    // Find customers this crew can service
    const compatibleCustomers = customersWantingService.filter(customer => {
      // Check if any of the customer's services match the crew's capabilities
      return customer.services.some(service => 
        crew.capabilities.includes(service.type)
      );
    });
    
    console.log(`Crew ${crew.crewId} can service ${compatibleCustomers.length} customers`);
    console.log(`Crew ${crew.crewId} capabilities:`, crew.capabilities);
    console.log(`Crew ${crew.crewId} compatible customers:`, compatibleCustomers.map(c => ({ name: c.name, services: c.services.map(s => s.type) })));
    
    if (compatibleCustomers.length > 0) {
      // Limit to 12 customers max per crew
      const assignedCustomers = compatibleCustomers.slice(0, 12);

      // Get TSP optimization service
      const tspService = getTSPOptimizationService(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');

      try {
        // Determine start location (use crew's current location or a default)
        const startLocation = crew.availability.currentLocation || { lat: 30.0997, lng: -81.7065 }; // Default to Jacksonville, FL area

        console.log(`Optimizing route for crew ${crew.crewId} with ${assignedCustomers.length} customers`);

        // Use TSP optimization to get optimal order
        const optimizationResult = await tspService.optimizeRoute(assignedCustomers, {
          startLocation,
          optimizeFor: 'distance',
          travelMode: 'driving',
        });

        const route: DailyRoute = {
          companyId, // REQUIRED: Multi-tenant isolation
          crewId: crew.crewId,
          date,
          customers: optimizationResult.optimizedCustomers, // ← OPTIMIZED order!
          optimizedPath: optimizationResult.optimizedPath,
          estimatedDuration: optimizationResult.estimatedDuration,
          totalDistance: optimizationResult.totalDistance,
        };

        console.log(`Created optimized route for crew ${crew.crewId} with ${assignedCustomers.length} customers`);
        console.log(`Route optimization: ${optimizationResult.totalDistance.toFixed(2)} miles, ${optimizationResult.estimatedDuration.toFixed(0)} minutes`);
        routes.push(route);
      } catch (error) {
        console.error(`TSP optimization failed for crew ${crew.crewId}, falling back to original order:`, error);

        // Fallback to original order if TSP fails
        const route: DailyRoute = {
          companyId, // REQUIRED: Multi-tenant isolation
          crewId: crew.crewId,
          date,
          customers: assignedCustomers,
          optimizedPath: assignedCustomers.map(c => ({ lat: c.lat, lng: c.lng })),
          estimatedDuration: assignedCustomers.length * 30, // 30 minutes per customer
          totalDistance: 0,
        };

        routes.push(route);
      }
    } else {
      console.log(`No compatible customers found for crew ${crew.crewId}`);
    }
  }
  
  console.log('Generated routes:', routes.length);
  return routes;
};

// Get cached route for a crew on a specific date within a company
export const getCachedRoute = async (companyId: string, crewId: string, date: Date): Promise<DailyRoute | null> => {
  const cacheKey = `${companyId}-${crewId}-${date.toISOString().split('T')[0]}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // Generate new route
  const routes = await generateOptimalRoutes(companyId, date);
  const crewRoute = routes.find(route => route.crewId === crewId);

  if (crewRoute) {
    routeCache.set(cacheKey, crewRoute);
    return crewRoute;
  }

  return null;
};

// Clear route cache (useful for testing or when routes need to be regenerated)
export const clearRouteCache = (): void => {
  routeCache.clear();
};

// Update route for traffic changes
export const updateRouteForTraffic = async (
  companyId: string,
  crewId: string,
  currentLocation: { lat: number; lng: number }
): Promise<DailyRoute | null> => {
  const today = new Date();
  const existingRoute = await getCachedRoute(companyId, crewId, today);

  if (!existingRoute) {
    return null;
  }

  // Re-optimize route with current location
  const remainingCustomers = existingRoute.customers.filter(customer =>
    !customer.services.some(service => service.status === 'completed')
  );

  if (remainingCustomers.length === 0) {
    return existingRoute;
  }

  // Create new crew availability with current location
  const crew: CrewAvailability = {
    crewId: existingRoute.crewId,
    managerId: '', // Will be filled by the optimization function
    employeeIds: [],
    availability: {
      date: today,
      startTime: '08:00',
      endTime: '17:00',
      maxCustomers: 12 as const,
      currentLocation,
    },
    capabilities: ['general'],
    region: 'default',
  };

  // Re-optimize route
  const customerPriorities = remainingCustomers.map(customer => ({
    customerId: customer.id,
    priority: 100, // High priority for remaining customers
    factors: {
      daysSinceLastService: 0,
      customerPreferences: customer.servicePreferences,
      serviceType: customer.services[0]?.type || 'general',
      location: { lat: customer.lat, lng: customer.lng, zipCode: '' },
    },
  }));

  const updatedRoute = await optimizeRouteForCrew(companyId, crew, customerPriorities, today);

  // Update cache
  const cacheKey = `${companyId}-${crewId}-${today.toISOString().split('T')[0]}`;
  routeCache.set(cacheKey, updatedRoute);

  return updatedRoute;
};

// Get all routes for a specific date within a company
export const getAllRoutesForDate = async (companyId: string, date: Date): Promise<DailyRoute[]> => {
  const routes = await generateOptimalRoutes(companyId, date);

  // Cache all routes
  routes.forEach(route => {
    const cacheKey = `${companyId}-${route.crewId}-${date.toISOString().split('T')[0]}`;
    routeCache.set(cacheKey, route);
  });

  return routes;
}; 

// Get customers assigned to a specific employee for today and tomorrow
export const getEmployeeAssignedCustomers = async (companyId: string, employeeId: string): Promise<Customer[]> => {
  console.log('getEmployeeAssignedCustomers called for companyId:', companyId, 'employeeId:', employeeId);

  const users = await getUsers(companyId);
  const employee = users.find(user => user.id === employeeId);

  console.log('Employee found:', employee);
  console.log('Employee crewId:', employee?.crewId);

  // Get all customers
  const allCustomers = await getCustomers(companyId);
  console.log('All customers:', allCustomers.length);

  const assignedCustomerIds = new Set<string>();

  // ALWAYS include customers created by this employee
  const customersCreatedByEmployee = allCustomers.filter(customer => customer.createdBy === employeeId);
  customersCreatedByEmployee.forEach(customer => {
    assignedCustomerIds.add(customer.id);
  });
  console.log('Customers created by employee:', customersCreatedByEmployee.length);

  // Also include customers from crew routes (if employee has a crew)
  if (employee?.crewId) {
    // Get routes for today and tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Generating routes for today and tomorrow...');
    const todayRoutes = await generateOptimalRoutes(companyId, today);
    const tomorrowRoutes = await generateOptimalRoutes(companyId, tomorrow);

    console.log('Today routes:', todayRoutes.length);
    console.log('Tomorrow routes:', tomorrowRoutes.length);

    // Find routes for this employee's crew
    const crewRoutes = [...todayRoutes, ...tomorrowRoutes].filter(route =>
      route.crewId === employee.crewId
    );

    console.log('Routes for employee crew:', crewRoutes.length);
    console.log('Crew routes:', crewRoutes);

    // Get all customers from these routes
    crewRoutes.forEach(route => {
      route.customers.forEach(customer => {
        assignedCustomerIds.add(customer.id);
      });
    });
  }

  console.log('Total assigned customer IDs:', Array.from(assignedCustomerIds));

  // Return all assigned customers (created by employee + in crew routes)
  const assignedCustomers = allCustomers.filter(customer => assignedCustomerIds.has(customer.id));
  console.log('Final assigned customers:', assignedCustomers.length);

  return assignedCustomers;
}; 

// Generate Google Directions API route for a crew
export const generateGoogleDirectionsRoute = async (
  companyId: string,
  crew: CrewAvailability,
  customers: Customer[]
): Promise<DailyRoute> => {
  if (customers.length === 0) {
    return {
      companyId, // REQUIRED: Multi-tenant isolation
      crewId: crew.crewId,
      date: crew.availability.date,
      customers: [],
      optimizedPath: [],
      estimatedDuration: 0,
      totalDistance: 0,
    };
  }

  // Create waypoints for Google Directions API
  const waypoints = customers.map(customer => ({
    location: { lat: customer.lat, lng: customer.lng },
    stopover: true,
  }));

  // Use first customer as origin, last as destination
  const origin = { lat: customers[0].lat, lng: customers[0].lng };
  const destination = { 
    lat: customers[customers.length - 1].lat, 
    lng: customers[customers.length - 1].lng 
  };

  // If we have more than 2 customers, use waypoints
  const waypointsForAPI = customers.length > 2 ? waypoints.slice(1, -1) : [];

  try {
    // This would need to be called from the frontend where Google Maps API is available
    // For now, we'll create a simple polyline path
    const optimizedPath = customers.map(customer => ({
      lat: customer.lat,
      lng: customer.lng
    }));

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 1; i < optimizedPath.length; i++) {
      const prev = optimizedPath[i - 1];
      const curr = optimizedPath[i];
      totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    }

    const estimatedDuration = customers.length * 30; // 30 minutes per customer

    return {
      companyId, // REQUIRED: Multi-tenant isolation
      crewId: crew.crewId,
      date: crew.availability.date,
      customers,
      optimizedPath,
      estimatedDuration,
      totalDistance,
    };
  } catch (error) {
    console.error('Error generating Google Directions route:', error);

    // Fallback to simple path
    const optimizedPath = customers.map(customer => ({
      lat: customer.lat,
      lng: customer.lng
    }));

    return {
      companyId, // REQUIRED: Multi-tenant isolation
      crewId: crew.crewId,
      date: crew.availability.date,
      customers,
      optimizedPath,
      estimatedDuration: customers.length * 30,
      totalDistance: 0,
    };
  }
}; 