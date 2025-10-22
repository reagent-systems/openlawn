import { Timestamp } from 'firebase/firestore';

// Base interface for all documents
export interface BaseDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Company model for multi-tenant support
export interface Company extends BaseDocument {
  name: string; // Company name
  owner: string; // User ID of the company owner (admin)
  industry?: string; // e.g., "Lawn Care", "Landscaping"
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string; // URL to company logo
  timezone?: string; // e.g., "America/New_York"
  baseLocation?: { // Home base where crews start and end their day
    lat: number;
    lng: number;
    address: string;
  };
  settings?: {
    autoScheduling?: boolean;
    maxCustomersPerRoute?: number; // Default 12
    serviceRadius?: number; // miles
    businessHours?: {
      [day: string]: { start: string; end: string; open: boolean };
    };
  };
  subscription?: {
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'trial' | 'suspended' | 'cancelled';
    startDate: Timestamp;
    endDate?: Timestamp;
    maxUsers?: number;
    maxCustomers?: number;
  };
  isActive: boolean;
}

// Updated User model with route optimization roles
export interface User extends BaseDocument {
  companyId: string; // REQUIRED: Company this user belongs to (multi-tenant isolation)
  name: string;
  email: string;
  phone?: string;
  role: 'employee' | 'manager' | 'admin';
  crewId?: string; // Crew assignment
  title?: string; // Optional title like "Lead", "Senior", etc.
  crewServiceTypes?: string[]; // Service types this crew handles (e.g., ["push-mow", "edge"])
  assignedManager?: string; // For employees assigned to a manager
  schedule?: {
    monday: { start: string; end: string; available: boolean };
    tuesday: { start: string; end: string; available: boolean };
    wednesday: { start: string; end: string; available: boolean };
    thursday: { start: string; end: string; available: boolean };
    friday: { start: string; end: string; available: boolean };
    saturday: { start: string; end: string; available: boolean };
    sunday: { start: string; end: string; available: boolean };
  };
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: Timestamp;
  };
  status: 'available' | 'busy' | 'offline';
  capabilities?: string[]; // Service types this user can handle
  region?: string; // Geographic area or zip code

  // Additional user profile fields
  displayName?: string; // Display name for the user
  photoURL?: string; // Profile photo URL
  isActive?: boolean; // Whether the user is active
  notes?: string; // Additional notes about the user

  // Crew management fields (replaces crews collection)
  crewName?: string; // Display name for the crew
  crewDescription?: string; // Optional crew description
  crewServices?: { // Services this crew provides
    serviceType: string;
    days: string[];
    isActive: boolean;
  }[];
  crewVehicle?: { // Vehicle information
    type: string;
    make: string;
    model: string;
    year: number;
    licensePlate?: string;
  };
}

// Service model (embedded in customers)
export interface Service {
  id: string;
  type: string;
  description: string;
  price: number;
  scheduledDate: Timestamp;
  completedDate?: Timestamp;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  photos?: string[]; // URLs to photos in Firebase Storage
  assignedCrew?: string;
}

// Service record for customer history
export interface ServiceRecord {
  id: string;
  date: Timestamp;
  managerId: string;
  beforePhotos: string[]; // Compressed URLs from Firebase Storage
  afterPhotos: string[]; // Compressed URLs from Firebase Storage
  notes: string;
  status: 'completed' | 'cancelled';
}

// Day of week type
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Enhanced Customer model with route optimization features
export interface Customer extends BaseDocument {
  companyId: string; // REQUIRED: Company this customer belongs to (multi-tenant isolation)
  name: string;
  address: string;
  lat: number;
  lng: number;
  notes: string;
  billingInfo: {
    email?: string;
    phone?: string;
    paymentMethod?: string;
  };
  status: 'active' | 'inactive' | 'pending';
  services: Service[]; // Embedded services array
  lastServiceDate?: Timestamp; // For 5-day rolling prioritization
  nextServiceDate?: Timestamp;
  createdBy: string; // User ID who created this customer
  
  // Enhanced fields for route optimization
  servicePreferences: {
    preferredDays: DayOfWeek[];
    preferredTimeRange: { start: string; end: string };
    serviceFrequency: number; // days between services
  };
  
  // Service history with photos
  serviceHistory: ServiceRecord[];
}

// Route optimization interfaces
export interface CustomerPriority {
  customerId: string;
  priority: number; // 1-100 based on multiple factors
  factors: {
    daysSinceLastService: number;
    customerPreferences: {
      preferredDays: DayOfWeek[];
      preferredTimeRange: { start: string; end: string };
    };
    serviceType: string;
    location: { lat: number; lng: number; zipCode: string };
  };
}

export interface CrewAvailability {
  crewId: string;
  managerId: string;
  employeeIds: string[];
  availability: {
    date: Date;
    startTime: string; // e.g., "08:00"
    endTime: string;   // e.g., "17:00"
    maxCustomers: 12;
    currentLocation?: { lat: number; lng: number };
  };
  capabilities: string[]; // service types they can handle
  region: string; // zip code or geographic area
}

export interface DailyRoute {
  companyId: string; // REQUIRED: Company this route belongs to (multi-tenant isolation)
  crewId: string;
  date: Date;
  customers: Customer[];
  optimizedPath: { lat: number; lng: number }[];
  estimatedDuration: number;
  totalDistance: number;
  trafficConditions?: any; // Traffic data from Google Maps API
} 