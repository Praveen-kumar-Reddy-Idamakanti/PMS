const { ForbiddenError } = require('../utils/error');

// Normalize role name by removing spaces and converting to lowercase
const normalizeRole = (role) => {
  return role.toLowerCase().replace(/\s+/g, '');
};

const checkRole = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        throw new ForbiddenError('Access denied. No user role found.');
      }

      if (!Array.isArray(allowedRoles)) {
        allowedRoles = [allowedRoles];
      }

      const userRole = normalizeRole(req.user.role);
      const hasAccess = allowedRoles.some(role => 
        normalizeRole(role) === userRole
      );

      if (!hasAccess) {
        throw new ForbiddenError(`Access denied. Requires one of these roles: ${allowedRoles.join(', ')}`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { checkRole };
