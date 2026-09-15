import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createTreatmentPlan,
  getTreatmentPlanById,
  listTreatmentPlansByPatient,
  listTreatmentPlansByExamination,
  listTreatmentPlansByDentist,
  updateTreatmentPlan,
  approveTreatmentPlan,
  startTreatmentPlan,
  completeTreatmentPlan,
  cancelTreatmentPlan,
  setFollowUpDate,
  ClinicalApiError
} from '../api/treatmentPlanApi';

vi.mock('../../auth/api/authApi', () => ({
  getCsrfToken: vi.fn(() => Promise.resolve({
    token: 'test-csrf-token',
    headerName: 'X-XSRF-TOKEN',
    parameterName: '_csrf'
  }))
}));

describe('treatmentPlanApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('createTreatmentPlan', () => {
    it('sends POST /api/clinical/treatment-plans and returns created plan', async () => {
      const mockResult = { id: 1, planName: 'Comprehensive Plan', status: 'PROPOSED' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = {
        patientId: 10,
        dentistId: 20,
        createdByUserId: 20,
        planName: 'Comprehensive Plan',
        totalEstimatedCost: 1500.00
      };

      const res = await createTreatmentPlan(payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('getTreatmentPlanById', () => {
    it('sends GET /api/clinical/treatment-plans/{id} and returns plan details', async () => {
      const mockResult = { id: 1, planName: 'Comprehensive Plan' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await getTreatmentPlanById(1);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('query methods', () => {
    it('listTreatmentPlansByPatient sends GET /api/clinical/treatment-plans?patientId={patientId}', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 1 }]
      });

      const res = await listTreatmentPlansByPatient(10);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans?patientId=10',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual([{ id: 1 }]);
    });

    it('listTreatmentPlansByExamination sends GET /api/clinical/treatment-plans?examinationId={examinationId}', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 1 }]
      });

      const res = await listTreatmentPlansByExamination(100);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans?examinationId=100',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual([{ id: 1 }]);
    });

    it('listTreatmentPlansByDentist sends GET /api/clinical/treatment-plans?dentistId={dentistId}', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 1 }]
      });

      const res = await listTreatmentPlansByDentist(20);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans?dentistId=20',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res).toEqual([{ id: 1 }]);
    });
  });

  describe('updateTreatmentPlan', () => {
    it('sends PUT /api/clinical/treatment-plans/{id} and returns updated plan', async () => {
      const mockResult = { id: 1, planName: 'Updated Plan' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { planName: 'Updated Plan' };
      const res = await updateTreatmentPlan(1, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('lifecycle transition methods', () => {
    it('approveTreatmentPlan sends POST /api/clinical/treatment-plans/{id}/approve', async () => {
      const mockResult = { id: 1, status: 'APPROVED' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { dentistId: 20 };
      const res = await approveTreatmentPlan(1, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/approve',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });

    it('startTreatmentPlan without dentistId sends POST /api/clinical/treatment-plans/{id}/start', async () => {
      const mockResult = { id: 1, status: 'IN_PROGRESS' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await startTreatmentPlan(1);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/start',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res).toEqual(mockResult);
    });

    it('startTreatmentPlan with dentistId sends POST /api/clinical/treatment-plans/{id}/start?dentistId={dentistId}', async () => {
      const mockResult = { id: 1, status: 'IN_PROGRESS' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await startTreatmentPlan(1, 20);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/start?dentistId=20',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res).toEqual(mockResult);
    });

    it('completeTreatmentPlan without dentistId sends POST /api/clinical/treatment-plans/{id}/complete', async () => {
      const mockResult = { id: 1, status: 'COMPLETED' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await completeTreatmentPlan(1);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/complete',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res).toEqual(mockResult);
    });

    it('completeTreatmentPlan with dentistId sends POST /api/clinical/treatment-plans/{id}/complete?dentistId={dentistId}', async () => {
      const mockResult = { id: 1, status: 'COMPLETED' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const res = await completeTreatmentPlan(1, 20);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/complete?dentistId=20',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res).toEqual(mockResult);
    });

    it('cancelTreatmentPlan sends POST /api/clinical/treatment-plans/{id}/cancel', async () => {
      const mockResult = { id: 1, status: 'CANCELLED' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { dentistId: 20, cancellationReason: 'Declined' };
      const res = await cancelTreatmentPlan(1, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/cancel',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });

    it('setFollowUpDate sends POST /api/clinical/treatment-plans/{id}/follow-up', async () => {
      const mockResult = { id: 1, followUpDate: '2026-10-15' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResult
      });

      const payload = { followUpDate: '2026-10-15', dentistId: 20, clinicalNotes: 'Check healing' };
      const res = await setFollowUpDate(1, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/clinical/treatment-plans/1/follow-up',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload)
        })
      );
      expect(res).toEqual(mockResult);
    });
  });

  describe('Error normalization', () => {
    it('normalizes 403 Forbidden error into ClinicalApiError', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 403,
          error: 'Forbidden',
          message: 'User is not an active dentist'
        })
      });

      try {
        await approveTreatmentPlan(1, { dentistId: 30 });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(403);
        expect(err.message).toContain('not an active dentist');
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
          message: 'Cannot complete treatment plan: 1 procedures remain active'
        })
      });

      try {
        await completeTreatmentPlan(1);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ClinicalApiError);
        expect(err.status).toBe(409);
        expect(err.message).toContain('procedures remain active');
      }
    });
  });
});
