import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllStaff,
  getStaffById,
  provisionStaff,
  updateStaff,
  updateStaffStatus
} from '../api/staffApi';
import * as csrfClient from '../../../shared/security/csrfClient';

vi.mock('../../../shared/security/csrfClient', () => ({
  getCsrfToken: vi.fn().mockResolvedValue({ token: 'test-csrf-token', headerName: 'X-XSRF-TOKEN' }),
  clearCsrfToken: vi.fn()
}));

describe('staffApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('getAllStaff', () => {
    it('calls GET /api/admin/staff and returns staff array', async () => {
      const mockStaffList = [
        { id: 1, firstName: 'Admin', lastName: 'User', email: 'admin@dentcare.com', role: 'ADMINISTRATOR', active: true },
        { id: 2, firstName: 'Sarah', lastName: 'Connor', email: 'dentist@dentcare.com', role: 'DENTIST', active: true }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockStaffList)
      });

      const result = await getAllStaff();
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/staff', expect.objectContaining({ method: 'GET' }));
      expect(result).toEqual(mockStaffList);
    });
  });

  describe('getStaffById', () => {
    it('calls GET /api/admin/staff/:id and returns staff member', async () => {
      const mockStaff = { id: 2, firstName: 'Sarah', lastName: 'Connor', role: 'DENTIST' };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(mockStaff)
      });

      const result = await getStaffById(2);
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/staff/2', expect.objectContaining({ method: 'GET' }));
      expect(result).toEqual(mockStaff);
    });
  });

  describe('provisionStaff', () => {
    it('calls POST /api/admin/staff with payload and CSRF header', async () => {
      const payload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@dentcare.com',
        phone: '+1 555-0100',
        role: 'DENTIST',
        password: 'Password123'
      };
      const createdStaff = { id: 3, ...payload, active: true };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(createdStaff)
      });

      const result = await provisionStaff(payload);
      expect(csrfClient.getCsrfToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/staff',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': 'test-csrf-token',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(payload)
        })
      );
      expect(result).toEqual(createdStaff);
    });
  });

  describe('updateStaff', () => {
    it('calls PUT /api/admin/staff/:id with update payload and CSRF header', async () => {
      const payload = {
        firstName: 'Johnny',
        lastName: 'Doe',
        phone: '+1 555-0199',
        role: 'RECEPTIONIST'
      };
      const updatedStaff = { id: 3, email: 'john@dentcare.com', ...payload, active: true };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(updatedStaff)
      });

      const result = await updateStaff(3, payload);
      expect(csrfClient.getCsrfToken).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/staff/3',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'X-XSRF-TOKEN': 'test-csrf-token'
          }),
          body: JSON.stringify(payload)
        })
      );
      expect(result).toEqual(updatedStaff);
    });
  });

  describe('updateStaffStatus', () => {
    it('calls PATCH /api/admin/staff/:id/status with active boolean', async () => {
      const updatedStaff = { id: 3, email: 'john@dentcare.com', active: false };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue(updatedStaff)
      });

      const result = await updateStaffStatus(3, false);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/staff/3/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ active: false })
        })
      );
      expect(result).toEqual(updatedStaff);
    });
  });
});
