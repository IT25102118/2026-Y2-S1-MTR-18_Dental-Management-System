/**
 * API client for the DentCare Patient Portal.
 * Communicates exclusively with patient-scoped /api/patient/me endpoints.
 * All requests rely strictly on session credentials.
 */

import { getCsrfToken, clearCsrfToken } from '../../../shared/security/csrfClient';

export class PatientPortalApiError extends Error {
  constructor(status, message, fieldErrors = {}, error = null, raw = null) {
    super(message || `Patient portal error (${status})`);
    this.name = 'PatientPortalApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
    this.raw = raw;
  }
}

async function request(endpoint, options = {}) {
  const method = options.method || 'GET';
  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    const csrf = await getCsrfToken();
    headers[csrf.headerName] = csrf.token;
  }

  let response;
  try {
    response = await fetch(endpoint, {
      ...options,
      method,
      credentials: 'same-origin',
      headers
    });
  } catch (err) {
    throw new PatientPortalApiError(
      0,
      err.message || 'Unable to connect to the patient portal service. Please verify your connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 403 && method !== 'GET') {
    clearCsrfToken();
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    const fieldErrors = data?.fieldErrors || {};
    const errorType = data?.error || (response.status === 403 ? 'Forbidden' : response.status === 400 ? 'BadRequest' : 'PortalError');
    throw new PatientPortalApiError(response.status, message, fieldErrors, errorType, data);
  }

  return data;
}

/**
 * Fetches the authenticated patient's dashboard summary.
 * Resolves verified profile, clinical file status, and real prescriptions.
 *
 * @returns {Promise<Object>}
 */
export async function getPatientDashboard() {
  return request('/api/patient/me/dashboard');
}

/**
 * Fetches the prescriptions issued to the authenticated patient.
 *
 * @returns {Promise<Array>}
 */
export async function getPatientPrescriptions() {
  return request('/api/patient/me/prescriptions');
}

/**
 * Fetches a single prescription owned by the authenticated patient.
 *
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function getPatientPrescriptionById(id) {
  return request(`/api/patient/me/prescriptions/${id}`);
}

/**
 * Fetches the appointment requests submitted by the authenticated patient.
 *
 * @returns {Promise<Array>}
 */
export async function getPatientAppointments() {
  return request('/api/patient/me/appointments');
}

/**
 * Fetches a single appointment request owned by the authenticated patient.
 *
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function getPatientAppointmentById(id) {
  return request(`/api/patient/me/appointments/${id}`);
}

/**
 * Submits a new appointment request for the authenticated patient.
 *
 * @param {Object} appointmentData
 * @param {string} appointmentData.appointmentDate YYYY-MM-DD
 * @param {string} [appointmentData.preferredTime] e.g. HH:mm
 * @param {string} appointmentData.reason
 * @param {string} [appointmentData.notes]
 * @returns {Promise<Object>}
 */
export async function createAppointmentRequest(appointmentData) {
  return request('/api/patient/me/appointments', {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  });
}

/**
 * Cancels a pending appointment request owned by the authenticated patient.
 *
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function cancelAppointmentRequest(id) {
  return request(`/api/patient/me/appointments/${id}/cancel`, {
    method: 'PATCH'
  });
}

/**
 * Fetches all invoices issued to the authenticated patient.
 *
 * @returns {Promise<Array>}
 */
export async function getPatientInvoices() {
  return request('/api/patient/me/invoices');
}

/**
 * Fetches a single invoice owned by the authenticated patient.
 *
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function getPatientInvoiceById(id) {
  return request(`/api/patient/me/invoices/${id}`);
}

/**
 * Fetches receipt details for a payment owned by the authenticated patient.
 *
 * @param {number|string} paymentId
 * @returns {Promise<Object>}
 */
export async function getPatientReceipt(paymentId) {
  return request(`/api/patient/me/payments/${paymentId}/receipt`);
}

/**
 * Updates the authenticated patient's profile details (phone number).
 *
 * @param {Object} payload
 * @param {string} payload.phone
 * @returns {Promise<Object>} Updated patient profile response
 */
export async function updatePatientProfile(payload) {
  return request('/api/patient/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

/**
 * Changes the authenticated patient's password requiring current password verification.
 *
 * @param {Object} payload
 * @param {string} payload.currentPassword
 * @param {string} payload.newPassword
 * @returns {Promise<Object>} Password change success response
 */
export async function changePatientPassword(payload) {
  return request('/api/patient/me/change-password', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
