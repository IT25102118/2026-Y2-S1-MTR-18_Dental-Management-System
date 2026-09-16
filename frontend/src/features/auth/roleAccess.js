export const STAFF_ROLES = Object.freeze([
  'ADMINISTRATOR',
  'RECEPTIONIST',
  'DENTIST',
  'DENTAL_ASSISTANT'
]);

export const BILLING_ROLES = Object.freeze(['ADMINISTRATOR', 'RECEPTIONIST']);

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function getDashboardPath(role) {
  if (role === 'PATIENT') {
    return '/patient/dashboard';
  }
  if (isStaffRole(role)) {
    return '/staff/dashboard';
  }
  return '/account';
}

export function isSafeInternalPath(target) {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//');
}

function isPathWithin(pathname, basePath) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

export function canRoleAccessPath(role, target) {
  if (!isSafeInternalPath(target)) {
    return false;
  }

  const pathname = target.split(/[?#]/, 1)[0];

  if (role === 'PATIENT') {
    return pathname === '/account' || pathname === '/patient/dashboard';
  }

  if (!isStaffRole(role) || isPathWithin(pathname, '/patient')) {
    return false;
  }

  if (isPathWithin(pathname, '/admin')) {
    return role === 'ADMINISTRATOR';
  }

  if (
    isPathWithin(pathname, '/billing') ||
    isPathWithin(pathname, '/invoices') ||
    isPathWithin(pathname, '/payments') ||
    isPathWithin(pathname, '/reports')
  ) {
    return BILLING_ROLES.includes(role);
  }

  return (
    pathname === '/account' ||
    pathname === '/staff/dashboard' ||
    isPathWithin(pathname, '/inventory') ||
    isPathWithin(pathname, '/clinical') ||
    isPathWithin(pathname, '/prescriptions')
  );
}
