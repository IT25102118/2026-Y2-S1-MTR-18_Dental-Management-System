/**
 * API client for MF-04 Prescription Management.
 * Communicates with backend /api/prescriptions endpoints.
 */

export class PrescriptionApiError extends Error {
  constructor(status, message, fieldErrors = {}, error = null, raw = null) {
    super(message || `Prescription API error (${status})`);
    this.name = 'PrescriptionApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
    this.raw = raw;
  }
}

/**
 * Normalizes Spring PageImpl JSON response to a predictable pagination shape.
 */
export function normalizePage(pageData = {}) {
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

async function request(endpoint, options = {}) {
  const { body, headers = {}, ...restOptions } = options;
  const config = {
    ...restOptions,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
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
    throw new PrescriptionApiError(
      0,
      err.message || 'Unable to communicate with the prescription service. Please check your connection.',
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
    const errorBody = typeof data === 'object' && data !== null ? data : {};
    const message = errorBody.message || (typeof data === 'string' && data) || response.statusText || 'Operation failed';
    const fieldErrors = errorBody.fieldErrors || {};
    const errorName = errorBody.error || response.statusText || 'Error';
    throw new PrescriptionApiError(response.status, message, fieldErrors, errorName, data);
  }

  return data;
}

/**
 * Fetch paginated prescriptions list.
 */
export async function getPrescriptions({ page = 0, size = 20, sort = 'createdAt,desc' } = {}) {
  const params = new URLSearchParams();
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
  const url = queryString ? `/api/prescriptions?${queryString}` : '/api/prescriptions';
  const data = await request(url, { method: 'GET' });
  return normalizePage(data);
}

/**
 * Fetch paginated prescriptions for a specific patient.
 */
export async function getPrescriptionsByPatient(patientId, { page = 0, size = 20, sort = 'createdAt,desc' } = {}) {
  const params = new URLSearchParams();
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
  const url = `/api/prescriptions/patient/${patientId}${queryString ? `?${queryString}` : ''}`;
  const data = await request(url, { method: 'GET' });
  return normalizePage(data);
}

/**
 * Fetch a single prescription by its ID.
 */
export async function getPrescriptionById(id) {
  return request(`/api/prescriptions/${id}`, { method: 'GET' });
}

/**
 * Create a new DRAFT prescription.
 * Payload: { patientId, dentistId, notes, items: [...] }
 */
export async function createPrescription(payload) {
  const body = {
    patientId: Number(payload.patientId),
    dentistId: Number(payload.dentistId),
    notes: payload.notes?.trim() || null,
    items: Array.isArray(payload.items)
      ? payload.items.map((item) => ({
          medicineName: item.medicineName?.trim(),
          strength: item.strength?.trim() || null,
          dosage: item.dosage?.trim(),
          frequency: item.frequency?.trim(),
          duration: item.duration?.trim(),
          quantity: Number(item.quantity),
          instructions: item.instructions?.trim() || null
        }))
      : []
  };

  return request('/api/prescriptions', {
    method: 'POST',
    body
  });
}

/**
 * Update an existing DRAFT prescription.
 * Payload: { notes, items: [...] }
 */
export async function updatePrescription(id, payload) {
  const body = {
    notes: payload.notes?.trim() || null,
    items: Array.isArray(payload.items)
      ? payload.items.map((item) => ({
          medicineName: item.medicineName?.trim(),
          strength: item.strength?.trim() || null,
          dosage: item.dosage?.trim(),
          frequency: item.frequency?.trim(),
          duration: item.duration?.trim(),
          quantity: Number(item.quantity),
          instructions: item.instructions?.trim() || null
        }))
      : []
  };

  return request(`/api/prescriptions/${id}`, {
    method: 'PUT',
    body
  });
}

/**
 * Finalize a DRAFT prescription (DENTIST role required).
 */
export async function finalizePrescription(id, dentistId) {
  return request(`/api/prescriptions/${id}/finalize?dentistId=${Number(dentistId)}`, {
    method: 'POST'
  });
}

/**
 * Non-destructively cancel a prescription.
 */
export async function cancelPrescription(id) {
  return request(`/api/prescriptions/${id}/cancel`, {
    method: 'POST'
  });
}
