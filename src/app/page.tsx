"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"

import { ManagerMap } from "@/components/lawn-route/ManagerMap"
import { RouteDisplay } from "@/components/lawn-route/RouteDisplay"
import { AddCustomerSheet } from "@/components/lawn-route/AddCustomerSheet"
import { EditCustomerSheet } from "@/components/lawn-route/EditCustomerSheet"
import { AddEmployeeSheet } from "@/components/lawn-route/AddEmployeeSheet"
import { EditEmployeeSheet } from "@/components/lawn-route/EditEmployeeSheet"
import { AddCrewSheet } from "@/components/lawn-route/AddCrewSheet"
import { CrewPopup } from "@/components/lawn-route/CrewPopup"
import { Header } from "@/components/lawn-route/Header"
import { Button } from "@/components/ui/button"
import { Plus, User as UserIcon, Users, Building2 } from "lucide-react"
import { subscribeToCustomers, addCustomer } from "@/lib/customer-service"
import { subscribeToUsers } from "@/lib/user-service"
import { generateOptimalRoutes, getCachedRoute } from "@/lib/route-service"
import type { Customer, User as FirebaseUser, DailyRoute, User } from "@/lib/firebase-types"
import { googleMapsConfig } from "@/lib/env"

export default function LawnRoutePage() {
  const { userProfile } = useAuth()
  const { toast } = useToast()

  // State for customers and users
  const [customers, setCustomers] = useState<Customer[]>([])
  const [users, setUsers] = useState<FirebaseUser[]>([])
  const [routes, setRoutes] = useState<DailyRoute[]>([])
  const [companyName, setCompanyName] = useState<string>('')
  const [baseLocation, setBaseLocation] = useState<{ lat: number; lng: number; address: string } | null>(null)
  
  // State for manager view
  const [activeView, setActiveView] = useState<'customers' | 'employees' | 'crews'>('customers')
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

  const isManager = userProfile?.role === 'manager' || userProfile?.role === 'admin'

  // Debug logging
  console.log('User Profile:', userProfile)
  console.log('Is Manager:', isManager)

  // Fetch company name and base location
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!userProfile?.companyId) return;

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

  // Subscribe to customers (managers see all, employees see assigned)
  useEffect(() => {
    if (!userProfile?.companyId) return

    if (isManager) {
      // Managers see all customers in their company (real-time subscription)
      const unsubscribeCustomers = subscribeToCustomers(userProfile.companyId, (customers) => {
        console.log('Manager: Customers updated via subscription:', customers.length);
        setCustomers(customers)
      })
      return () => unsubscribeCustomers()
    } else {
      // Employees: Use subscription for real-time updates, then filter to assigned customers
      let isActive = true;

      const unsubscribeCustomers = subscribeToCustomers(userProfile.companyId, async (allCustomers) => {
        if (!isActive) return;

        try {
          // Import the service to get assigned customers
          // This includes both customers they created AND customers in their crew routes
          const { getEmployeeAssignedCustomers } = await import('@/lib/route-service');
          const assignedCustomers = await getEmployeeAssignedCustomers(userProfile.companyId, userProfile.id);

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
  }, [userProfile, isManager])

  // Subscribe to users (for manager view)
  useEffect(() => {
    if (!isManager || !userProfile?.companyId) return

    const unsubscribeUsers = subscribeToUsers(userProfile.companyId, (users) => {
      setUsers(users)
    })

    return () => unsubscribeUsers()
  }, [isManager, userProfile])

  // Generate routes for today and tomorrow
  useEffect(() => {
    if (!userProfile?.companyId) return

    const generateRoutes = async () => {
      try {
        const today = new Date()
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const todayRoutes = await generateOptimalRoutes(userProfile.companyId, today)
        const tomorrowRoutes = await generateOptimalRoutes(userProfile.companyId, tomorrow)
        
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
  }, [userProfile, customers, users, isManager, toast])

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

  // Handle adding new customer
  const handleAddCustomer = async (data: any) => {
    try {
      if (!userProfile?.companyId) {
        throw new Error('User company ID not found');
      }

      const newCustomer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId: userProfile.companyId, // REQUIRED: Multi-tenant isolation
        name: data.name,
        address: data.address,
        lat: Number(data.coordinates?.lat) || 0,
        lng: Number(data.coordinates?.lng) || 0,
        notes: data.notes || '',
        billingInfo: {},
        status: 'active',
        services: [{
          id: Date.now().toString(),
          type: data.serviceType,
          description: `${data.serviceType} service`,
          price: 0,
          scheduledDate: new Date() as any,
          status: 'scheduled',
        }],
        createdBy: userProfile?.id || '',
        servicePreferences: {
          preferredDays: data.servicePreferences.preferredDays,
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
      
      await updateDocument('customers', editingCustomer.id, {
        name: data.name,
        address: data.address,
        lat: Number(data.coordinates?.lat || editingCustomer.lat),
        lng: Number(data.coordinates?.lng || editingCustomer.lng),
        notes: data.notes || '',
        services: [{
          id: editingCustomer.services[0]?.id || Date.now().toString(),
          type: data.serviceType,
          description: `${data.serviceType} service`,
          price: editingCustomer.services[0]?.price || 0,
          scheduledDate: editingCustomer.services[0]?.scheduledDate || new Date() as any,
          status: editingCustomer.services[0]?.status || 'scheduled',
        }],
        servicePreferences: {
          preferredDays: data.servicePreferences.preferredDays,
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
      const userId = await createDocument('users', {
        companyId: userProfile.companyId, // REQUIRED: Multi-tenant isolation
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        title: data.title || null,
        notes: data.notes || '',
        schedule: data.schedule,
        status: 'available',
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

  // Navigation bar component
  const renderNavigationBar = () => (
    <div className="flex w-full bg-background border-t">
      <button
        onClick={() => setActiveView('customers')}
        className={`flex-1 py-3 px-4 text-center transition-colors ${
          activeView === 'customers' 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-muted'
        }`}
      >
        Customers
      </button>
      <button
        onClick={() => setActiveView('employees')}
        className={`flex-1 py-3 px-4 text-center transition-colors ${
          activeView === 'employees' 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-muted'
        }`}
      >
        Employees
      </button>
      <button
        onClick={() => setActiveView('crews')}
        className={`flex-1 py-3 px-4 text-center transition-colors ${
          activeView === 'crews' 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-muted'
        }`}
      >
        Crews
      </button>
    </div>
  )

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
      {/* Employee Join Instructions */}
      <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50 text-blue-900">
        <div className="flex items-start gap-3">
          <UserIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold mb-1">How to add employees:</p>
            <p className="text-sm mb-2">
              Employees can join by signing up with your company name:
            </p>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Share your company name: <span className="font-semibold bg-white px-2 py-0.5 rounded">{companyName || 'Loading...'}</span></li>
              <li>Have them sign up and select "Employee" role</li>
              <li>They enter your exact company name to join</li>
            </ol>
          </div>
        </div>
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
      </div>
    </div>
  )

  // Render crews view
  const renderCrewsView = () => {
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
          {/* Add New Crew Card */}
          <div 
            onClick={() => setIsAddCrewSheetOpen(true)}
            className="p-4 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary hover:text-primary transition-all bg-secondary/50 flex flex-col items-center justify-center text-center"
          >
            <Building2 className="w-10 h-10 mb-2" />
            <p className="font-semibold">Add New Crew</p>
          </div>

          {/* Crew information */}
          {crewsList.map((crew) => (
            <div
              key={crew.crewId}
              className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => {
                setEditingCrew(crew);
                setIsAddCrewSheetOpen(true);
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Crew {crew.crewId}</h3>
                  <p className="text-sm text-muted-foreground">
                    {crew.members.length} members
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Services: {crew.serviceTypes.join(', ')}
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
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isManager) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col h-svh bg-background text-foreground font-body">
          <Header />
          <main className="grid grid-rows-2 md:grid-rows-1 md:grid-cols-3 flex-grow overflow-hidden">
            <div className="md:col-span-2 h-full w-full">
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
            </div>
            <div 
              className="md:col-span-1 flex flex-col overflow-hidden touch-pan-y"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeView === 'customers' && renderCustomersView()}
                {activeView === 'employees' && renderEmployeesView()}
                {activeView === 'crews' && renderCrewsView()}
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-center p-4 border-t flex-shrink-0 bg-background">
                <div className="flex items-center w-full space-x-2">
                  <button
                    onClick={() => setActiveView('customers')}
                    className={`h-4 flex-1 rounded-full transition-colors ${activeView === 'customers' ? 'bg-primary' : 'bg-muted'} hover:opacity-80`}
                  />
                  <button
                    onClick={() => setActiveView('employees')}
                    className={`h-4 flex-1 rounded-full transition-colors ${activeView === 'employees' ? 'bg-primary' : 'bg-muted'} hover:opacity-80`}
                  />
                  <button
                    onClick={() => setActiveView('crews')}
                    className={`h-4 flex-1 rounded-full transition-colors ${activeView === 'crews' ? 'bg-primary' : 'bg-muted'} hover:opacity-80`}
                  />
                </div>
              </div>
            </div>
          </main>

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
          />

          {/* Crew Popup */}
          <CrewPopup
            open={isCrewPopupOpen}
            onOpenChange={setIsCrewPopupOpen}
            route={selectedRoute}
            employees={users}
          />
        </div>
      </ProtectedRoute>
    )
  }

  // Employee view (customer management only)
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-svh bg-background text-foreground font-body">
        <Header />
        <main className="grid grid-rows-2 md:grid-rows-1 md:grid-cols-3 flex-grow overflow-hidden">
          <div className="md:col-span-2 h-full w-full">
            <RouteDisplay
              customers={customers}
              employees={users.filter(user => user.role === 'employee' || user.role === 'manager')}
              routes={routes}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={handleSelectCustomer}
              baseLocation={baseLocation}
              apiKey={googleMapsConfig.apiKey}
            />
          </div>
          <div className="md:col-span-1 flex flex-col overflow-hidden">
            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {renderCustomersView()}
            </div>
          </div>
        </main>

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
      </div>
    </ProtectedRoute>
  )
}
