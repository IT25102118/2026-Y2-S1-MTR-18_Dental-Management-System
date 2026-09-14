import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createExamination,
  getExaminationById,
  listExaminationsByPatient,
  updateExamination,
  confirmDiagnosis,
  ClinicalApiError
} from '../api/examinationApi';

vi.mock('../../auth/api/authApi', () => ({
  getCsrfToken: vi.fn(() => Promise.resolve({
    token: 'test-csrf-token',
    headerName: 'X-XSRF-TOKEN',
    parameterName: '_csrf'
  }))
}));

describe('examinationApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('createExamination', () => {
    it('sends POST /api/clinical/examinations with JSON payload and returns response', async () => {
      const mockResult = { id: 1, patientId: 10, dentistId: 20, status: 'DRAFT' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = {
        patientId: 10,
        dentistId: 20,
        chiefComplaint: 'Tooth pain'
      };

      const res = await createExamination(payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/examinations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }),
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('getExaminationById', () => {
    it('sends GET /api/clinical/examinations/{id} and returns examination details', async () => {
      const mockResult = { id: 1, patientId: 10, status: 'DRAFT' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await getExaminationById(1);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/examinations/1',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('listExaminationsByPatient', () => {
    it('sends GET /api/clinical/examinations?patientId={patientId} and returns examinations list', async () => {
      const mockResult = [{ id: 1, patientId: 10, status: 'DRAFT' }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await listExaminationsByPatient(10);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/examinations?patientId=10',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('updateExamination', () => {
    it('sends PUT /api/clinical/examinations/{id} with payload and returns updated examination', async () => {
      const mockResult = { id: 1, chiefComplaint: 'Updated complaint' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { chiefComplaint: 'Updated complaint' };
      const res = await updateExamination(1, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/examinations/1',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('confirmDiagnosis', () => {
    it('sends POST /api/clinical/examinations/{id}/confirm-diagnosis and returns confirmed examination', async () => {
      const mockResult = { id: 1, isDiagnosisConfirmed: true, confirmedDiagnosis: 'Pulpitis' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { dentistId: 20, confirmedDiagnosis: 'Pulpitis' };
      const res = await confirmDiagnosis(1, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/examinations/1/confirm-diagnosis',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('Error normalization', () => {
    it('normalizes 400 Bad Request with fieldErrors into ClinicalApiError', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          fieldErrors: { patientId: 'Patient ID is required' }
        })
      });

      try {
        await createExamination({});
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Validation failed');
        expect(err.fieldErrors.patientId).toBe('Patient ID is required');
      }
    });

    it('normalizes 404 Not Found error into ClinicalApiError', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 404,
          error: 'Not Found',
          message: 'Clinical examination not found: 99'
        })
      });

      try {
        await getExaminationById(99);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(404);
        expect(err.message).toContain('Clinical examination not found');
      }
    });

    it('normalizes 409 Conflict error into ClinicalApiError', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 409,
          error: 'Conflict',
          message: 'Cannot update completed examination'
        })
      });

      try {
        await updateExamination(1, {});
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(409);
        expect(err.message).toContain('Cannot update completed examination');
      }
    });

    it('normalizes network exceptions into ClinicalApiError safely', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      try {
        await getExaminationById(1);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(0);
        expect(err.error).toBe('NetworkError');
      }
    });
  });
});
