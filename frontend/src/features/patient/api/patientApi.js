/**
 * API client for DentCare MF-01 Patient Records Management.
 * Communicates with backend /api/patients endpoints.
 */

import { getCsrfToken } from '../../auth/api/authApi';

export class PatientApiError extends Error {
  constructor(status, message, fieldErrors = {}, error = null, raw = null) {
    super(message || `Patient API error (${status})`);
    this.name = 'PatientApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
    this.raw = raw;
  }
}

/**
 * Normalizes Spring PageImpl JSON response to a safe predictable shape.
 */
export function normalizePatientPage(pageData = {}) {
  const content = Array.isArray(pageData?.content) ? pageData.content : [];
  const number = typeof pageData?.number === 'number' ? pageData.number : 0;
  const size = typeof pageData?.size === 'number' ? pageData.size : content.length;
  const totalPages = typeof pageData?.totalPages === 'number' ? pageData.totalPages : (content.length > 0 ? 1 : 0);
  const totalElements = typeof pageData?.totalElements === 'number' ? pageData.totalElements : content.length;
  const first = typeof pageData?.first === 'boolean' ? pageData.first : (number === 0);
  const last = typeof pageData?.last === 'boolean' ? pageData.last : (number >= totalPages - 1);
  const empty = typeof pageData?.empty === 'boolean' ? pageData.empty : (content.length === 0);

  return {
    content,
    number,
    size,
    totalPages,
    totalElements,
    first,
    last,
    empty
  };
}

async function getCsrfHeaders() {
  try {
    const csrf = await getCsrfToken();
    if (csrf?.headerName && csrf?.token) {
      return { [csrf.headerName]: csrf.token };
    }
  } catch (err) {
    throw new PatientApiError(0, 'Unable to verify this request. Please refresh and try again.', {}, 'CsrfError');
  }
  throw new PatientApiError(0, 'Unable to verify this request. Please refresh and try again.', {}, 'CsrfError');
}

async function request(endpoint, options = {}) {
  const { body, headers = {}, method = 'GET', ...restOptions } = options;

  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  const csrfHeaders = isMutation ? await getCsrfHeaders() : {};

  const config = {
    method,
    credentials: 'same-origin',
    ...restOptions,
    headers: {
      Accept: 'application/json',
      ...csrfHeaders,
      ...headers
    }
  };

  if (body !== undefined && body !== null) {
    config.body = JSON.stringify(body);
    config.headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (err) {
    throw new PatientApiError(
      0,
      err.message || 'Unable to communicate with the patient records service. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
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
    const errorBody = (typeof data === 'object' && data !== null) ? data : {};
    const message = errorBody.message || response.statusText || 'Operation failed';
    const fieldErrors = errorBody.fieldErrors || {};
    const errorName = errorBody.error || response.statusText || 'Error';
    throw new PatientApiError(response.status, message, fieldErrors, errorName, data);
  }

  return data;
}

/**
 * Fetch paginated patient summaries with optional search and filters.
 */
export async function getPatients({
  search,
  active,
  gender,
  page = 0,
  size = 20,
  sort = 'lastName,asc'
} = {}) {
  const params = new URLSearchParams();

  if (typeof search === 'string' && search.trim() !== '') {
    params.append('search', search.trim());
  }

  if (active !== undefined && active !== null && active !== '') {
    params.append('active', String(active));
  }

  if (gender && gender !== 'ALL') {
    params.append('gender', gender);
  }

  if (page !== undefined && page !== null) {
    params.append('page', String(page));
  }

  if (size !== undefined && size !== null) {
    params.append('size', String(size));
  }

  if (sort) {
    params.append('sort', sort);
  }

  const queryString = params.toString();
  const url = queryString ? `/api/patients?${queryString}` : '/api/patients';
  const data = await request(url, { method: 'GET' });
  return normalizePatientPage(data);
}

/**
 * Fetch single patient details by ID.
 */
export async function getPatientById(id) {
  return request(`/api/patients/${id}`, { method: 'GET' });
}

/**
 * Register a new patient record.
 * Only sends fields defined in CreatePatientRequest.
 */
export async function createPatient(payload) {
  const body = {
    patientCode: payload.patientCode?.trim() || '',
    firstName: payload.firstName?.trim() || '',
    lastName: payload.lastName?.trim() || '',
    dateOfBirth: payload.dateOfBirth || null,
    gender: payload.gender || null,
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || '',
    addressLine1: payload.addressLine1?.trim() || null,
    addressLine2: payload.addressLine2?.trim() || null,
    city: payload.city?.trim() || null,
    emergencyContactName: payload.emergencyContactName?.trim() || null,
    emergencyContactPhone: payload.emergencyContactPhone?.trim() || null,
    emergencyContactRelationship: payload.emergencyContactRelationship?.trim() || null,
    allergies: payload.allergies?.trim() || null,
    medicalConditions: payload.medicalConditions?.trim() || null,
    currentMedications: payload.currentMedications?.trim() || null,
    dentalHistory: payload.dentalHistory?.trim() || null,
    notes: payload.notes?.trim() || null
  };

  return request('/api/patients', {
    method: 'POST',
    body
  });
}

/**
 * Update an existing patient record profile.
 * Only sends fields permitted by UpdatePatientRequest (no patientCode, no userId).
 */
export async function updatePatient(id, payload) {
  const body = {
    firstName: payload.firstName?.trim() || '',
    lastName: payload.lastName?.trim() || '',
    dateOfBirth: payload.dateOfBirth || null,
    gender: payload.gender || null,
    email: payload.email?.trim() || null,
    phone: payload.phone?.trim() || '',
    addressLine1: payload.addressLine1?.trim() || null,
    addressLine2: payload.addressLine2?.trim() || null,
    city: payload.city?.trim() || null,
    emergencyContactName: payload.emergencyContactName?.trim() || null,
    emergencyContactPhone: payload.emergencyContactPhone?.trim() || null,
    emergencyContactRelationship: payload.emergencyContactRelationship?.trim() || null,
    allergies: payload.allergies?.trim() || null,
    medicalConditions: payload.medicalConditions?.trim() || null,
    currentMedications: payload.currentMedications?.trim() || null,
    dentalHistory: payload.dentalHistory?.trim() || null,
    notes: payload.notes?.trim() || null
  };

  return request(`/api/patients/${id}`, {
    method: 'PUT',
    body
  });
}

/**
 * Deactivate a patient record with an optional reason.
 */
export async function deactivatePatient(id, deactivationReason) {
  const body = deactivationReason?.trim()
    ? { deactivationReason: deactivationReason.trim() }
    : undefined;

  return request(`/api/patients/${id}/deactivate`, {
    method: 'PATCH',
    body
  });
}

/**
 * Reactivate a deactivated patient record.
 */
export async function reactivatePatient(id) {
  return request(`/api/patients/${id}/reactivate`, {
    method: 'PATCH'
  });
}
