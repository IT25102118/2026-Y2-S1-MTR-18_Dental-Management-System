/**
 * API client for Tooth and Oral Finding operations.
 * Communicates with backend Step 4C-1 endpoints:
 * - /api/clinical/examinations/{examinationId}/tooth-findings
 * - /api/clinical/tooth-findings/{id}
 */

import { ClinicalApiError, request } from './examinationApi';

export { ClinicalApiError };

/**
 * Add a tooth finding or general oral condition to a clinical examination.
 * Endpoint: POST /api/clinical/examinations/{examinationId}/tooth-findings
 */
export async function addToothFinding(examinationId, payload) {
  return request(`/api/clinical/examinations/${examinationId}/tooth-findings`, {
    method: 'POST',
    body: payload
  });
}

/**
 * List all tooth findings for a specific clinical examination.
 * Endpoint: GET /api/clinical/examinations/{examinationId}/tooth-findings
 */
export async function listToothFindingsByExamination(examinationId) {
  return request(`/api/clinical/examinations/${examinationId}/tooth-findings`, {
    method: 'GET'
  });
}

/**
 * Fetch a single tooth finding by its unique ID.
 * Endpoint: GET /api/clinical/tooth-findings/{id}
 */
export async function getToothFindingById(id) {
  return request(`/api/clinical/tooth-findings/${id}`, {
    method: 'GET'
  });
}

/**
 * Update an existing tooth finding on a draft clinical examination.
 * Endpoint: PUT /api/clinical/tooth-findings/{id}
 */
export async function updateToothFinding(id, payload) {
  return request(`/api/clinical/tooth-findings/${id}`, {
    method: 'PUT',
    body: payload
  });
}
