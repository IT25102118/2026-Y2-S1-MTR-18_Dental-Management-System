/**
 * API client for Treatment Procedure execution and lifecycle operations.
 * Communicates with backend Step 4C-2 endpoints:
 * - /api/clinical/treatment-plans/{planId}/procedures
 * - /api/clinical/treatment-procedures/{id}
 */

import { ClinicalApiError, request } from './examinationApi';

export { ClinicalApiError };

/**
 * Add an individual treatment procedure to a treatment plan.
 * Endpoint: POST /api/clinical/treatment-plans/{planId}/procedures
 */
export async function addTreatmentProcedure(planId, payload) {
  return request(`/api/clinical/treatment-plans/${planId}/procedures`, {
    method: 'POST',
    body: payload
  });
}

/**
 * List all procedures belonging to a treatment plan ordered by sequence number.
 * Endpoint: GET /api/clinical/treatment-plans/{planId}/procedures
 */
export async function listProceduresByPlan(planId) {
  return request(`/api/clinical/treatment-plans/${planId}/procedures`, {
    method: 'GET'
  });
}

/**
 * List all procedures for a specific tooth under a treatment plan.
 * Endpoint: GET /api/clinical/treatment-plans/{planId}/procedures?toothNumber={toothNumber}
 */
export async function listProceduresByTooth(planId, toothNumber) {
  return request(`/api/clinical/treatment-plans/${planId}/procedures?toothNumber=${toothNumber}`, {
    method: 'GET'
  });
}

/**
 * Fetch a single treatment procedure by its unique ID.
 * Endpoint: GET /api/clinical/treatment-procedures/{id}
 */
export async function getTreatmentProcedureById(id) {
  return request(`/api/clinical/treatment-procedures/${id}`, {
    method: 'GET'
  });
}

/**
 * Update an existing treatment procedure in PLANNED or IN_PROGRESS status.
 * Endpoint: PUT /api/clinical/treatment-procedures/{id}
 */
export async function updateTreatmentProcedure(id, payload) {
  return request(`/api/clinical/treatment-procedures/${id}`, {
    method: 'PUT',
    body: payload
  });
}

/**
 * Start treatment procedure execution (PLANNED -> IN_PROGRESS).
 * Endpoint: POST /api/clinical/treatment-procedures/{id}/start
 */
export async function startTreatmentProcedure(id, dentistId) {
  const url = dentistId !== undefined && dentistId !== null
    ? `/api/clinical/treatment-procedures/${id}/start?dentistId=${dentistId}`
    : `/api/clinical/treatment-procedures/${id}/start`;
  return request(url, {
    method: 'POST'
  });
}

/**
 * Complete a treatment procedure by an authorized dentist.
 * Endpoint: POST /api/clinical/treatment-procedures/{id}/complete
 */
export async function completeTreatmentProcedure(id, payload) {
  return request(`/api/clinical/treatment-procedures/${id}/complete`, {
    method: 'POST',
    body: payload
  });
}

/**
 * Cancel a planned or in-progress treatment procedure with reason.
 * Endpoint: POST /api/clinical/treatment-procedures/{id}/cancel
 */
export async function cancelTreatmentProcedure(id, payload) {
  return request(`/api/clinical/treatment-procedures/${id}/cancel`, {
    method: 'POST',
    body: payload
  });
}
