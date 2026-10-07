"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import { RouteDisplay } from "@/components/lawn-route/RouteDisplay"
import { AddCustomerSheet } from "@/components/lawn-route/AddCustomerSheet"
import { EditCustomerSheet } from "@/components/lawn-route/EditCustomerSheet"
import { AddEmployeeSheet } from "@/components/lawn-route/AddEmployeeSheet"
import { EditEmployeeSheet } from "@/components/lawn-route/EditEmployeeSheet"
import { AddCrewSheet } from "@/components/lawn-route/AddCrewSheet"
import { CrewPopup } from "@/components/lawn-route/CrewPopup"
import { CompanySettingsSheet } from "@/components/lawn-route/CompanySettingsSheet"
import { Header } from "@/components/lawn-route/Header"
import { TimeAnalysisBar } from "@/components/lawn-route/TimeAnalysisBar"
import { ProfileSheet } from "@/components/lawn-route/ProfileSheet"
import { ScheduleSheet } from "@/components/lawn-route/ScheduleSheet"
import { CompanyManagementSheet } from "@/components/lawn-route/CompanyManagementSheet"
import { PendingUsersSheet } from "@/components/lawn-route/PendingUsersSheet"
import { TodaysRoutesPanel } from "@/components/lawn-route/TodaysRoutesPanel"
import { AppShellNav, type AppShellTab } from "@/components/lawn-route/AppShellNav"
import {
  RunSheetSummary,
  RunSheetStopsList,
  stopsFromDailyRoute,
  stopsFromTimingRoute,
} from "@/components/lawn-route/RunSheet"
import { PendingApprovalScreen } from "@/components/auth/PendingApprovalScreen"
import { Plus, User as UserIcon, Users, Building2 } from "lucide-react"
import { subscribeToCustomers, subscribeToAllCustomers, addCustomer } from "@/lib/customer-service"
import { subscribeToUsers, subscribeToAllUsers } from "@/lib/user-service"
import { generateOptimalRoutes } from "@/lib/route-service"
import { getRouteMetrics, downloadMetricsCSV, saveRouteMetrics } from "@/lib/route-metrics-service"
import type { Customer, User as FirebaseUser, DailyRoute, User } from "@/lib/firebase-types"
import type { Route } from "@/lib/types"
import { googleMapsConfig } from "@/lib/env"
import { dailyRoutesToRoutes } from "@/lib/route-conversion"
import { RouteProgressCalculator } from "@/lib/route-progress-service"

export default function LawnRoutePage() {
  const { userProfile } = useAuth()
  const { toast } = useToast()

  // State for customers and users
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<FirebaseUser[]>([])
  const [routes, setRoutes] = useState<DailyRoute[]>([])
  const [timingRoutes, setTimingRoutes] = useState<Route[]>([]) // For timing features
  const [companyName, setCompanyName] = useState<string>('')
  const [baseLocation, setBaseLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)

  // State for manager view / run sheet shell
  const [activeView, setActiveView] = useState<'customers' | 'employees' | 'crews'>('customers')
  const [shellTab, setShellTab] = useState<AppShellTab>('run-sheet')
  const [panelMode, setPanelMode] = useState<'run' | 'customers' | 'employees' | 'crews'>('run')
  const [isAddCustomerSheetOpen, setIsAddCustomerSheetOpen] = useState(false)
  const [isEditCustomerSheetOpen, setIsEditCustomerSheetOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isAddEmployeeSheetOpen, setIsAddEmployeeSheetOpen] = useState(false)
  const [isEditEmployeeSheetOpen, setIsEditEmployeeSheetOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null)
  const [isAddCrewSheetOpen, setIsAddCrewSheetOpen] = useState(false)
  const [editingCrew, setEditingCrew] = useState<{
    crewId: string;
    members: User[];
    serviceTypes: string[];
  } | null>(null)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<DailyRoute | null>(null)
  const [isCrewPopupOpen, setIsCrewPopupOpen] = useState(false)
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false)
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false)
  const [isScheduleSheetOpen, setIsScheduleSheetOpen] = useState(false)
  const [isCompanyManagementOpen, setIsCompanyManagementOpen] = useState(false)
  const [isPendingUsersSheetOpen, setIsPendingUsersSheetOpen] = useState(false)

  // Generate human-readable crew IDs using animal names
  const generateCrewId = () => {
    const animals = [
      'Lion', 'Tiger', 'Bear', 'Wolf', 'Eagle', 'Hawk', 'Falcon', 'Owl',
      'Dolphin', 'Shark', 'Whale', 'Octopus', 'Squid', 'Crab', 'Lobster',
      'Elephant', 'Giraffe', 'Zebra', 'Rhino', 'Hippo', 'Gorilla', 'Chimp',
      'Penguin', 'Seal', 'Walrus', 'Polar Bear', 'Arctic Fox', 'Snow Leopard',
      'Kangaroo', 'Koala', 'Platypus', 'Emu', 'Cassowary', 'Tasmanian Devil',
      'Panda', 'Red Panda', 'Sloth', 'Anteater', 'Armadillo', 'Capybara',
      'Meerkat', 'Warthog', 'Hyena', 'Cheetah', 'Leopard', 'Jaguar',
      'Cobra', 'Python', 'Viper', 'Rattlesnake', 'Anaconda', 'Boa',
      'Scorpion', 'Tarantula', 'Black Widow', 'Brown Recluse', 'Wolf Spider',
      'Dragonfly', 'Butterfly', 'Bee', 'Wasp', 'Hornet', 'Ant',
      'Beetle', 'Ladybug', 'Firefly', 'Cricket', 'Grasshopper', 'Mantis',
      'Stag Beetle', 'Rhinoceros Beetle', 'Hercules Beetle', 'Goliath Beetle'
    ];
    
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    return `${randomAnimal}-${randomNumber.toString().padStart(3, '0')}`;
  };
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  
  // Minimum swipe distance
  const minSwipeDistance = 30

  const isAdmin = userProfile?.role === 'admin'
  const isManager = userProfile?.role === 'manager' || isAdmin

  // Debug logging
  console.log('User Profile:', userProfile)
  console.log('Is Admin:', isAdmin)
  console.log('Is Manager:', isManager)

  // Fetch company name and base location
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!userProfile?.companyId) return;
      if (userProfile.accountStatus === 'pending') return; // Skip for pending users

      try {
        const { getCompany } = await import('@/lib/company-service');
        const company = await getCompany(userProfile.companyId);
        if (company) {
          setCompanyName(company.name);
          if (company.baseLocation) {
            setBaseLocation(company.baseLocation);
            console.log('Company base location loaded:', company.baseLocation);
          }
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      }
    };

    fetchCompanyData();
  }, [userProfile])

  // Subscribe to customers (admins see all, managers see company, employees see assigned)
  useEffect(() => {
    if (!userProfile) return
    if (userProfile.accountStatus === 'pending') return // Skip for pending users

    if (isAdmin) {
      // Admins see ALL customers across all companies (real-time subscription)
      const unsubscribeCustomers = subscribeToAllCustomers((customers) => {
        console.log('Admin: All customers updated via subscription:', customers.length);
        setCustomers(customers)
      })
      return () => unsubscribeCustomers()
    } else if (!userProfile.companyId) {
      // Non-admin users must have a companyId
      return
    } else if (isManager) {
      // Managers see all customers in their company (real-time subscription)
      const unsubscribeCustomers = subscribeToCustomers(userProfile.companyId, (customers) => {
        console.log('Manager: Customers updated via subscription:', customers.length);
        setCustomers(customers)
      })
      return () => unsubscribeCustomers()
    } else {
      // Employees: Use subscription for real-time updates, then filter to assigned customers
      let isActive = true;

      const unsubscribeCustomers = subscribeToCustomers(userProfile.companyId!, async (allCustomers) => {
        if (!isActive) return;

        try {
          // Import the service to get assigned customers
          // This includes both customers they created AND customers in their crew routes
          const { getEmployeeAssignedCustomers } = await import('@/lib/route-service');
          const assignedCustomers = await getEmployeeAssignedCustomers(userProfile.companyId!, userProfile.id);

          if (isActive) {
            console.log('Employee: Real-time update - showing', assignedCustomers.length, 'assigned customers');
            setCustomers(assignedCustomers);
          }
        } catch (error) {
          console.error('Error getting employee assigned customers:', error);
          // Fallback: show all customers they created
          if (isActive) {
            const myCustomers = allCustomers.filter(c => c.createdBy === userProfile.id);
            setCustomers(myCustomers);
          }
        }
      });

      return () => {
        isActive = false;
        unsubscribeCustomers();
      };
    }
  }, [userProfile, isManager, isAdmin])

  // Subscribe to users (for manager and admin view)
  useEffect(() => {
    if (!isManager || !userProfile) return
    if (userProfile.accountStatus === 'pending') return // Skip for pending users

    if (isAdmin) {
      // Admins see ALL users across all companies
      const unsubscribeUsers = subscribeToAllUsers((users) => {
        console.log('Admin: All users updated via subscription:', users.length);
        setUsers(users)
      })
      return () => unsubscribeUsers()
    } else if (userProfile.companyId) {
      // Managers see users in their company
      const unsubscribeUsers = subscribeToUsers(userProfile.companyId, (users) => {
        setUsers(users)
      })
      return () => unsubscribeUsers()
    }
  }, [isManager, isAdmin, userProfile])

  // Generate routes for today and tomorrow (skip for admins who don't have a company)
  useEffect(() => {
    if (!userProfile?.companyId || isAdmin) return
    if (userProfile.accountStatus === 'pending') return // Skip for pending users

    const generateRoutes = async () => {
      try {
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const todayRoutes = await generateOptimalRoutes(userProfile.companyId!, today)
        const tomorrowRoutes = await generateOptimalRoutes(userProfile.companyId!, tomorrow)
        
        // Combine routes by crew, showing today's routes as primary
        const crewRoutes = new Map<string, DailyRoute>();
        
        // Add today's routes first
        todayRoutes.forEach(route => {
          crewRoutes.set(route.crewId, route);
        });
        
        // Add tomorrow's routes if no today route exists for that crew
        tomorrowRoutes.forEach(route => {
          if (!crewRoutes.has(route.crewId)) {
            crewRoutes.set(route.crewId, route);
          }
        });
        
        let allRoutes = Array.from(crewRoutes.values());
        
        // For employees, only show routes for their assigned crew
        if (!isManager && userProfile?.crewId) {
          allRoutes = allRoutes.filter(route => route.crewId === userProfile.crewId);
          console.log(`Employee ${userProfile.name} - Filtered to only show crew ${userProfile.crewId}`);
        }
        
        console.log('Generated routes:', allRoutes);
        console.log('Route details:', allRoutes.map(route => ({
          crewId: route.crewId,
          customerCount: route.customers.length,
          hasOptimizedPath: !!route.optimizedPath,
          pathLength: route.optimizedPath?.length || 0
        })));
        setRoutes(allRoutes)
      } catch (error) {
        console.error('Error generating routes:', error)
        toast({
          title: "Route Generation Error",
          description: "Failed to generate optimal routes.",
          variant: "destructive",
        })
      }
    }

    generateRoutes()
  }, [userProfile, customers, users, isManager, isAdmin, toast])

  // Convert DailyRoutes to Routes for timing features
  useEffect(() => {
    const converted = dailyRoutesToRoutes(routes)
    setTimingRoutes(converted)
  }, [routes])

  // Handler functions for stop timing
  const handleStopArrival = async (customerId: string) => {
    if (timingRoutes.length === 0) return

    const routeIndex = timingRoutes.findIndex(r =>
      r.stops.some(s => s.customerId === customerId)
    )
    if (routeIndex === -1) return

    const updatedRoute = RouteProgressCalculator.recordStopArrival(
      timingRoutes[routeIndex],
      customerId
    )

    const newTimingRoutes = [...timingRoutes]
    newTimingRoutes[routeIndex] = updatedRoute
    setTimingRoutes(newTimingRoutes)

    toast({
      title: "Arrived",
      description: "Timer started for this stop",
    })
  }

  const handleStopDeparture = async (customerId: string) => {
    if (timingRoutes.length === 0) return

    const routeIndex = timingRoutes.findIndex(r =>
      r.stops.some(s => s.customerId === customerId)
    )
    if (routeIndex === -1) return

    const updatedRoute = RouteProgressCalculator.recordStopDeparture(
      timingRoutes[routeIndex],
      customerId
    )

    const newTimingRoutes = [...timingRoutes]
    newTimingRoutes[routeIndex] = updatedRoute
    setTimingRoutes(newTimingRoutes)

    toast({
      title: "Completed",
      description: "Stop marked as complete",
    })
  }

  const handleStopPause = async (customerId: string) => {
    if (timingRoutes.length === 0) return

    const routeIndex = timingRoutes.findIndex(r =>
      r.stops.some(s => s.customerId === customerId)
    )
    if (routeIndex === -1) return

    const updatedRoute = RouteProgressCalculator.pauseStop(
      timingRoutes[routeIndex],
      customerId
    )

    const newTimingRoutes = [...timingRoutes]
    newTimingRoutes[routeIndex] = updatedRoute
    setTimingRoutes(newTimingRoutes)

    toast({
      title: "Paused",
      description: "Timer paused",
    })
  }

  const handleStopResume = async (customerId: string) => {
    if (timingRoutes.length === 0) return

    const routeIndex = timingRoutes.findIndex(r =>
      r.stops.some(s => s.customerId === customerId)
    )
    if (routeIndex === -1) return

    const updatedRoute = RouteProgressCalculator.resumeStop(
      timingRoutes[routeIndex],
      customerId
    )

    const newTimingRoutes = [...timingRoutes]
    newTimingRoutes[routeIndex] = updatedRoute
    setTimingRoutes(newTimingRoutes)

    toast({
      title: "Resumed",
      description: "Timer resumed",
    })
  }

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault()
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      // Swipe left - go to next view
      if (activeView === 'customers') setActiveView('employees')
      else if (activeView === 'employees') setActiveView('crews')
      else if (activeView === 'crews') setActiveView('customers')
    }

    if (isRightSwipe) {
      // Swipe right - go to previous view
      if (activeView === 'customers') setActiveView('crews')
      else if (activeView === 'employees') setActiveView('customers')
      else if (activeView === 'crews') setActiveView('employees')
    }
  }

  // Handle exporting route metrics
  const handleExportMetrics = async () => {
    try {
      if (!userProfile?.companyId) {
        toast({
          title: "Error",
          description: "Company ID not found",
          variant: "destructive",
        });
        return;
      }

      // Get today's metrics
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const metrics = await getRouteMetrics(userProfile.companyId, startOfDay, endOfDay);

      if (metrics.length === 0) {
        toast({
          title: "No Data",
          description: "No route metrics found for today",
        });
        return;
      }

      // Download as CSV
      const filename = `route-metrics-${today.toISOString().split('T')[0]}.csv`;
      downloadMetricsCSV(metrics, filename);

      toast({
        title: "Export Complete",
        description: `Downloaded ${metrics.length} route(s) data`,
      });
    } catch (error) {
      console.error('Error exporting metrics:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export route metrics",
        variant: "destructive",
      });
    }
  };

  // Automatically save route metrics when a route is completed
  useEffect(() => {
    const saveCompletedRouteMetrics = async () => {
      if (!userProfile?.companyId) return;

      for (const route of timingRoutes) {
        if (route.status === 'completed') {
          try {
            await saveRouteMetrics(route, userProfile.companyId);
            console.log('Saved route metrics for', route.id);
          } catch (error) {
            console.error('Error saving route metrics:', error);
          }
        }
      }
    };

    saveCompletedRouteMetrics();
  }, [timingRoutes, userProfile?.companyId]);

  // Handle adding new customer
  const handleAddCustomer = async (data: any) => {
    try {
      if (!userProfile?.companyId) {
        throw new Error('User company ID not found');
      }

      // Create a service for each selected service type
      const services = (data.serviceTypes || []).map((serviceType: string, index: number) => ({
        id: `${Date.now()}-${index}`,
        type: serviceType,
        description: `${serviceType} service`,
        price: 0,
        scheduledDate: new Date() as any,
        status: 'scheduled' as const,
      }));

      const newCustomer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId: userProfile.companyId, // REQUIRED: Multi-tenant isolation
        name: data.name,
        address: data.address,
        lat: Number(data.coordinates?.lat) || 0,
        lng: Number(data.coordinates?.lng) || 0,
        notes: data.notes || '',
        billingInfo: {},
        status: 'active',
        services: services,
        createdBy: userProfile?.id || '',
        servicePreferences: {
          preferredDays: (data.servicePreferences?.preferredDays?.length
            ? data.servicePreferences.preferredDays
            : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
          preferredTimeRange: data.servicePreferences.preferredTimeRange,
          serviceFrequency: data.servicePreferences.serviceFrequency === 'weekly' ? 7 :
                          data.servicePreferences.serviceFrequency === 'biweekly' ? 14 :
                          data.servicePreferences.serviceFrequency === 'monthly' ? 30 : 1,
        },
        serviceHistory: [],
      }

      await addCustomer(newCustomer)
      setIsAddCustomerSheetOpen(false)
    } catch (error) {
      console.error('Error adding customer:', error)
      throw error
    }
  }

  // Handle updating customer
  const handleUpdateCustomer = async (data: any) => {
    if (!editingCustomer) return;
    
    try {
      const { updateDocument } = await import('@/lib/firebase-services');
      
      // Create services array from selected service types
      // Preserve existing service data where possible, create new ones for new types
      const existingServicesMap = new Map(
        (editingCustomer.services || []).map(service => [service.type, service])
      );
      
      const services = (data.serviceTypes || []).map((serviceType: string, index: number) => {
        const existingService = existingServicesMap.get(serviceType);
        if (existingService) {
          // Preserve existing service data
          return {
            ...existingService,
            type: serviceType,
            description: existingService.description || `${serviceType} service`,
          };
        } else {
          // Create new service
          return {
            id: `${Date.now()}-${index}`,
            type: serviceType,
            description: `${serviceType} service`,
            price: 0,
            scheduledDate: new Date() as any,
            status: 'scheduled' as const,
          };
        }
      });

      await updateDocument('customers', editingCustomer.id, {
        name: data.name,
        address: data.address,
        lat: Number(data.coordinates?.lat || editingCustomer.lat),
        lng: Number(data.coordinates?.lng || editingCustomer.lng),
        notes: data.notes || '',
        services: services,
        servicePreferences: {
          preferredDays: (data.servicePreferences?.preferredDays?.length
            ? data.servicePreferences.preferredDays
            : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
          preferredTimeRange: data.servicePreferences.preferredTimeRange,
          serviceFrequency: data.servicePreferences.serviceFrequency === 'weekly' ? 7 : 
                          data.servicePreferences.serviceFrequency === 'biweekly' ? 14 : 
                          data.servicePreferences.serviceFrequency === 'monthly' ? 30 : 1,
        },
      });
      
      setIsEditCustomerSheetOpen(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  // Handle deleting customer
  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const { deleteDocument } = await import('@/lib/firebase-services');
      await deleteDocument('customers', customerId);
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  // Handle updating employee
  const handleUpdateEmployee = async (data: any) => {
    if (!editingEmployee) return;
    
    try {
      const { updateDocument } = await import('@/lib/firebase-services');
      
      await updateDocument('users', editingEmployee.id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        title: data.title || '',
        notes: data.notes || '',
        schedule: data.schedule,
      });
      
      setIsEditEmployeeSheetOpen(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  };

  // Handle deleting employee
  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const { deleteDocument } = await import('@/lib/firebase-services');
      await deleteDocument('users', employeeId);
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  };

  // Handle adding new employee
  const handleAddEmployee = async (data: any) => {
    try {
      if (!userProfile?.companyId) {
        throw new Error('User company ID not found');
      }

      const { createDocument } = await import('@/lib/firebase-services');

      // Create the user document
      await createDocument('users', {
        companyId: userProfile.companyId, // REQUIRED: Multi-tenant isolation
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        title: data.title || null,
        notes: data.notes || '',
        schedule: data.schedule,
        status: 'available',
        accountStatus: 'active',
        currentLocation: null,
        capabilities: [],
        region: '',
        crewId: null,
        crewServiceTypes: null,
      });

      setIsAddEmployeeSheetOpen(false);
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  };

  // Handle deleting crew
  const handleDeleteCrew = async (crewId: string, members: User[]) => {
    try {
      const { removeUserFromCrew } = await import('@/lib/crew-assignment-service');
      
      // Remove all members from this crew
      for (const member of members) {
        await removeUserFromCrew(member.id);
      }
      
      // Show success message
      toast({
        title: "Crew Deleted",
        description: `Crew ${crewId} has been deleted and all members have been unassigned.`,
      });
    } catch (error) {
      console.error('Error deleting crew:', error);
      toast({
        title: "Error",
        description: "Failed to delete crew. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle adding/editing crew
  const handleAddCrew = async (data: any) => {
    try {
      const { assignUserToCrew, removeUserFromCrew } = await import('@/lib/crew-assignment-service');
      
      if (editingCrew) {
        // Editing existing crew
        const crewId = editingCrew.crewId;
        
        // Remove all current members from this crew
        for (const member of editingCrew.members) {
          await removeUserFromCrew(member.id);
        }
        
        // Assign new/updated employees to this crew
        for (const employeeId of data.assignedEmployees) {
          await assignUserToCrew(employeeId, {
            crewId: crewId,
            serviceTypes: data.serviceTypes,
            // title is optional - omitting it keeps existing title
          });
        }
        
        setEditingCrew(null);
      } else {
        // Creating new crew
        const crewId = generateCrewId();

        // Assign selected employees to this crew
        for (const employeeId of data.assignedEmployees) {
          await assignUserToCrew(employeeId, {
            crewId: crewId,
            serviceTypes: data.serviceTypes,
            // title is optional - omitting it when creating new crew
          });
        }
      }
      
      setIsAddCrewSheetOpen(false);
    } catch (error) {
      console.error('Error adding/editing crew:', error);
      throw error;
    }
  };

  // Handle customer selection from map
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditingCustomer(customer);
    setIsEditCustomerSheetOpen(true);
  };

  const handleRouteClick = (route: DailyRoute) => {
    setSelectedRoute(route);
    setIsCrewPopupOpen(true);
  };

  // Render customers view
  const renderCustomersView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          {isManager ? `Customers (${customers.length})` : `My Assigned Customers (${customers.length})`}
        </h2>
      </div>
      
      <div className="space-y-4 p-4">
        {/* Add New Customer Card - Now at the top */}
        <div
          onClick={() => setIsAddCustomerSheetOpen(true)}
          className="p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary hover:text-primary transition-all bg-secondary/50 flex flex-col items-center justify-center text-center"
        >
          <Plus className="w-10 h-10 mb-2" />
          <p className="font-semibold">Add New Customer</p>
        </div>

        {/* Existing customers */}
        {customers.map((customer) => (
        <div
          key={customer.id}
          className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => handleSelectCustomer(customer)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{customer.name}</h3>
              <p className="text-sm text-muted-foreground">{customer.address}</p>
              {customer.services.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Service: {customer.services[0].type}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded-full text-xs ${
                customer.status === 'active' ? 'bg-green-100 text-green-800' :
                customer.status === 'inactive' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {customer.status}
              </span>
            </div>
          </div>
        </div>
      ))}
      </div>
    </div>
  )

  // Render employees view
  const renderEmployeesView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="w-5 h-5" />
          Employees ({users.filter(user => user.role === 'employee' || user.role === 'manager').length})
        </h2>
      </div>
      
      <div className="space-y-4 p-4">
      {/* Add New Employee */}
      <div
        className="p-6 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground transition-colors cursor-pointer"
        onClick={() => setIsAddEmployeeSheetOpen(true)}
      >
        <Plus className="w-10 h-10 mb-2" />
        <p className="font-semibold">Add New Employee</p>
      </div>

      {/* Existing employees */}
      {users.filter(user => user.role === 'employee' || user.role === 'manager').map((user) => (
        <div
          key={user.id}
          className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer"
          onClick={() => {
            setEditingEmployee(user);
            setIsEditEmployeeSheetOpen(true);
          }}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Role: {user.role === 'manager' ? 'Manager' : 'Employee'} {user.title && `(${user.title})`}
              </p>
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded-full text-xs ${
                user.status === 'available' ? 'bg-green-100 text-green-800' :
                user.status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* Employee Self-Signup Instructions Card */}
      <div className="p-4 border-2 border-blue-200 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-900">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            <p className="font-semibold text-base">Add Employees</p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              <p>Share company name: <span className="font-bold bg-white px-2 py-1 rounded shadow-sm">{companyName || 'Loading...'}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              <p>Employee signs up with &quot;Employee&quot; role</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</span>
              <p>You approve in <span className="font-semibold">&quot;Pending&quot;</span> tab</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )

  // Render crews view
  const renderCrewsView = () => {
    // Helper function to calculate work and non-work time for a crew
    const getCrewTiming = (crewId: string) => {
      const crewRoute = timingRoutes.find(r => r.crewId === crewId);
      if (!crewRoute) {
        return { workTime: 0, nonWorkTime: 0 };
      }

      let workTime = 0;
      let driveTime = 0;

      crewRoute.stops.forEach(stop => {
        workTime += stop.workTime || 0;
        driveTime += stop.driveTime || 0;
      });

      return { workTime, nonWorkTime: driveTime };
    };

    // Group users by crewId
    const crews = new Map<string, {
      crewId: string;
      members: User[];
      serviceTypes: string[];
    }>();

    users.forEach(user => {
      if (user.crewId) {
        if (!crews.has(user.crewId)) {
          crews.set(user.crewId, {
            crewId: user.crewId,
            members: [],
            serviceTypes: user.crewServiceTypes || [],
          });
        }
        crews.get(user.crewId)!.members.push(user);
      }
    });

    const crewsList = Array.from(crews.values());

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Crews ({crewsList.length})
          </h2>
        </div>
        
        <div className="space-y-4 p-4">
          <TodaysRoutesPanel
            routes={routes}
            onSelectRoute={handleRouteClick}
          />

          {/* Add New Crew Card */}
          <div 
            onClick={() => setIsAddCrewSheetOpen(true)}
            className="p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary hover:text-primary transition-all bg-secondary/50 flex flex-col items-center justify-center text-center"
          >
            <Building2 className="w-10 h-10 mb-2" />
            <p className="font-semibold">Add New Crew</p>
          </div>

          {/* Crew information */}
          {crewsList.map((crew) => {
            const timing = getCrewTiming(crew.crewId);
            const crewRoute = routes.find((route) => route.crewId === crew.crewId);

            return (
              <div
                key={crew.crewId}
                className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => {
                  setEditingCrew(crew);
                  setIsAddCrewSheetOpen(true);
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold">Crew {crew.crewId}</h3>
                    <p className="text-sm text-muted-foreground">
                      {crew.members.length} members
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Services: {crew.serviceTypes.join(', ') || 'none'}
                    </p>
                    <p className="text-sm mt-1">
                      Today: {crewRoute?.customers.length || 0} routed stops
                    </p>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">Members:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {crew.members.map((member) => (
                          <span
                            key={member.id}
                            className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                          >
                            {member.name} ({member.role})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Active
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCrew(crew.crewId, crew.members);
                      }}
                      className="ml-2 px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Time Analysis Bar */}
                {(timing.workTime > 0 || timing.nonWorkTime > 0) && (
                  <TimeAnalysisBar
                    workTimeMinutes={timing.workTime}
                    nonWorkTimeMinutes={timing.nonWorkTime}
                    showLegend={false}
                    className="mt-2"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Handler to reload base location after update
  const handleLocationUpdated = async () => {
    if (!userProfile?.companyId) return;
    try {
      const { getCompany } = await import('@/lib/company-service');
      const company = await getCompany(userProfile.companyId);
      if (company?.baseLocation) {
        setBaseLocation(company.baseLocation);
      }
    } catch (error) {
      console.error('Error reloading base location:', error);
    }
  }

  const primaryRoute = routes.find((r) => r.customers.length > 0) || routes[0] || null
  const runSheetStops = stopsFromDailyRoute(primaryRoute)
  const completedStops = runSheetStops.filter((s) => s.status === 'done').length
  const routeLabel = primaryRoute
    ? `Route ${primaryRoute.crewId}`
    : 'Route —'

  const handleShellTab = (tab: AppShellTab) => {
    setShellTab(tab)
    if (tab === 'run-sheet') {
      setPanelMode('run')
    } else if (tab === 'schedule') {
      setIsScheduleSheetOpen(true)
    } else if (tab === 'new-stop') {
      setIsAddCustomerSheetOpen(true)
    } else if (tab === 'settings') {
      setIsProfileSheetOpen(true)
    }
  }

  const mapPane = (
    <RouteDisplay
      customers={customers}
      employees={users.filter(user => user.role === 'employee' || user.role === 'manager')}
      routes={routes}
      selectedCustomer={selectedCustomer}
      onSelectCustomer={handleSelectCustomer}
      onRouteClick={handleRouteClick}
      baseLocation={baseLocation}
      apiKey={googleMapsConfig.apiKey}
    />
  )

  // If user is pending approval, show the pending approval screen
  if (userProfile?.accountStatus === 'pending') {
    return <PendingApprovalScreen />
  }

  if (isManager) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col h-svh bg-background text-foreground font-body">
          <Header
            onOpenCompanySettings={() => setIsCompanySettingsOpen(true)}
            onExportMetrics={handleExportMetrics}
            onOpenProfile={() => setIsProfileSheetOpen(true)}
            onOpenSchedule={() => setIsScheduleSheetOpen(true)}
            onOpenCompanyManagement={() => setIsCompanyManagementOpen(true)}
            onOpenPendingUsers={() => setIsPendingUsersSheetOpen(true)}
            onOpenCustomers={() => { setPanelMode('customers'); setActiveView('customers'); setShellTab('run-sheet') }}
            onOpenEmployees={() => { setPanelMode('employees'); setActiveView('employees'); setShellTab('run-sheet') }}
            onOpenCrews={() => { setPanelMode('crews'); setActiveView('crews'); setShellTab('run-sheet') }}
          />
          <main className="flex-1 overflow-hidden">
            {shellTab === 'map' ? (
              <div className="h-full w-full">{mapPane}</div>
            ) : panelMode !== 'run' ? (
              <div
                className="h-full overflow-y-auto p-4"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {panelMode === 'customers' && renderCustomersView()}
                {panelMode === 'employees' && renderEmployeesView()}
                {panelMode === 'crews' && renderCrewsView()}
              </div>
            ) : (
              <div className="grid h-full grid-rows-[auto_1fr] md:grid-cols-2 md:grid-rows-1 overflow-hidden">
                <div className="overflow-y-auto p-3 md:p-4 space-y-4 border-b md:border-b-0 md:border-r">
                  <RunSheetSummary
                    routeLabel={routeLabel}
                    completed={completedStops}
                    total={runSheetStops.length}
                    estimatedMinutesRemaining={primaryRoute?.estimatedDuration}
                    mapSlot={
                      <button
                        type="button"
                        onClick={() => setShellTab('map')}
                        className="flex h-[140px] w-full flex-col items-center justify-center gap-1 bg-[#eef1e8] text-xs font-semibold uppercase tracking-wide text-primary md:hidden"
                      >
                        Open map
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {runSheetStops.length} stops · flat view
                        </span>
                      </button>
                    }
                  />
                  <RunSheetStopsList
                    stops={runSheetStops}
                    onSelectStop={(id) => {
                      const customer = customers.find((c) => c.id === id)
                      if (customer) handleSelectCustomer(customer)
                    }}
                  />
                  {routes.length > 1 && (
                    <TodaysRoutesPanel routes={routes} onSelectRoute={handleRouteClick} />
                  )}
                </div>
                <div className="hidden md:block h-full min-h-0">{mapPane}</div>
              </div>
            )}
          </main>
          <AppShellNav active={shellTab} onChange={handleShellTab} />

          {/* Add Customer Sheet */}
          <AddCustomerSheet
            open={isAddCustomerSheetOpen}
            onOpenChange={setIsAddCustomerSheetOpen}
            onAddCustomer={handleAddCustomer}
          />

          {/* Edit Customer Sheet */}
          <EditCustomerSheet
            open={isEditCustomerSheetOpen}
            onOpenChange={(open) => {
              setIsEditCustomerSheetOpen(open);
              if (!open) {
                setEditingCustomer(null);
              }
            }}
            customer={editingCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />

          {/* Add Employee Sheet */}
          <AddEmployeeSheet
            open={isAddEmployeeSheetOpen}
            onOpenChange={setIsAddEmployeeSheetOpen}
            onAddEmployee={handleAddEmployee}
          />

          {/* Edit Employee Sheet */}
          <EditEmployeeSheet
            open={isEditEmployeeSheetOpen}
            onOpenChange={(open) => {
              setIsEditEmployeeSheetOpen(open);
              if (!open) {
                setEditingEmployee(null);
              }
            }}
            employee={editingEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />

          {/* Add Crew Sheet */}
          <AddCrewSheet
            open={isAddCrewSheetOpen}
            onOpenChange={(open) => {
              setIsAddCrewSheetOpen(open);
              if (!open) {
                setEditingCrew(null);
              }
            }}
            onAddCrew={handleAddCrew}
            editingCrew={editingCrew}
            crewTiming={editingCrew ? (() => {
              const crewRoute = timingRoutes.find(r => r.crewId === editingCrew.crewId);
              if (!crewRoute) return { workTime: 0, nonWorkTime: 0 };

              let workTime = 0;
              let driveTime = 0;
              crewRoute.stops.forEach(stop => {
                workTime += stop.workTime || 0;
                driveTime += stop.driveTime || 0;
              });

              return { workTime, nonWorkTime: driveTime };
            })() : undefined}
          />

          {/* Crew Popup */}
          <CrewPopup
            open={isCrewPopupOpen}
            onOpenChange={setIsCrewPopupOpen}
            route={selectedRoute}
            employees={users}
          />

          {/* Company Settings Sheet */}
          <CompanySettingsSheet
            open={isCompanySettingsOpen}
            onOpenChange={setIsCompanySettingsOpen}
            companyId={userProfile?.companyId || ''}
            currentBaseLocation={baseLocation}
            onLocationUpdated={handleLocationUpdated}
          />

          {/* Profile Sheet */}
          <ProfileSheet
            open={isProfileSheetOpen}
            onOpenChange={setIsProfileSheetOpen}
          />

          {/* Schedule Sheet */}
          <ScheduleSheet
            open={isScheduleSheetOpen}
            onOpenChange={setIsScheduleSheetOpen}
            routes={routes}
          />

          {/* Company Management Sheet (Admin Only) */}
          <CompanyManagementSheet
            open={isCompanyManagementOpen}
            onOpenChange={setIsCompanyManagementOpen}
          />

          {/* Pending Users Sheet (Manager/Admin Only) */}
          <PendingUsersSheet
            open={isPendingUsersSheetOpen}
            onOpenChange={setIsPendingUsersSheetOpen}
          />
        </div>
      </ProtectedRoute>
    )
  }

  // Employee view — same Run Sheet shell
  const employeeStops = timingRoutes[0]
    ? stopsFromTimingRoute(timingRoutes[0])
    : runSheetStops
  const employeeCompleted = employeeStops.filter((s) => s.status === 'done').length
  const employeeRouteLabel = userProfile?.crewId
    ? `Route ${userProfile.crewId}`
    : routeLabel

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-svh bg-background text-foreground font-body">
        <Header
          onOpenCompanySettings={() => setIsCompanySettingsOpen(true)}
          onExportMetrics={handleExportMetrics}
          onOpenProfile={() => setIsProfileSheetOpen(true)}
          onOpenSchedule={() => setIsScheduleSheetOpen(true)}
          onOpenCompanyManagement={() => setIsCompanyManagementOpen(true)}
        />
        <main className="flex-1 overflow-hidden">
          {shellTab === 'map' ? (
            <div className="h-full w-full">{mapPane}</div>
          ) : (
            <div className="grid h-full grid-rows-[auto_1fr] md:grid-cols-2 md:grid-rows-1 overflow-hidden">
              <div className="overflow-y-auto p-3 md:p-4 space-y-4 border-b md:border-b-0 md:border-r">
                <RunSheetSummary
                  routeLabel={employeeRouteLabel}
                  completed={employeeCompleted}
                  total={employeeStops.length}
                  estimatedMinutesRemaining={
                    timingRoutes[0]?.estimatedDuration ?? primaryRoute?.estimatedDuration
                  }
                  mapSlot={
                    <button
                      type="button"
                      onClick={() => setShellTab('map')}
                      className="flex h-[140px] w-full flex-col items-center justify-center gap-1 bg-[#eef1e8] text-xs font-semibold uppercase tracking-wide text-primary md:hidden"
                    >
                      Open map
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {employeeStops.length} stops · flat view
                      </span>
                    </button>
                  }
                />
                <RunSheetStopsList
                  stops={employeeStops}
                  onSelectStop={(id) => {
                    const customer = customers.find((c) => c.id === id)
                    if (customer) handleSelectCustomer(customer)
                  }}
                />
                {timingRoutes[0] && (() => {
                  const current = timingRoutes[0].stops.find((s) => s.status === 'in_progress')
                  const next = timingRoutes[0].stops.find((s) => s.status === 'pending')
                  const focus = current || next
                  if (!focus) return null
                  return (
                    <div className="rounded-2xl border bg-card p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {current ? 'Current stop' : 'Next stop'}
                      </p>
                      <p className="text-lg font-semibold text-ink">{focus.customerName}</p>
                      <p className="text-sm text-muted-foreground">{focus.address}</p>
                      <button
                        type="button"
                        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground"
                        onClick={() =>
                          current
                            ? handleStopDeparture(focus.customerId)
                            : handleStopArrival(focus.customerId)
                        }
                      >
                        {current ? 'Complete stop' : 'Arrive at stop'}
                      </button>
                    </div>
                  )
                })()}
              </div>
              <div className="hidden md:block h-full min-h-0">{mapPane}</div>
            </div>
          )}
        </main>
        <AppShellNav active={shellTab} onChange={handleShellTab} />

        <AddCustomerSheet
          open={isAddCustomerSheetOpen}
          onOpenChange={setIsAddCustomerSheetOpen}
          onAddCustomer={handleAddCustomer}
        />

        <EditCustomerSheet
          open={isEditCustomerSheetOpen}
          onOpenChange={(open) => {
            setIsEditCustomerSheetOpen(open);
            if (!open) {
              setEditingCustomer(null);
            }
          }}
          customer={editingCustomer}
          onUpdateCustomer={handleUpdateCustomer}
          onDeleteCustomer={handleDeleteCustomer}
        />

        <ProfileSheet
          open={isProfileSheetOpen}
          onOpenChange={setIsProfileSheetOpen}
        />

        <ScheduleSheet
          open={isScheduleSheetOpen}
          onOpenChange={setIsScheduleSheetOpen}
          routes={routes}
        />

        <CompanySettingsSheet
          open={isCompanySettingsOpen}
          onOpenChange={setIsCompanySettingsOpen}
          companyId={userProfile?.companyId || ''}
          currentBaseLocation={baseLocation}
          onLocationUpdated={handleLocationUpdated}
        />

        <CompanyManagementSheet
          open={isCompanyManagementOpen}
          onOpenChange={setIsCompanyManagementOpen}
        />
      </div>
    </ProtectedRoute>
  )
}
