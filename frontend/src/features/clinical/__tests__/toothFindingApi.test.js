import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addToothFinding,
  listToothFindingsByExamination,
  getToothFindingById,
  updateToothFinding,
  ClinicalApiError
} from '../api/toothFindingApi';

vi.mock('../../auth/api/authApi', () => ({
  getCsrfToken: vi.fn(() => Promise.resolve({
    token: 'test-csrf-token',
    headerName: 'X-XSRF-TOKEN',
    parameterName: '_csrf'
  }))
}));

describe('toothFindingApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('addToothFinding', () => {
    it('sends POST /api/clinical/examinations/{examinationId}/tooth-findings and returns created finding', async () => {
      const mockResult = { id: 10, examinationId: 1, toothNumber: 16, conditionName: 'caries' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { toothNumber: 16, conditionName: 'caries', recordedByUserId: 20 };
      const res = await addToothFinding(1, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/examinations/1/tooth-findings',
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

  describe('listToothFindingsByExamination', () => {
    it('sends GET /api/clinical/examinations/{examinationId}/tooth-findings and returns findings list', async () => {
      const mockResult = [{ id: 10, examinationId: 1, toothNumber: 16 }];
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await listToothFindingsByExamination(1);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/examinations/1/tooth-findings',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('getToothFindingById', () => {
    it('sends GET /api/clinical/tooth-findings/{id} and returns finding details', async () => {
      const mockResult = { id: 10, toothNumber: 16, conditionName: 'caries' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await getToothFindingById(10);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/tooth-findings/10',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('updateToothFinding', () => {
    it('sends PUT /api/clinical/tooth-findings/{id} and returns updated finding', async () => {
      const mockResult = { id: 10, toothNumber: 16, notes: 'Updated notes' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { notes: 'Updated notes' };
      const res = await updateToothFinding(10, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/tooth-findings/10',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('Error normalization', () => {
    it('normalizes 400 Bad Request error into ClinicalApiError', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 400,
          error: 'Bad Request',
          message: 'Invalid FDI tooth number: 99'
        })
      });

      try {
        await addToothFinding(1, { toothNumber: 99 });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(400);
        expect(err.message).toContain('Invalid FDI tooth number: 99');
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
          message: 'Tooth finding not found: 999'
        })
      });

      try {
        await getToothFindingById(999);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(404);
        expect(err.message).toContain('Tooth finding not found');
      }
    });
  });
});
