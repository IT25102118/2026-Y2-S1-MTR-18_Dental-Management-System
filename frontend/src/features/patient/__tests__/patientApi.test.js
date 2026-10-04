import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deactivatePatient,
  reactivatePatient,
  PatientApiError,
  normalizePatientPage
} from '../api/patientApi';

import { getCsrfToken } from '../../auth/api/authApi';

vi.mock('../../auth/api/authApi', () => ({
  getCsrfToken: vi.fn().mockResolvedValue({ token: 'test-csrf-token', headerName: 'X-XSRF-TOKEN' })
}));

describe('patientApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.mocked(getCsrfToken).mockResolvedValue({ token: 'test-csrf-token', headerName: 'X-XSRF-TOKEN' });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('normalizePatientPage', () => {
    it('normalizes empty response safely', () => {
      const page = normalizePatientPage(null);
      expect(page.content).toEqual([]);
      expect(page.totalElements).toBe(0);
      expect(page.empty).toBe(true);
    });

    it('normalizes page content safely', () => {
      const page = normalizePatientPage({
        content: [{ id: 1, firstName: 'John' }],
        number: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1
      });
      expect(page.content).toHaveLength(1);
      expect(page.totalElements).toBe(1);
      expect(page.empty).toBe(false);
    });
  });

  describe('getPatients', () => {
    it('constructs query URL with search, filters, pagination, and sorting', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [{ id: 1, patientCode: 'P-001', firstName: 'Jane', lastName: 'Doe', active: true }],
          number: 0,
          size: 20,
          totalPages: 1,
          totalElements: 1
        })
      });

      const res = await getPatients({
        search: 'Jane',
        active: true,
        gender: 'FEMALE',
        page: 0,
        size: 20,
        sort: 'lastName,asc'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/patients?search=Jane&active=true&gender=FEMALE&page=0&size=20&sort=lastName%2Casc',
        expect.objectContaining({ method: 'GET', credentials: 'same-origin' })
      );
      expect(res.content).toHaveLength(1);
      expect(res.content[0].patientCode).toBe('P-001');
    });

    it('throws PatientApiError on network failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network down'));
      await expect(getPatients()).rejects.toThrow(PatientApiError);
    });
  });

  describe('getPatientById', () => {
    it('fetches patient details by ID', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 42, patientCode: 'P-042', firstName: 'Alex', active: true })
      });

      const res = await getPatientById(42);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/patients/42',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.id).toBe(42);
      expect(res.patientCode).toBe('P-042');
    });
  });

  describe('createPatient', () => {
    it('sends POST request with CSRF token and CreatePatientRequest payload', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 10, patientCode: 'PAT-10', firstName: 'Sam', lastName: 'Smith' })
      });

      const payload = {
        patientCode: 'PAT-10',
        firstName: 'Sam',
        lastName: 'Smith',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '123456789'
      };

      const res = await createPatient(payload);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/patients',
        expect.objectContaining({
          method: 'POST',
          credentials: 'same-origin',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': 'test-csrf-token'
          }),
          body: expect.stringContaining('"patientCode":"PAT-10"')
        })
      );
      expect(res.id).toBe(10);
    });
  });

  describe('updatePatient', () => {
    it('sends PUT request with CSRF token and permits only UpdatePatientRequest fields', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 10, firstName: 'UpdatedName' })
      });

      const payload = {
        firstName: 'UpdatedName',
        lastName: 'Smith',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '987654321',
        patientCode: 'IGNORED_CODE',
        userId: 999
      };

      await updatePatient(10, payload);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/patients/10',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': 'test-csrf-token'
          })
        })
      );
      const call = global.fetch.mock.calls[0];
      const parsedBody = JSON.parse(call[1].body);
      expect(parsedBody.patientCode).toBeUndefined();
      expect(parsedBody.userId).toBeUndefined();
      expect(parsedBody.firstName).toBe('UpdatedName');
    });
  });

  describe('deactivatePatient and reactivatePatient', () => {
    it('deactivates patient with reason', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 10, active: false, deactivationReason: 'Relocated' })
      });

      await deactivatePatient(10, 'Relocated');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/patients/10/deactivate',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'test-csrf-token' }),
          body: JSON.stringify({ deactivationReason: 'Relocated' })
        })
      );
    });

    it('reactivates patient without body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 10, active: true })
      });

      await reactivatePatient(10);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/patients/10/reactivate',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'test-csrf-token' })
        })
      );
    });
  });
});
