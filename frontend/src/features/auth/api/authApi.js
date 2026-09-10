/**
 * API client for Patient Authentication and Self-Registration.
 * Communicates with backend /api/auth endpoints.
 */

export class AuthApiError extends Error {
  constructor(status, message, fieldErrors = {}, error = null) {
    super(message || `Authentication error (${status})`);
    this.name = 'AuthApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
  }
}

import {
  getCsrfToken as sharedGetCsrfToken,
  clearCsrfToken,
  CsrfError
} from '../../../shared/security/csrfClient';

export { clearCsrfToken };

/**
 * Safely parses response body as JSON if content-type indicates JSON or if parsing succeeds.
 */
async function parseResponseBody(response) {
  const contentType = response.headers?.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetches the CSRF token from the server or returns the in-memory cached token.
 *
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false] If true, bypasses the cache and issues a network request.
 * @returns {Promise<{token: string, headerName: string, parameterName: string}>}
 */
export async function getCsrfToken(options) {
  try {
    return await sharedGetCsrfToken(options);
  } catch (err) {
    if (err instanceof CsrfError) {
      throw new AuthApiError(err.status, err.message, err.fieldErrors, err.error);
    }
    throw err;
  }
}

/**
 * Authenticates user credentials with email and password.
 * Coordinates CSRF acquisition, token rotation upon login, and safe error categorization.
 *
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<Object>} Safe AuthUserResponse
 */
export async function login(credentials) {
  const email = credentials?.email?.trim() || '';
  const password = credentials?.password || '';

  const csrf = await getCsrfToken();

  let response;
  try {
    response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        [csrf.headerName]: csrf.token
      },
      body: JSON.stringify({ email, password })
    });
  } catch (err) {
    throw new AuthApiError(
      0,
      err.message || 'Unable to communicate with the authentication service. Please check your network connection.',
      {},
      'NetworkError'
    );
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const status = response.status;
    if (status === 401) {
      throw new AuthApiError(
        401,
        data?.message || 'Invalid email or password',
        data?.fieldErrors,
        data?.error || 'Unauthorized'
      );
    }
    if (status === 400) {
      throw new AuthApiError(
        400,
        data?.message || 'Validation failed for login request',
        data?.fieldErrors,
        data?.error || 'BadRequest'
      );
    }
    if (status === 403) {
      throw new AuthApiError(
        403,
        data?.message || 'Security validation failed',
        data?.fieldErrors,
        data?.error || 'Forbidden'
      );
    }
    throw new AuthApiError(
      status,
      data?.message || `Login failed with status ${status}`,
      data?.fieldErrors,
      data?.error || 'LoginError'
    );
  }

  // Pre-login cache is invalidated upon successful authentication.
  clearCsrfToken();

  // Attempt forced CSRF refresh to cache replacement authenticated-session token.
  try {
    await getCsrfToken({ forceRefresh: true });
  } catch {
    // If post-login CSRF refresh fails, leave cache empty.
    // Do NOT fail the login since authentication succeeded on the server.
    clearCsrfToken();
  }

  return data;
}

/**
 * Retrieves the currently authenticated user's profile from the session SecurityContext.
 *
 * @returns {Promise<Object|null>} AuthUserResponse if authenticated, null if unauthenticated (401).
 */
export async function getCurrentUser() {
  let response;
  try {
    response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch (err) {
    throw new AuthApiError(
      0,
      err.message || 'Unable to communicate with the authentication service. Please check your network connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 401) {
    return null;
  }

  const data = await parseResponseBody(response);

  if (!response.ok) {
    const status = response.status;
    throw new AuthApiError(
      status,
      data?.message || `Failed to fetch current user (${status})`,
      data?.fieldErrors,
      data?.error || 'CurrentUserError'
    );
  }

  return data;
}

/**
 * Terminates the authenticated user session.
 *
 * @returns {Promise<boolean>}
 */
export async function logout() {
  const csrf = await getCsrfToken();

  let response;
  try {
    response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        [csrf.headerName]: csrf.token
      }
    });
  } catch (err) {
    throw new AuthApiError(
      0,
      err.message || 'Unable to communicate with the authentication service. Please check your network connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 200 || response.status === 401) {
    clearCsrfToken();
    return true;
  }

  const data = await parseResponseBody(response);
  const status = response.status;
  throw new AuthApiError(
    status,
    data?.message || `Logout failed with status ${status}`,
    data?.fieldErrors,
    data?.error || 'LogoutError'
  );
}

/**
 * Submits a new patient self-registration request.
 *
 * @param {Object} registrationData
 * @param {string} registrationData.firstName
 * @param {string} registrationData.lastName
 * @param {string} registrationData.email
 * @param {string} [registrationData.phone]
 * @param {string} registrationData.password
 * @returns {Promise<Object>} Created patient account response DTO
 */
export async function registerPatient(registrationData) {
  const payload = {
    firstName: registrationData.firstName?.trim() || '',
    lastName: registrationData.lastName?.trim() || '',
    email: registrationData.email?.trim() || '',
    password: registrationData.password || ''
  };

  if (registrationData.phone !== undefined && registrationData.phone !== null && registrationData.phone.trim() !== '') {
    payload.phone = registrationData.phone.trim();
  }

  let response;
  try {
    response = await fetch('/api/auth/register/patient', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    throw new AuthApiError(
      0,
      err.message || 'Unable to communicate with the authentication service. Please check your network connection.',
      {},
      'NetworkError'
    );
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const status = response.status;
    const message = data?.message || `Registration failed with status ${status}`;
    const fieldErrors = data?.fieldErrors || {};
    const errorType = data?.error || 'RegistrationError';
    throw new AuthApiError(status, message, fieldErrors, errorType);
  }

  return data;
}
