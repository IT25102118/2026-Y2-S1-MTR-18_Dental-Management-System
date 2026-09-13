import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addTreatmentProcedure,
  listProceduresByPlan,
  listProceduresByTooth,
  getTreatmentProcedureById,
  updateTreatmentProcedure,
  startTreatmentProcedure,
  completeTreatmentProcedure,
  cancelTreatmentProcedure,
  ClinicalApiError
} from '../api/treatmentProcedureApi';

describe('treatmentProcedureApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('addTreatmentProcedure', () => {
    it('sends POST /api/clinical/treatment-plans/{planId}/procedures and returns created procedure', async () => {
      const mockResult = { id: 101, treatmentPlanId: 1, procedureName: 'Restoration', status: 'PLANNED' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = {
        toothNumber: 16,
        procedureName: 'Restoration',
        estimatedCost: 150.00
      };

      const res = await addTreatmentProcedure(1, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/procedures',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('query methods', () => {
    it('listProceduresByPlan sends GET /api/clinical/treatment-plans/{planId}/procedures', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 101 }]
      });

      const res = await listProceduresByPlan(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/procedures',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual([{ id: 101 }]);
    });

    it('listProceduresByTooth sends GET /api/clinical/treatment-plans/{planId}/procedures?toothNumber={toothNumber}', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 101, toothNumber: 16 }]
      });

      const res = await listProceduresByTooth(1, 16);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/procedures?toothNumber=16',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual([{ id: 101, toothNumber: 16 }]);
    });

    it('getTreatmentProcedureById sends GET /api/clinical/treatment-procedures/{id}', async () => {
      const mockResult = { id: 101, procedureName: 'Restoration' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await getTreatmentProcedureById(101);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-procedures/101',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('lifecycle transition methods', () => {
    it('updateTreatmentProcedure sends PUT /api/clinical/treatment-procedures/{id}', async () => {
      const mockResult = { id: 101, estimatedCost: 200.00 };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { estimatedCost: 200.00 };
      const res = await updateTreatmentProcedure(101, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-procedures/101',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });

    it('startTreatmentProcedure without dentistId sends POST /api/clinical/treatment-procedures/{id}/start', async () => {
      const mockResult = { id: 101, status: 'IN_PROGRESS' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await startTreatmentProcedure(101);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-procedures/101/start',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res).toEqual(mockResult);
    });

    it('startTreatmentProcedure with dentistId sends POST with query param', async () => {
      const mockResult = { id: 101, status: 'IN_PROGRESS' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await startTreatmentProcedure(101, 20);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-procedures/101/start?dentistId=20',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res).toEqual(mockResult);
    });

    it('completeTreatmentProcedure sends POST /api/clinical/treatment-procedures/{id}/complete', async () => {
      const mockResult = { id: 101, status: 'COMPLETED' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { performedByDentistId: 20, actualCost: 150.00 };
      const res = await completeTreatmentProcedure(101, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-procedures/101/complete',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });

    it('cancelTreatmentProcedure sends POST /api/clinical/treatment-procedures/{id}/cancel', async () => {
      const mockResult = { id: 101, status: 'CANCELLED' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { cancelledByDentistId: 20, cancellationReason: 'Declined' };
      const res = await cancelTreatmentProcedure(101, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-procedures/101/cancel',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('Error normalization', () => {
    it('normalizes 404 Not Found error into ClinicalApiError', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 404,
          error: 'Not Found',
          message: 'Treatment procedure not found: 999'
        })
      });

      try {
        await getTreatmentProcedureById(999);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(404);
        expect(err.message).toContain('Treatment procedure not found');
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
          message: 'Cannot start procedure under PROPOSED plan'
        })
      });

      try {
        await startTreatmentProcedure(101);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(409);
        expect(err.message).toContain('PROPOSED plan');
      }
    });
  });
});
