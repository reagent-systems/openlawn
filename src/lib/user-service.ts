import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User } from './firebase-types';

// Get ALL users across all companies (admin only)
export const getAllUsers = async (): Promise<User[]> => {
  const q = query(collection(db, 'users'), orderBy('name'));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

// Get all users for a company
export const getUsers = async (companyId: string): Promise<User[]> => {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', companyId),
    orderBy('name')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

// Get users by role within a company
export const getUsersByRole = async (companyId: string, role: User['role']): Promise<User[]> => {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', companyId),
    where('role', '==', role),
    orderBy('name')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

// Get users by crew ID within a company
export const getUsersByCrew = async (companyId: string, crewId?: string): Promise<Map<string, User[]>> => {
  const crews = new Map<string, User[]>();

  if (crewId) {
    // Get specific crew
    const q = query(
      collection(db, 'users'),
      where('companyId', '==', companyId),
      where('crewId', '==', crewId),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    const crewMembers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];

    crews.set(crewId, crewMembers);
  } else {
    // Get all crews for this company
    const q = query(
      collection(db, 'users'),
      where('companyId', '==', companyId),
      where('crewId', '!=', null),
      orderBy('crewId'),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.docs.forEach(doc => {
      const user = { id: doc.id, ...doc.data() } as User;
      if (user.crewId) {
        if (!crews.has(user.crewId)) {
          crews.set(user.crewId, []);
        }
        crews.get(user.crewId)!.push(user);
      }
    });
  }

  return crews;
};

// Get available crews (crews with active members) within a company
export const getAvailableCrews = async (companyId: string): Promise<Map<string, User[]>> => {
  const crews = await getUsersByCrew(companyId);
  const availableCrews = new Map<string, User[]>();

  crews.forEach((crewMembers, crewId) => {
    const activeMembers = crewMembers.filter(member =>
      member.status === 'available' || member.status === 'busy'
    );

    if (activeMembers.length > 0) {
      availableCrews.set(crewId, activeMembers);
    }
  });

  return availableCrews;
};

// Create a new crew (creates a crew leader user)
export const createCrew = async (crewData: {
  name: string;
  description?: string;
  leaderId: string;
  services?: { serviceType: string; days: string[]; isActive: boolean }[];
  vehicle?: { type: string; make: string; model: string; year: number; licensePlate?: string };
}): Promise<string> => {
  // Generate a unique crew ID
  const crewId = `crew_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Update the leader user with crew information
  const leaderRef = doc(db, 'users', crewData.leaderId);
  await updateDoc(leaderRef, {
    crewId,
    crewName: crewData.name,
    crewDescription: crewData.description,
    crewServices: crewData.services || [],
    crewVehicle: crewData.vehicle,
    updatedAt: Timestamp.now(),
  });
  
  return crewId;
};

// Add user to crew
export const addUserToCrew = async (userId: string, crewId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    crewId,
    updatedAt: Timestamp.now(),
  });
};

// Remove user from crew
export const removeUserFromCrew = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    crewId: null,
    updatedAt: Timestamp.now(),
  });
};

// Update crew information
export const updateCrew = async (companyId: string, crewId: string, updates: {
  name?: string;
  description?: string;
  services?: { serviceType: string; days: string[]; isActive: boolean }[];
  vehicle?: { type: string; make: string; model: string; year: number; licensePlate?: string };
}): Promise<void> => {
  // Get all crew members
  const crewMembers = await getUsersByCrew(companyId, crewId);
  const members = crewMembers.get(crewId) || [];

  // Update all crew members with new crew information
  const batch = writeBatch(db);

  members.forEach(member => {
    const userRef = doc(db, 'users', member.id);
    batch.update(userRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  });

  await batch.commit();
};

// Delete crew (remove crewId from all members)
export const deleteCrew = async (companyId: string, crewId: string): Promise<void> => {
  const crewMembers = await getUsersByCrew(companyId, crewId);
  const members = crewMembers.get(crewId) || [];

  const batch = writeBatch(db);

  members.forEach(member => {
    const userRef = doc(db, 'users', member.id);
    batch.update(userRef, {
      crewId: null,
      crewName: null,
      crewDescription: null,
      crewServices: null,
      crewVehicle: null,
      updatedAt: Timestamp.now(),
    });
  });

  await batch.commit();
};

// Get crew information
export const getCrewInfo = async (companyId: string, crewId: string): Promise<{
  id: string;
  name: string;
  description?: string;
  members: User[];
  services: { serviceType: string; days: string[]; isActive: boolean }[];
  vehicle?: { type: string; make: string; model: string; year: number; licensePlate?: string };
} | null> => {
  const crewMembers = await getUsersByCrew(companyId, crewId);
  const members = crewMembers.get(crewId) || [];

  if (members.length === 0) return null;

  // Get crew info from the first member (they should all have the same crew info)
  const firstMember = members[0];

  return {
    id: crewId,
    name: firstMember.crewName || 'Unnamed Crew',
    description: firstMember.crewDescription,
    members,
    services: firstMember.crewServices || [],
    vehicle: firstMember.crewVehicle,
  };
};

// Real-time listeners
export const subscribeToUsers = (
  companyId: string,
  callback: (users: User[]) => void
) => {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', companyId),
    orderBy('name')
  );
  return onSnapshot(q, (querySnapshot) => {
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
    callback(users);
  });
};

export const subscribeToAllUsers = (
  callback: (users: User[]) => void
) => {
  const q = query(collection(db, 'users'), orderBy('name'));
  return onSnapshot(q, (querySnapshot) => {
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
    callback(users);
  });
};

export const subscribeToCrewMembers = (
  companyId: string,
  crewId: string,
  callback: (members: User[]) => void
) => {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', companyId),
    where('crewId', '==', crewId),
    orderBy('name')
  );
  return onSnapshot(q, (querySnapshot) => {
    const members = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
    callback(members);
  });
};

// Get pending users for a company (awaiting manager approval)
export const getPendingUsers = async (companyId: string): Promise<User[]> => {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', companyId),
    where('accountStatus', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
};

// Subscribe to pending users for real-time updates
export const subscribeToPendingUsers = (
  companyId: string,
  callback: (users: User[]) => void
) => {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', companyId),
    where('accountStatus', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (querySnapshot) => {
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
    callback(users);
  });
};

// Approve a pending user
export const approveUser = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    accountStatus: 'active',
    updatedAt: Timestamp.now(),
  });
};

// Reject a pending user (sets status to disabled)
export const rejectUser = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    accountStatus: 'disabled',
    updatedAt: Timestamp.now(),
  });
}; 