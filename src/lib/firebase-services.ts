import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Customer,
  User,
  DailyRoute,
  Service,
} from './firebase-types';

// Generic CRUD operations
export const createDocument = async <T extends { id?: string }>(
  collectionName: string,
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const now = Timestamp.now();
  const docData = {
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  
  const docRef = await addDoc(collection(db, collectionName), docData);
  return docRef.id;
};

export const updateDocument = async <T>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
};

export const deleteDocument = async (
  collectionName: string,
  id: string
): Promise<void> => {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};

export const getDocument = async <T>(
  collectionName: string,
  id: string
): Promise<T | null> => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

// Customer services
export const getCustomers = async (): Promise<Customer[]> => {
  const q = query(collection(db, 'customers'), orderBy('name'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Customer[];
};

export const getActiveCustomers = async (): Promise<Customer[]> => {
  const q = query(
    collection(db, 'customers'),
    where('status', '==', 'active'),
    orderBy('name')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Customer[];
};

export const createCustomer = async (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return createDocument('customers', data);
};

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<void> => {
  return updateDocument('customers', id, data);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  return deleteDocument('customers', id);
};

// Employee services - now using User type and users collection
export const getEmployees = async (): Promise<User[]> => {
  const q = query(collection(db, 'users'), orderBy('name'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

export const getAvailableEmployees = async (): Promise<User[]> => {
  const q = query(
    collection(db, 'users'),
    where('status', '==', 'available'),
    orderBy('name')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

export const createEmployee = async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return createDocument('users', data);
};

export const updateEmployee = async (id: string, data: Partial<User>): Promise<void> => {
  return updateDocument('users', id, data);
};

// Crew services - now handled through user-service.ts
// Crews are managed through the users collection with crewId field

// Route services
export const getRoutesForDate = async (date: Date): Promise<DailyRoute[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, 'routes'),
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('date')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as unknown as DailyRoute[];
};

export const createRoute = async (data: Omit<DailyRoute, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return createDocument('routes', data);
};

export const updateRoute = async (id: string, data: Partial<DailyRoute>): Promise<void> => {
  return updateDocument('routes', id, data);
};

// Service services
export const getServicesForCustomer = async (customerId: string): Promise<Service[]> => {
  const q = query(
    collection(db, 'services'),
    where('customerId', '==', customerId),
    orderBy('scheduledDate', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Service[];
};

export const createService = async (data: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return createDocument('services', data);
};

// Real-time listeners
export const subscribeToCustomers = (
  callback: (customers: Customer[]) => void
) => {
  const q = query(collection(db, 'customers'), orderBy('name'));
  return onSnapshot(q, (querySnapshot) => {
    const customers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Customer[];
    callback(customers);
  });
};

export const subscribeToEmployees = (
  callback: (employees: any[]) => void
) => {
  const q = query(collection(db, 'users'), orderBy('displayName'));
  return onSnapshot(q, (querySnapshot) => {
    const employees = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.displayName || data.email || 'Unknown',
        email: data.email,
        role: data.role || 'employee',
        status: data.isActive ? 'active' : 'inactive',
      };
    });
    callback(employees);
  });
};

export const subscribeToRoutes = (
  date: Date,
  callback: (routes: DailyRoute[]) => void
) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(
    collection(db, 'routes'),
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay)),
    orderBy('date')
  );

  return onSnapshot(q, (querySnapshot) => {
    const routes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as unknown as DailyRoute[];
    callback(routes);
  });
};

// Batch operations
export const batchUpdateCustomerStatus = async (
  customerIds: string[],
  status: Customer['status']
): Promise<void> => {
  const batch = writeBatch(db);
  
  customerIds.forEach(customerId => {
    const docRef = doc(db, 'customers', customerId);
    batch.update(docRef, {
      status,
      updatedAt: Timestamp.now(),
    });
  });
  
  await batch.commit();
};