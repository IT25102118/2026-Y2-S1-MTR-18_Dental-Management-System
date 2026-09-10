import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  registerPatient,
  AuthApiError,
  getCsrfToken,
  clearCsrfToken,
  login,
  getCurrentUser,
  logout
} from '../api/authApi';

describe('authApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    clearCsrfToken();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    clearCsrfToken();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ==========================================
  // CSRF Cache and Lifecycle
  // ==========================================
  describe('CSRF Token management', () => {
    it('fetches CSRF token via GET /api/auth/csrf and caches it', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          token: 'csrf-token-1',
          headerName: 'X-XSRF-TOKEN',
          parameterName: '_csrf'
        })
      });

      const tokenData1 = await getCsrfToken();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe('/api/auth/csrf');
      expect(options.method).toBe('GET');
      expect(options.credentials).toBe('same-origin');
      expect(tokenData1.token).toBe('csrf-token-1');
      expect(tokenData1.headerName).toBe('X-XSRF-TOKEN');

      // Second call should return cached token without another network call
      const tokenData2 = await getCsrfToken();
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(tokenData2).toBe(tokenData1);
    });

    it('bypasses cache when forceRefresh=true', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'token-v1', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'token-v2', headerName: 'X-XSRF-TOKEN' })
        });

      const t1 = await getCsrfToken();
      expect(t1.token).toBe('token-v1');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const t2 = await getCsrfToken({ forceRefresh: true });
      expect(t2.token).toBe('token-v2');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('clearCsrfToken evicts the cached token', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'token-a', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'token-b', headerName: 'X-XSRF-TOKEN' })
        });

      await getCsrfToken();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      clearCsrfToken();

      const nextToken = await getCsrfToken();
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(nextToken.token).toBe('token-b');
    });

    it('throws AuthApiError when CSRF request fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Server error' })
      });

      await expect(getCsrfToken()).rejects.toThrow(AuthApiError);
    });
  });

  // ==========================================
  // Login CSRF Lifecycle & Errors
  // ==========================================
  describe('login', () => {
    it('fetches initial CSRF, submits credentials with token, and refreshes CSRF on success', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@dentcare.com',
        firstName: 'System',
        lastName: 'Admin',
        phone: null,
        role: 'ADMINISTRATOR'
      };

      global.fetch
        // 1. Initial GET /api/auth/csrf
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'pre-login-csrf', headerName: 'X-XSRF-TOKEN' })
        })
        // 2. POST /api/auth/login
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockUser
        })
        // 3. Post-login GET /api/auth/csrf
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'post-login-csrf', headerName: 'X-XSRF-TOKEN' })
        });

      const user = await login({ email: 'admin@dentcare.com', password: 'ValidPassword123' });

      expect(user).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // Check call 1: GET /api/auth/csrf
      expect(global.fetch.mock.calls[0][0]).toBe('/api/auth/csrf');

      // Check call 2: POST /api/auth/login
      const [loginUrl, loginOpts] = global.fetch.mock.calls[1];
      expect(loginUrl).toBe('/api/auth/login');
      expect(loginOpts.method).toBe('POST');
      expect(loginOpts.credentials).toBe('same-origin');
      expect(loginOpts.headers['X-XSRF-TOKEN']).toBe('pre-login-csrf');
      expect(JSON.parse(loginOpts.body)).toEqual({
        email: 'admin@dentcare.com',
        password: 'ValidPassword123'
      });

      // Check call 3: GET /api/auth/csrf (post-login rotation)
      expect(global.fetch.mock.calls[2][0]).toBe('/api/auth/csrf');

      // Subsequent getCsrfToken must return the replacement post-login token, never the pre-login token
      const currentToken = await getCsrfToken();
      expect(currentToken.token).toBe('post-login-csrf');
      expect(global.fetch).toHaveBeenCalledTimes(3); // No extra network request
    });

    it('completes login successfully even if post-login CSRF refresh fails, leaving cache empty', async () => {
      const mockUser = {
        id: 2,
        email: 'dentist@dentcare.com',
        firstName: 'Doctor',
        lastName: 'Smith',
        role: 'DENTIST'
      };

      global.fetch
        // 1. Initial GET /api/auth/csrf
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'pre-csrf', headerName: 'X-XSRF-TOKEN' })
        })
        // 2. POST /api/auth/login
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockUser
        })
        // 3. Post-login GET /api/auth/csrf fails
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ message: 'CSRF service down' })
        })
        // 4. Later recovery GET /api/auth/csrf
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'recovered-csrf', headerName: 'X-XSRF-TOKEN' })
        });

      const user = await login({ email: 'dentist@dentcare.com', password: 'Password123' });
      expect(user).toEqual(mockUser);

      // Pre-login token was evicted and post-login refresh failed; cache must be empty
      const nextToken = await getCsrfToken();
      expect(nextToken.token).toBe('recovered-csrf');
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it('throws AuthApiError with status 401 on invalid credentials', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'csrf-token' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ message: 'Invalid email or password' })
        });

      await expect(login({ email: 'wrong@example.com', password: 'bad' })).rejects.toThrow(AuthApiError);

      try {
        global.fetch
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ token: 'csrf-token' })
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ message: 'Invalid email or password' })
          });
        await login({ email: 'wrong@example.com', password: 'bad' });
      } catch (err) {
        expect(err.status).toBe(401);
        expect(err.message).toBe('Invalid email or password');
      }
    });

    it('throws AuthApiError with status 400 on validation error', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'csrf-token' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            status: 400,
            message: 'Validation failed for login request',
            fieldErrors: { email: 'Email is required' }
          })
        });

      try {
        await login({ email: '', password: 'pwd' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthApiError);
        expect(err.status).toBe(400);
        expect(err.fieldErrors.email).toBe('Email is required');
      }
    });

    it('throws AuthApiError with status 403 on CSRF failure', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'invalid-token' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            status: 403,
            message: 'Access denied'
          })
        });

      try {
        await login({ email: 'admin@dentcare.com', password: 'pwd' });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthApiError);
        expect(err.status).toBe(403);
      }
    });
  });

  // ==========================================
  // getCurrentUser
  // ==========================================
  describe('getCurrentUser', () => {
    it('returns AuthUserResponse on 200 OK', async () => {
      const mockUser = {
        id: 3,
        email: 'reception@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '1234567890',
        role: 'RECEPTIONIST'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockUser
      });

      const result = await getCurrentUser();
      expect(result).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/me', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' }
      });
    });

    it('returns null when backend responds with 401 and empty body', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => { throw new Error('Unexpected end of JSON input'); }
      });

      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('throws AuthApiError on 500 error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Internal Server Error' })
      });

      await expect(getCurrentUser()).rejects.toThrow(AuthApiError);
    });

    it('throws AuthApiError on network failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      try {
        await getCurrentUser();
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AuthApiError);
        expect(err.status).toBe(0);
      }
    });
  });

  // ==========================================
  // Logout
  // ==========================================
  describe('logout', () => {
    it('ensures CSRF token exists, sends POST /api/auth/logout, and clears cache on 200', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'logout-csrf', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ message: 'Successfully logged out' })
        });

      const success = await logout();
      expect(success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      const [logoutUrl, logoutOpts] = global.fetch.mock.calls[1];
      expect(logoutUrl).toBe('/api/auth/logout');
      expect(logoutOpts.method).toBe('POST');
      expect(logoutOpts.credentials).toBe('same-origin');
      expect(logoutOpts.headers['X-XSRF-TOKEN']).toBe('logout-csrf');
    });

    it('clears cache and returns true on 401 during logout', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'logout-csrf', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          headers: new Headers()
        });

      const success = await logout();
      expect(success).toBe(true);
    });

    it('throws AuthApiError and preserves cache on 403 CSRF failure', async () => {
      // First seed the cache
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ token: 'valid-cache-csrf', headerName: 'X-XSRF-TOKEN' })
      });
      await getCsrfToken();

      // Next call is logout, which returns 403
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Access denied' })
      });

      await expect(logout()).rejects.toThrow(AuthApiError);

      // Cache was NOT cleared
      const cached = await getCsrfToken();
      expect(cached.token).toBe('valid-cache-csrf');
      expect(global.fetch).toHaveBeenCalledTimes(2); // No extra network call
    });

    it('throws AuthApiError on network failure during logout', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'net-csrf', headerName: 'X-XSRF-TOKEN' })
        })
        .mockRejectedValueOnce(new Error('Network disconnected'));

      await expect(logout()).rejects.toThrow(AuthApiError);
    });
  });

  // ==========================================
  // Patient Registration Regression
  // ==========================================
  describe('registerPatient regression', () => {
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
});
