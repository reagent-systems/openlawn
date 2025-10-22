export type ServiceType = 'push-mow' | 'edge' | 'blow' | 'detail' | 'riding-mow';

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Service type for embedded services in customer
export type Service = {
  id: string;
  type: string;
  description: string;
  price: number;
  scheduledDate: Date | { seconds: number; nanoseconds: number }; // Support both Date and Timestamp
  completedDate?: Date | { seconds: number; nanoseconds: number };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  photos?: string[];
  assignedCrew?: string;
};

// Legacy types for backward compatibility - these will be removed as we migrate
export type Customer = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  notes: string;
  serviceRequested?: ServiceType; // Optional for backward compatibility
  services?: Service[]; // New embedded services array
  servicePreferences: ServicePreferences;
  serviceHistory: ServiceRecord[];
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date | { seconds: number; nanoseconds: number }; // Support both Date and Timestamp
  updatedAt: Date | { seconds: number; nanoseconds: number }; // Support both Date and Timestamp
  createdBy?: string; // User ID who created this customer
  lastServiceDate?: Date | { seconds: number; nanoseconds: number };
  nextServiceDate?: Date | { seconds: number; nanoseconds: number };
};

export type ServicePreferences = {
  preferredDays: DayOfWeek[];
  preferredTimeRange: {
    start: string;
    end: string;
  };
  serviceFrequency: number | 'weekly' | 'biweekly' | 'monthly' | 'one-time'; // Supports both number (days) and string for backward compatibility
  specialInstructions?: string;
};

export type ServiceRecord = {
  id: string;
  date: Date | { seconds: number; nanoseconds: number }; // Support both Date and Timestamp
  managerId: string; // User ID who managed this service
  service?: string; // Optional for backward compatibility
  notes?: string;
  completedBy?: string; // Optional for backward compatibility
  crewId?: string;
  duration?: number;
  status?: 'completed' | 'in-progress' | 'cancelled' | 'no-show';
  beforePhotos?: string[]; // URLs to before photos
  afterPhotos?: string[]; // URLs to after photos
};

// Simple user profile type for backward compatibility
export type UserProfile = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'employee' | 'manager' | 'admin';
  crewId?: string;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date;
};

// Route type for backward compatibility
export type Route = {
  id: string;
  crewId: string;
  date: Date;
  stops: RouteStop[];
  status: 'pending' | 'in_progress' | 'completed';
  totalDistance: number;
  estimatedDuration: number;
  totalDuration?: number; // Total duration in minutes
};

export type RouteStop = {
  customerId: string;
  customerName: string;
  address: string;
  lat: number;
  lng: number;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  eta?: Date;
  estimatedArrival?: string; // Time in HH:MM format
  actualArrival?: Date;
  actualDeparture?: Date;
};
