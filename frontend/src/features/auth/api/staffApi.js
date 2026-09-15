import { getCsrfToken, clearCsrfToken } from '../../../shared/security/csrfClient';

export class StaffApiError extends Error {
  constructor(status, message, fieldErrors = {}, error = null, raw = null) {
    super(message || `Staff API error (${status})`);
    this.name = 'StaffApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
    this.raw = raw;
  }
}

async function request(endpoint, options = {}, body = null) {
  const config = {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  const method = (config.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isMutating) {
    let csrf;
    try {
      csrf = await getCsrfToken();
    } catch (err) {
      throw new StaffApiError(
        err.status || 0,
        err.message || 'Unable to obtain CSRF token for request',
        {},
        'CsrfError',
        err
      );
    }
    config.headers[csrf.headerName] = csrf.token;
  }

  if (body !== undefined && body !== null) {
    config.body = JSON.stringify(body);
    config.headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (err) {
    throw new StaffApiError(
      0,
      err.message || 'Unable to communicate with the authentication service. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 403) {
    clearCsrfToken();
  }

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorBody = typeof data === 'object' && data !== null ? data : {};
    const message =
      errorBody.message ||
      (typeof data === 'string' && data) ||
      response.statusText ||
      'Operation failed';
    const fieldErrors = errorBody.fieldErrors || {};
    const errorName = errorBody.error || response.statusText || 'Error';
    throw new StaffApiError(response.status, message, fieldErrors, errorName, data);
  }

  return data;
}

/**
 * Fetch all staff accounts (Administrator only).
 */
export async function getAllStaff() {
  return request('/api/admin/staff', { method: 'GET' });
}

/**
 * Fetch a single staff account by ID (Administrator only).
 */
export async function getStaffById(id) {
  return request(`/api/admin/staff/${id}`, { method: 'GET' });
}

/**
 * Provision a new staff account (Administrator only).
 */
export async function provisionStaff(staffData) {
  return request('/api/admin/staff', { method: 'POST' }, staffData);
}

/**
 * Update existing staff account details (Administrator only).
 */
export async function updateStaff(id, updateData) {
  return request(`/api/admin/staff/${id}`, { method: 'PUT' }, updateData);
}

/**
 * Update staff active status (activate/deactivate) (Administrator only).
 */
export async function updateStaffStatus(id, active) {
  return request(`/api/admin/staff/${id}/status`, { method: 'PATCH' }, { active });
}
