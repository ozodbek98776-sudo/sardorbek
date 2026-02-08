/**
 * Role Constants and Permissions
 * Markazlashtirilgan role va permission tizimi
 */

const ROLES = {
  ADMIN: 'admin',
  CASHIER: 'cashier',
  HELPER: 'helper'
};

/**
 * Role-based permissions
 * Format: resource: [actions]
 */
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    products: ['create', 'read', 'update', 'delete', 'upload_images'],
    customers: ['create', 'read', 'update', 'delete'],
    receipts: ['create', 'read', 'update', 'delete', 'approve'],
    debts: ['create', 'read', 'update', 'delete', 'approve'],
    users: ['create', 'read', 'update', 'delete'],
    warehouses: ['create', 'read', 'update', 'delete'],
    categories: ['create', 'read', 'update', 'delete'],
    stats: ['read'],
    sales: ['create', 'read'],
    telegram: ['read', 'update'],
    orders: ['create', 'read', 'update', 'delete']
  },
  [ROLES.CASHIER]: {
    products: ['read'],
    customers: ['create', 'read'],
    receipts: ['create', 'read', 'approve'],
    debts: ['create', 'read', 'update'],
    users: [],
    warehouses: [],
    categories: ['read'],
    stats: [],
    sales: ['create', 'read'],
    telegram: [],
    orders: []
  },
  [ROLES.HELPER]: {
    products: ['read'],
    customers: ['create', 'read'],
    receipts: ['create', 'read'],
    debts: [],
    users: [],
    warehouses: [],
    categories: ['read'],
    stats: [],
    sales: [],
    telegram: [],
    orders: []
  }
};

/**
 * Role hierarchy (higher number = more permissions)
 */
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 3,
  [ROLES.CASHIER]: 2,
  [ROLES.HELPER]: 1
};

/**
 * Get all role values as array
 */
const ALL_ROLES = Object.values(ROLES);

/**
 * Check if role is valid
 */
function isValidRole(role) {
  return ALL_ROLES.includes(role);
}

/**
 * Check if user has permission
 */
function hasPermission(userRole, resource, action) {
  const permissions = ROLE_PERMISSIONS[userRole];
  if (!permissions) return false;
  
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions.includes(action);
}

/**
 * Check if role1 is higher than role2
 */
function isHigherRole(role1, role2) {
  return (ROLE_HIERARCHY[role1] || 0) > (ROLE_HIERARCHY[role2] || 0);
}

module.exports = {
  ROLES,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  ALL_ROLES,
  isValidRole,
  hasPermission,
  isHigherRole
};
