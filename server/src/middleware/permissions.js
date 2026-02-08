/**
 * Permission Middleware
 * Role-based access control
 */

const { ROLE_PERMISSIONS, ROLES } = require('../constants/roles');

/**
 * Check if user has specific permission for a resource
 * @param {string} resource - Resource name (products, customers, etc.)
 * @param {string} action - Action name (create, read, update, delete)
 */
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ 
        message: 'Avtorizatsiya talab qilinadi',
        code: 'UNAUTHORIZED'
      });
    }
    
    const permissions = ROLE_PERMISSIONS[userRole];
    
    if (!permissions) {
      return res.status(403).json({ 
        message: 'Noto\'g\'ri rol',
        code: 'INVALID_ROLE',
        userRole
      });
    }
    
    const resourcePermissions = permissions[resource];
    
    if (!resourcePermissions || !resourcePermissions.includes(action)) {
      return res.status(403).json({ 
        message: `${resource} uchun ${action} ruxsati yo'q`,
        code: 'PERMISSION_DENIED',
        required: `${resource}:${action}`,
        userRole
      });
    }
    
    next();
  };
};

/**
 * Check if user has any of the specified roles
 * @param {...string} roles - Role names
 */
const hasRole = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      return res.status(401).json({ 
        message: 'Avtorizatsiya talab qilinadi',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Ruxsat berilmagan',
        code: 'ROLE_DENIED',
        required: roles,
        userRole
      });
    }
    
    next();
  };
};

/**
 * Admin only middleware (shorthand)
 */
const adminOnly = hasRole(ROLES.ADMIN);

/**
 * Admin and Cashier middleware (shorthand)
 */
const adminOrCashier = hasRole(ROLES.ADMIN, ROLES.CASHIER);

module.exports = {
  checkPermission,
  hasRole,
  adminOnly,
  adminOrCashier
};
