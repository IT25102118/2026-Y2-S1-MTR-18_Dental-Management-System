import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerPatient, AuthApiError } from '../api/authApi';

describe('authApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('sends POST to /api/auth/register/patient and returns created user payload', async () => {
    const mockSuccessResponse = {
      id: 1,
      email: 'jane.doe@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+1 555-0144',
      role: 'PATIENT',
      active: true,
      createdAt: '2026-09-06T10:00:00'
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockSuccessResponse
    });

    const result = await registerPatient({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      phone: '+1 555-0144',
      password: 'Password123'
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/auth/register/patient');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body)).toEqual({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      phone: '+1 555-0144',
      password: 'Password123'
    });

    expect(result).toEqual(mockSuccessResponse);
  });

  it('never sends confirmPassword to the backend API', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 2, email: 'test@example.com', role: 'PATIENT' })
    });

    await registerPatient({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'Password123',
      confirmPassword: 'Password123'
    });

    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.confirmPassword).toBeUndefined();
    expect(callBody.role).toBeUndefined();
  });

  it('normalizes empty phone to undefined / omitted', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 3, email: 'nophone@example.com', role: 'PATIENT' })
    });

    await registerPatient({
      firstName: 'No',
      lastName: 'Phone',
      email: 'nophone@example.com',
      phone: '   ',
      password: 'Password123'
    });

    const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(callBody.phone).toBeUndefined();
  });

  it('throws AuthApiError with status 409 on duplicate email', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        timestamp: '2026-09-06T10:00:00',
        status: 409,
        error: 'Conflict',
        message: 'An account with this email address already exists'
      })
    });

    await expect(registerPatient({
      firstName: 'Dup',
      lastName: 'User',
      email: 'dup@example.com',
      password: 'Password123'
    })).rejects.toThrow(AuthApiError);

    try {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 409,
          message: 'An account with this email address already exists'
        })
      });
      await registerPatient({ email: 'dup@example.com', password: 'p' });
    } catch (err) {
      expect(err.status).toBe(409);
      expect(err.message).toBe('An account with this email address already exists');
    }
  });

  it('throws AuthApiError with fieldErrors on 400 Bad Request', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        timestamp: '2026-09-06T10:00:00',
        status: 400,
        error: 'Bad Request',
        message: 'Validation failed for registration request',
        fieldErrors: {
          email: 'Email must be valid',
          password: 'Password must be between 8 and 100 characters and contain at least one letter and one number'
        }
      })
    });

    try {
      await registerPatient({
        firstName: 'Bad',
        lastName: 'Request',
        email: 'invalid',
        password: 'short'
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthApiError);
      expect(err.status).toBe(400);
      expect(err.fieldErrors.email).toBe('Email must be valid');
      expect(err.fieldErrors.password).toContain('between 8 and 100 characters');
    }
  });
});
