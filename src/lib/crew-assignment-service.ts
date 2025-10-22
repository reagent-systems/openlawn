import { updateDocument } from './firebase-services';
import type { User } from './firebase-types';

export interface CrewAssignment {
  crewId: string;
  serviceTypes: string[];
  title?: string; // Optional title like "Lead", "Senior", etc.
}

/**
 * Assign a user to a crew with multiple service types
 */
export const assignUserToCrew = async (
  userId: string,
  assignment: CrewAssignment
): Promise<void> => {
  // Get the user's current data to check if they have a schedule
  const { getDoc, doc } = await import('firebase/firestore');
  const { getFirebaseDb } = await import('./firebase');
  const db = getFirebaseDb();
  if (!db) throw new Error('Firebase database not initialized');

  const userDoc = await getDoc(doc(db, 'users', userId));
  const currentUserData = userDoc.data();

  const updates: Record<string, any> = {
    crewId: assignment.crewId,
    crewServiceTypes: assignment.serviceTypes,
  };

  // Only include title if it's defined
  if (assignment.title !== undefined) {
    updates.title = assignment.title;
  }

  // Set default schedule if user doesn't have one (8am-5pm, Monday-Friday)
  if (!currentUserData?.schedule) {
    updates.schedule = {
      monday: { start: '08:00', end: '17:00' },
      tuesday: { start: '08:00', end: '17:00' },
      wednesday: { start: '08:00', end: '17:00' },
      thursday: { start: '08:00', end: '17:00' },
      friday: { start: '08:00', end: '17:00' },
      saturday: { start: '08:00', end: '17:00' },
      sunday: { start: '08:00', end: '17:00' },
    };
  }

  await updateDocument('users', userId, updates);
};

/**
 * Remove a user from their current crew
 */
export const removeUserFromCrew = async (userId: string): Promise<void> => {
  await updateDocument('users', userId, {
    crewId: null,
    crewServiceTypes: null,
    title: null,
  });
};

/**
 * Update a user's title within their crew
 */
export const updateUserTitle = async (
  userId: string, 
  title: string
): Promise<void> => {
  await updateDocument('users', userId, {
    title,
  });
};

/**
 * Get all users in a specific crew
 */
export const getCrewMembers = async (companyId: string, crewId: string): Promise<User[]> => {
  const { getUsers } = await import('./user-service');
  const allUsers = await getUsers(companyId);
  return allUsers.filter(user => user.crewId === crewId);
};

/**
 * Get all crews (unique crewIds with their service types)
 */
export const getAllCrews = async (companyId: string): Promise<Array<{
  crewId: string;
  serviceType: string;
  memberCount: number;
  manager?: User;
}>> => {
  const { getUsers } = await import('./user-service');
  const allUsers = await getUsers(companyId);
  
  const crewMap = new Map<string, {
    crewId: string;
    serviceType: string;
    members: User[];
    manager?: User;
  }>();
  
  allUsers.forEach(user => {
    if (user.crewId) {
      if (!crewMap.has(user.crewId)) {
        crewMap.set(user.crewId, {
          crewId: user.crewId,
          serviceType: user.crewServiceTypes?.[0] || 'general',
          members: [],
          manager: undefined
        });
      }
      
      const crew = crewMap.get(user.crewId)!;
      crew.members.push(user);
      
      if (user.role === 'manager') {
        crew.manager = user;
      }
    }
  });
  
  return Array.from(crewMap.values()).map(crew => ({
    crewId: crew.crewId,
    serviceType: crew.serviceType,
    memberCount: crew.members.length,
    manager: crew.manager,
  }));
};

/**
 * Get available service types for crew assignment
 */
export const getAvailableServiceTypes = (): string[] => {
  return [
    'lawn-mowing',
    'edging',
    'blowing',
    'detail',
    'riding-mow',
    'fertilization',
    'weed-control',
    'irrigation',
    'tree-trimming',
    'general'
  ];
};

/**
 * Validate crew assignment
 */
export const validateCrewAssignment = (
  userId: string,
  assignment: CrewAssignment
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!assignment.crewId) {
    errors.push('Crew ID is required');
  }

  if (!assignment.serviceTypes || assignment.serviceTypes.length === 0) {
    errors.push('At least one service type is required');
  }

  const validServiceTypes = getAvailableServiceTypes();
  if (assignment.serviceTypes) {
    const invalidTypes = assignment.serviceTypes.filter(type => !validServiceTypes.includes(type));
    if (invalidTypes.length > 0) {
      errors.push(`Invalid service types: ${invalidTypes.join(', ')}. Must be one of: ${validServiceTypes.join(', ')}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}; 