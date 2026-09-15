import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPrescriptions,
  getPrescriptionsByPatient,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  finalizePrescription,
  cancelPrescription,
  PrescriptionApiError,
  normalizePage
} from '../api/prescriptionApi';

describe('prescriptionApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('normalizePage', () => {
    it('handles empty or undefined payload safely', () => {
      const result = normalizePage();
      expect(result.content).toEqual([]);
      expect(result.number).toBe(0);
      expect(result.empty).toBe(true);
    });

    it('preserves valid page data', () => {
      const pageData = {
        content: [{ id: 1 }],
        number: 2,
        size: 10,
        totalPages: 5,
        totalElements: 50,
        first: false,
        last: false,
        empty: false
      };
      const result = normalizePage(pageData);
      expect(result).toEqual(pageData);
    });
  });

  describe('getPrescriptions', () => {
    it('constructs query URL with page, size, and sort', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [{ id: 1, patientName: 'Alice' }],
          number: 0,
          size: 20,
          totalPages: 1,
          totalElements: 1
        })
      });

      const res = await getPrescriptions({ page: 0, size: 20, sort: 'createdAt,desc' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/prescriptions?page=0&size=20&sort=createdAt%2Cdesc',
        expect.objectContaining({ method: 'GET', credentials: 'same-origin' })
      );
      expect(res.content).toHaveLength(1);
      expect(res.content[0].patientName).toBe('Alice');
    });
  });

  describe('getPrescriptionById', () => {
    it('fetches a single prescription by ID', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 10,
          patientId: 1,
          dentistId: 2,
          status: 'DRAFT',
          items: []
        })
      });

      const res = await getPrescriptionById(10);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/prescriptions/10',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.id).toBe(10);
      expect(res.status).toBe('DRAFT');
    });

    it('throws PrescriptionApiError on 404', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Prescription not found with id: 99' })
      });

      await expect(getPrescriptionById(99)).rejects.toThrow(PrescriptionApiError);
    });
  });

  describe('createPrescription', () => {
    it('sends POST request with trimmed payload and returns created response', async () => {
      const payload = {
        patientId: 1,
        dentistId: 2,
        notes: '  Post-op pain  ',
        items: [
          {
            medicineName: ' Amoxicillin ',
            strength: ' 500mg ',
            dosage: ' 1 capsule ',
            frequency: ' 3x daily ',
            duration: ' 7 days ',
            quantity: 21,
            instructions: ' After meals '
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 5, status: 'DRAFT' })
      });

      const res = await createPrescription(payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/prescriptions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            patientId: 1,
            dentistId: 2,
            notes: 'Post-op pain',
            items: [
              {
                medicineName: 'Amoxicillin',
                strength: '500mg',
                dosage: '1 capsule',
                frequency: '3x daily',
                duration: '7 days',
                quantity: 21,
                instructions: 'After meals'
              }
            ]
          })
        })
      );
      expect(res.id).toBe(5);
    });
  });

  describe('updatePrescription', () => {
    it('sends PUT request to update notes and items', async () => {
      const payload = {
        notes: 'Updated note',
        items: [
          {
            medicineName: 'Ibuprofen',
            dosage: '400mg',
            frequency: 'PRN',
            duration: '3 days',
            quantity: 10
          }
        ]
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 5, status: 'DRAFT', notes: 'Updated note' })
      });

      const res = await updatePrescription(5, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/prescriptions/5',
        expect.objectContaining({
          method: 'PUT'
        })
      );
      expect(res.notes).toBe('Updated note');
    });
  });

  describe('finalizePrescription', () => {
    it('sends POST to /finalize with dentistId param', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 5, status: 'FINALIZED', finalizedAt: '2026-09-14T01:00:00' })
      });

      const res = await finalizePrescription(5, 2);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/prescriptions/5/finalize?dentistId=2',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res.status).toBe('FINALIZED');
    });
  });

  describe('cancelPrescription', () => {
    it('sends POST to /cancel', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 5, status: 'CANCELLED' })
      });

      const res = await cancelPrescription(5);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/prescriptions/5/cancel',
        expect.objectContaining({ method: 'POST' })
      );
      expect(res.status).toBe('CANCELLED');
    });
  });
});
