import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  QuerySnapshot, 
  DocumentData,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Customer, Service, ServiceRecord, DayOfWeek, CustomerPriority } from './firebase-types';

// Convert Firestore document to Customer
const convertFirestoreCustomer = (doc: DocumentData): Customer => {
  const data = doc.data();
  return {
    id: doc.id,
    companyId: data.companyId || '', // REQUIRED: Multi-tenant isolation
    name: data.name || '',
    address: data.address || '',
    lat: data.lat || 0,
    lng: data.lng || 0,
    notes: data.notes || '',
    billingInfo: data.billingInfo || {},
    status: data.status || 'active',
    services: data.services || [],
    lastServiceDate: data.lastServiceDate,
    nextServiceDate: data.nextServiceDate,
    createdBy: data.createdBy || '',
    servicePreferences: data.servicePreferences || {
      preferredDays: [],
      preferredTimeRange: { start: '08:00', end: '17:00' },
      serviceFrequency: 7
    },
    serviceHistory: data.serviceHistory || [],
    createdAt: data.createdAt || Timestamp.now(),
    updatedAt: data.updatedAt || Timestamp.now(),
  };
};

// Convert Customer to Firestore document
const convertToFirestoreCustomer = (customer: Customer) => {
  const data: any = {
    companyId: customer.companyId, // REQUIRED: Multi-tenant isolation
    name: customer.name,
    address: customer.address,
    lat: customer.lat,
    lng: customer.lng,
    notes: customer.notes,
    billingInfo: customer.billingInfo,
    status: customer.status,
    services: customer.services,
    createdBy: customer.createdBy,
    servicePreferences: customer.servicePreferences,
    serviceHistory: customer.serviceHistory,
    updatedAt: serverTimestamp(),
  };

  // Only include optional timestamp fields if they have values
  if (customer.lastServiceDate !== undefined) {
    data.lastServiceDate = customer.lastServiceDate;
  }
  if (customer.nextServiceDate !== undefined) {
    data.nextServiceDate = customer.nextServiceDate;
  }

  return data;
};

// Get all customers for a company
export const getCustomers = async (companyId: string): Promise<Customer[]> => {
  const customersRef = collection(db, 'customers');
  const q = query(customersRef, where('companyId', '==', companyId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(convertFirestoreCustomer);
};

// Get customers by user (created by) within a company
export const getCustomersByUser = async (userId: string, companyId: string): Promise<Customer[]> => {
  const customersRef = collection(db, 'customers');
  const q = query(
    customersRef,
    where('companyId', '==', companyId),
    where('createdBy', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(convertFirestoreCustomer);
};

// Get a single customer
export const getCustomer = async (id: string): Promise<Customer | null> => {
  const customerRef = doc(db, 'customers', id);
  const customerSnap = await getDoc(customerRef);
  
  if (customerSnap.exists()) {
    return convertFirestoreCustomer(customerSnap);
  }
  return null;
};

// Add a new customer
export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const customersRef = collection(db, 'customers');
  const docRef = await addDoc(customersRef, convertToFirestoreCustomer(customer as Customer));
  return docRef.id;
};

// Update a customer
export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<void> => {
  const customerRef = doc(db, 'customers', id);
  await updateDoc(customerRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// Delete a customer
export const deleteCustomer = async (id: string): Promise<void> => {
  const customerRef = doc(db, 'customers', id);
  await deleteDoc(customerRef);
};

// Subscribe to customers for a company
export const subscribeToCustomers = (
  companyId: string,
  callback: (customers: Customer[]) => void
): (() => void) => {
  const customersRef = collection(db, 'customers');
  const q = query(
    customersRef,
    where('companyId', '==', companyId),
    orderBy('name')
  );
  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const customers = querySnapshot.docs.map(convertFirestoreCustomer);
    callback(customers);
  });
};

// Subscribe to customers by user within a company
export const subscribeToCustomersByUser = (
  userId: string,
  companyId: string,
  callback: (customers: Customer[]) => void
): (() => void) => {
  const customersRef = collection(db, 'customers');
  const q = query(
    customersRef,
    where('companyId', '==', companyId),
    where('createdBy', '==', userId),
    orderBy('name')
  );
  return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
    const customers = querySnapshot.docs.map(convertFirestoreCustomer);
    callback(customers);
  });
};

// Add service to customer
export const addServiceToCustomer = async (
  customerId: string, 
  service: Omit<Service, 'id'>
): Promise<void> => {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error('Customer not found');
  
  const newService: Service = {
    ...service,
    id: Date.now().toString(), // Simple ID generation
  };
  
  await updateCustomer(customerId, {
    services: [...customer.services, newService],
  });
};

// Update service for customer
export const updateServiceForCustomer = async (
  customerId: string,
  serviceId: string,
  updates: Partial<Service>
): Promise<void> => {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error('Customer not found');
  
  const updatedServices = customer.services.map(service =>
    service.id === serviceId ? { ...service, ...updates } : service
  );
  
  await updateCustomer(customerId, { services: updatedServices });
};

// Remove service from customer
export const removeServiceFromCustomer = async (
  customerId: string,
  serviceId: string
): Promise<void> => {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error('Customer not found');
  
  const filteredServices = customer.services.filter(service => service.id !== serviceId);
  await updateCustomer(customerId, { services: filteredServices });
};

// Add service record to customer history
export const addServiceRecord = async (
  customerId: string,
  serviceRecord: Omit<ServiceRecord, 'id'>
): Promise<void> => {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error('Customer not found');
  
  const newServiceRecord: ServiceRecord = {
    ...serviceRecord,
    id: Date.now().toString(),
  };
  
  await updateCustomer(customerId, {
    serviceHistory: [...customer.serviceHistory, newServiceRecord],
    lastServiceDate: serviceRecord.date,
  });
};

// Get customers needing service (for route optimization)
export const getCustomersNeedingService = async (companyId: string, date: Date): Promise<Customer[]> => {
  const fiveDaysAgo = new Date(date);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const customersRef = collection(db, 'customers');

  // Get all active customers for this company
  const allCustomersQuery = query(
    customersRef,
    where('companyId', '==', companyId),
    where('status', '==', 'active')
  );

  const allCustomersSnapshot = await getDocs(allCustomersQuery);
  const allCustomers = allCustomersSnapshot.docs.map(convertFirestoreCustomer);

  // Filter customers that need service (null lastServiceDate or older than 5 days)
  const customersNeedingService = allCustomers.filter(customer => {
    if (!customer.lastServiceDate) {
      return true; // Include customers with no service history
    }
    const daysSinceLastService = Math.floor((date.getTime() - customer.lastServiceDate.toDate().getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceLastService >= 5;
  });

  return customersNeedingService;
};

// Calculate customer priorities for route optimization
export const calculateCustomerPriorities = async (companyId: string, date: Date): Promise<CustomerPriority[]> => {
  const customers = await getCustomersNeedingService(companyId, date);
  
  return customers.map(customer => {
    const daysSinceLastService = customer.lastServiceDate 
      ? Math.floor((date.getTime() - customer.lastServiceDate.toDate().getTime()) / (1000 * 60 * 60 * 24))
      : 30; // Default to 30 days if no last service
    
    // Extract zip code from address (simple implementation)
    const zipCode = customer.address.match(/\b\d{5}\b/)?.[0] || '';
    
    // Calculate priority score
    let priority = daysSinceLastService * 10; // Base priority
    
    // Bonus for customer preferences matching current day
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
    if (customer.servicePreferences.preferredDays.includes(dayOfWeek)) {
      priority += 20;
    }
    
    // Bonus for service type complexity
    if (customer.services.length > 0) {
      priority += customer.services.length * 5;
    }
    
    return {
      customerId: customer.id,
      priority: Math.min(priority, 100), // Cap at 100
      factors: {
        daysSinceLastService,
        customerPreferences: customer.servicePreferences,
        serviceType: customer.services[0]?.type || 'general',
        location: { 
          lat: customer.lat, 
          lng: customer.lng, 
          zipCode 
        },
      },
    };
  });
};

// Search customers within a company
export const searchCustomers = async (companyId: string, searchTerm: string): Promise<Customer[]> => {
  const customers = await getCustomers(companyId);
  return customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.services.some(service =>
      service.type.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
};

// Photo management for services
/**
 * Add photo URLs to a service
 */
export const addPhotosToService = async (
  customerId: string,
  serviceId: string,
  photoUrls: string[]
): Promise<void> => {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error('Customer not found');

  const updatedServices = customer.services.map(service => {
    if (service.id === serviceId) {
      return {
        ...service,
        photos: [...(service.photos || []), ...photoUrls],
      };
    }
    return service;
  });

  await updateCustomer(customerId, { services: updatedServices });
};

/**
 * Remove photo URL from a service
 */
export const removePhotoFromService = async (
  customerId: string,
  serviceId: string,
  photoUrl: string
): Promise<void> => {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error('Customer not found');

  const updatedServices = customer.services.map(service => {
    if (service.id === serviceId) {
      return {
        ...service,
        photos: (service.photos || []).filter(url => url !== photoUrl),
      };
    }
    return service;
  });

  await updateCustomer(customerId, { services: updatedServices });
};

/**
 * Get all photos for a service
 */
export const getServicePhotos = async (
  customerId: string,
  serviceId: string
): Promise<string[]> => {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error('Customer not found');

  const service = customer.services.find(s => s.id === serviceId);
  return service?.photos || [];
};

/**
 * Mark service as completed with photos
 */
export const completeServiceWithPhotos = async (
  customerId: string,
  serviceId: string,
  beforePhotos: string[],
  afterPhotos: string[],
  notes?: string
): Promise<void> => {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error('Customer not found');

  const service = customer.services.find(s => s.id === serviceId);
  if (!service) throw new Error('Service not found');

  // Update service status
  await updateServiceForCustomer(customerId, serviceId, {
    status: 'completed',
    completedDate: Timestamp.now(),
    notes: notes || service.notes,
    photos: [...beforePhotos, ...afterPhotos],
  });

  // Add to service history
  await addServiceRecord(customerId, {
    date: Timestamp.now(),
    managerId: customer.createdBy,
    beforePhotos,
    afterPhotos,
    notes: notes || '',
    status: 'completed',
  });
}; 