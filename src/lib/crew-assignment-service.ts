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
  await updateDocument('users', userId, {
    crewId: assignment.crewId,
    crewServiceTypes: assignment.serviceTypes,
    title: assignment.title,
  });
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
export const getCrewMembers = async (crewId: string): Promise<User[]> => {
  const { getUsers } = await import('./user-service');
  const allUsers = await getUsers();
  return allUsers.filter(user => user.crewId === crewId);
};

/**
 * Get all crews (unique crewIds with their service types)
 */
export const getAllCrews = async (): Promise<Array<{
  crewId: string;
  serviceType: string;
  memberCount: number;
  manager?: User;
}>> => {
  const { getUsers } = await import('./user-service');
  const allUsers = await getUsers();
  
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