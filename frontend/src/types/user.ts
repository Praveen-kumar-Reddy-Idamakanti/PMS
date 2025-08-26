export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  HR = 'hr',
  TEAM_LEADER = 'team_leader',
  EMPLOYEE = 'employee',
  INTERN = 'intern'
}

export interface User {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId: string;
}

export const rolePermissions = {
  [UserRole.SUPER_ADMIN]: [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.HR,
    UserRole.TEAM_LEADER,
    UserRole.EMPLOYEE,
    UserRole.INTERN
  ],
  [UserRole.ADMIN]: [
    UserRole.ADMIN,
    UserRole.HR,
    UserRole.TEAM_LEADER,
    UserRole.EMPLOYEE,
    UserRole.INTERN
  ],
  [UserRole.HR]: [
    UserRole.TEAM_LEADER,
    UserRole.EMPLOYEE,
    UserRole.INTERN
  ],
  [UserRole.TEAM_LEADER]: [
    UserRole.EMPLOYEE,
    UserRole.INTERN
  ],
  [UserRole.EMPLOYEE]: [],
  [UserRole.INTERN]: []
};

export const canCreateUser = (currentUserRole: UserRole, targetRole: UserRole): boolean => {
  const allowedRoles = rolePermissions[currentUserRole] || [];
  return allowedRoles.includes(targetRole);
};
