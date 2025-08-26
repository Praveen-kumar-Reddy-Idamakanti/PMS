/**
 * User roles and their permissions
 * Each role has a level where higher numbers have more permissions
 */

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  TEAM_LEADER: 'team_leader',
  MEMBER: 'member',
  GUEST: 'guest',
};

// Role hierarchy - higher number means more permissions
const ROLE_LEVELS = {
  [ROLES.SUPER_ADMIN]: 100,
  [ROLES.ADMIN]: 90,
  [ROLES.MANAGER]: 80,
  [ROLES.TEAM_LEADER]: 70,
  [ROLES.MEMBER]: 50,
  [ROLES.GUEST]: 10,
};

/**
 * Check if a user has the required role or higher
 * @param {string} userRole - The user's role
 * @param {string} requiredRole - The minimum required role
 * @returns {boolean} True if user has required role or higher
 */
const hasRole = (userRole, requiredRole) => {
  const userLevel = ROLE_LEVELS[userRole] || 0;
  const requiredLevel = ROLE_LEVELS[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

/**
 * Check if a user has any of the specified roles
 * @param {string} userRole - The user's role
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} True if user has any of the allowed roles
 */
const hasAnyRole = (userRole, allowedRoles = []) => {
  if (!allowedRoles.length) return true;
  return allowedRoles.some(role => userRole === role);
};

/**
 * Get all roles at or above the specified role
 * @param {string} minRole - The minimum role level to include
 * @returns {string[]} Array of role names
 */
const getRolesAtOrAbove = (minRole) => {
  const minLevel = ROLE_LEVELS[minRole] || 0;
  return Object.entries(ROLE_LEVELS)
    .filter(([_, level]) => level >= minLevel)
    .map(([role]) => role);
};

module.exports = {
  ROLES,
  ROLE_LEVELS,
  hasRole,
  hasAnyRole,
  getRolesAtOrAbove,
};
