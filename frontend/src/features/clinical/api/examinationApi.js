import { getCsrfToken } from '../../auth/api/authApi';

/**
 * API client for Clinical Examination operations.
 * Communicates with backend Step 4C-1 /api/clinical/examinations endpoints.
 */

export class ClinicalApiError extends Error {
  constructor(status, message, fieldErrors = {}, error = null, raw = null) {
    super(message || `API error (${status})`);
    this.name = 'ClinicalApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
    this.raw = raw;
  }
}

/**
 * Shared request helper for clinical API clients.
 * Normalizes HTTP requests, JSON payloads, responses, and errors.
 */
export async function request(endpoint, options = {}) {
  const { body, headers = {}, ...restOptions } = options;
  const method = (options.method || 'GET').toUpperCase();

  const config = {
    ...restOptions,
    method,
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      ...headers
    }
  };

  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (stateChangingMethods.includes(method)) {
    const csrf = await getCsrfToken();
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
    throw new ClinicalApiError(
      0,
      err.message || 'Unable to communicate with the clinical service. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 204) {
    return null;
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
    const errorBody = (typeof data === 'object' && data !== null) ? data : {};
    const message = errorBody.message || (typeof data === 'string' && data) || response.statusText || 'Operation failed';
    const fieldErrors = errorBody.fieldErrors || {};
    const errorName = errorBody.error || response.statusText || 'Error';
    throw new ClinicalApiError(response.status, message, fieldErrors, errorName, data);
  }

  return data;
}

/**
 * Create a new clinical examination in DRAFT status.
 * Endpoint: POST /api/clinical/examinations
 */
export async function createExamination(payload) {
  return request('/api/clinical/examinations', {
    method: 'POST',
    body: payload
  });
}

/**
 * Fetch a single clinical examination by ID.
 * Endpoint: GET /api/clinical/examinations/{id}
 */
export async function getExaminationById(id) {
  return request(`/api/clinical/examinations/${id}`, {
    method: 'GET'
  });
}

/**
 * List all clinical examinations for a specific patient.
 * Endpoint: GET /api/clinical/examinations?patientId={patientId}
 */
export async function listExaminationsByPatient(patientId) {
  return request(`/api/clinical/examinations?patientId=${patientId}`, {
    method: 'GET'
  });
}

/**
 * Update an existing draft clinical examination.
 * Endpoint: PUT /api/clinical/examinations/{id}
 */
export async function updateExamination(id, payload) {
  return request(`/api/clinical/examinations/${id}`, {
    method: 'PUT',
    body: payload
  });
}

/**
 * Confirm diagnosis for an examination by an authorized dentist.
 * Endpoint: POST /api/clinical/examinations/{id}/confirm-diagnosis
 */
export async function confirmDiagnosis(id, payload) {
  return request(`/api/clinical/examinations/${id}/confirm-diagnosis`, {
    method: 'POST',
    body: payload
  });
}
