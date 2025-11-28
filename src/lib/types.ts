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

  // Timing analytics
  driveTime?: number; // Minutes driving to this stop
  workTime?: number; // Minutes working at this stop
  notes?: string; // Employee notes per stop
  pausedAt?: Date; // If stop was paused
  resumedAt?: Date; // If stop was resumed
  
  // Employee hours clocking
  clockInTime?: Date; // When employee clocked in at this location
  clockOutTime?: Date; // When employee clocked out at this location
  totalHoursAtLocation?: number; // Calculated total hours worked at location (in hours)
};

// Schedule status types
export type ScheduleStatus = {
  status: 'on_schedule' | 'ahead' | 'behind';
  minutesDelta: number; // Positive = behind, negative = ahead
  message: string;
  estimatedFinishTime: Date;
  stopsRemaining: number;

  // Time breakdown
  totalDriveTime: number; // minutes
  totalWorkTime: number; // minutes
  totalBreakTime: number; // minutes
};

// Time breakdown analytics
export type TimeBreakdown = {
  driveTime: number; // Total minutes driving
  workTime: number; // Total minutes at customer locations
  breakTime: number; // Total minutes on break
  idleTime: number; // Unexplained gaps

  // Per-stop details
  stopAnalytics: StopAnalytics[];
};

export type StopAnalytics = {
  customerId: string;
  customerName: string;
  workDuration: number; // Minutes at this stop
  driveDuration: number; // Drive time to reach this stop
  efficiency: number; // work time / total time ratio
};

// Route metrics for historical tracking
export type RouteMetrics = {
  id: string;
  companyId: string;
  crewId: string;
  routeId: string;
  date: Date | { seconds: number; nanoseconds: number };

  // Aggregate metrics
  totalDriveTime: number;
  totalWorkTime: number;
  totalBreakTime: number;
  efficiency: number; // 0-1 ratio

  // Per-stop breakdown
  stopMetrics: {
    customerId: string;
    driveTime: number;
    workTime: number;
    efficiency: number;
  }[];

  // Metadata
  recordedAt: Date | { seconds: number; nanoseconds: number };
};
