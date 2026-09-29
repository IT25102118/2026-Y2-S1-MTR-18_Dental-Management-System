/**
 * API client for Treatment Plan lifecycle operations.
 * Communicates with backend Step 4C-2 /api/clinical/treatment-plans endpoints.
 */

import { ClinicalApiError, request } from './examinationApi';

export { ClinicalApiError };

/**
 * Propose a new dental treatment plan.
 * Endpoint: POST /api/clinical/treatment-plans
 */
export async function createTreatmentPlan(payload) {
  return request('/api/clinical/treatment-plans', {
    method: 'POST',
    body: payload
  });
}

/**
 * Fetch a single treatment plan by ID.
 * Endpoint: GET /api/clinical/treatment-plans/{id}
 */
export async function getTreatmentPlanById(id) {
  return request(`/api/clinical/treatment-plans/${id}`, {
    method: 'GET'
  });
}

/**
 * List all treatment plans for a specific patient.
 * Endpoint: GET /api/clinical/treatment-plans?patientId={patientId}
 */
export async function listTreatmentPlansByPatient(patientId) {
  return request(`/api/clinical/treatment-plans?patientId=${patientId}`, {
    method: 'GET'
  });
}

/**
 * List all treatment plans associated with a specific clinical examination.
 * Endpoint: GET /api/clinical/treatment-plans?examinationId={examinationId}
 */
export async function listTreatmentPlansByExamination(examinationId) {
  return request(`/api/clinical/treatment-plans?examinationId=${examinationId}`, {
    method: 'GET'
  });
}

/**
 * List all treatment plans managed by a specific dentist.
 * Endpoint: GET /api/clinical/treatment-plans?dentistId={dentistId}
 */
export async function listTreatmentPlansByDentist(dentistId) {
  return request(`/api/clinical/treatment-plans?dentistId=${dentistId}`, {
    method: 'GET'
  });
}

/**
 * Update an existing treatment plan in PROPOSED status.
 * Endpoint: PUT /api/clinical/treatment-plans/{id}
 */
export async function updateTreatmentPlan(id, payload) {
  return request(`/api/clinical/treatment-plans/${id}`, {
    method: 'PUT',
    body: payload
  });
}

/**
 * Approve a proposed treatment plan by an authorized dentist.
 * Endpoint: POST /api/clinical/treatment-plans/{id}/approve
 */
export async function approveTreatmentPlan(id, payload) {
  return request(`/api/clinical/treatment-plans/${id}/approve`, {
    method: 'POST',
    body: payload
  });
}

/**
 * Start treatment plan execution (PROPOSED/APPROVED -> IN_PROGRESS).
 * Endpoint: POST /api/clinical/treatment-plans/{id}/start
 */
export async function startTreatmentPlan(id, dentistId) {
  const url = dentistId !== undefined && dentistId !== null
    ? `/api/clinical/treatment-plans/${id}/start?dentistId=${dentistId}`
    : `/api/clinical/treatment-plans/${id}/start`;
  return request(url, {
    method: 'POST'
  });
}

/**
 * Complete an in-progress treatment plan after all procedures are resolved.
 * Endpoint: POST /api/clinical/treatment-plans/{id}/complete
 */
export async function completeTreatmentPlan(id, dentistId) {
  const url = dentistId !== undefined && dentistId !== null
    ? `/api/clinical/treatment-plans/${id}/complete?dentistId=${dentistId}`
    : `/api/clinical/treatment-plans/${id}/complete`;
  return request(url, {
    method: 'POST'
  });
}

/**
 * Cancel a treatment plan with clinical justification reason.
 * Endpoint: POST /api/clinical/treatment-plans/{id}/cancel
 */
export async function cancelTreatmentPlan(id, payload) {
  return request(`/api/clinical/treatment-plans/${id}/cancel`, {
    method: 'POST',
    body: payload
  });
}

/**
 * Schedule a follow-up appointment date for a treatment plan.
 * Endpoint: POST /api/clinical/treatment-plans/{id}/follow-up
 */
export async function setFollowUpDate(id, payload) {
  return request(`/api/clinical/treatment-plans/${id}/follow-up`, {
    method: 'POST',
    body: payload
  });
}
