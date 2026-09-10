/**
 * Generic in-memory CSRF client for DentCare frontend applications.
 *
 * Provides a single authoritative source of truth for CSRF token acquisition,
 * in-memory caching, and cache eviction across all feature modules.
 */

export class CsrfError extends Error {
  constructor(status, message, fieldErrors = {}, error = null) {
    super(message || `CSRF error (${status})`);
    this.name = 'CsrfError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
  }
}

let cachedCsrfToken = null;

/**
 * Clears the in-memory CSRF token cache.
 */
export function clearCsrfToken() {
  cachedCsrfToken = null;
}

/**
 * Returns the currently cached CSRF token metadata without issuing a network request.
 *
 * @returns {{ token: string, headerName: string, parameterName: string } | null}
 */
export function getCachedCsrfToken() {
  return cachedCsrfToken;
}

/**
 * Safely parses response body as JSON.
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
 * Fetches the CSRF token from /api/auth/csrf or returns the in-memory cached token.
 *
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false] If true, bypasses the cache and issues a fresh network request.
 * @returns {Promise<{token: string, headerName: string, parameterName: string}>}
 */
export async function getCsrfToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedCsrfToken !== null) {
    return cachedCsrfToken;
  }

  let response;
  try {
    response = await fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json'
      }
    });
  } catch (err) {
    throw new CsrfError(
      0,
      err.message || 'Unable to communicate with the authentication service. Please check your network connection.',
      {},
      'NetworkError'
    );
  }

  const data = await parseResponseBody(response);

  if (!response.ok || !data?.token) {
    const status = response.status;
    const message = data?.message || `Failed to obtain CSRF token (${status})`;
    throw new CsrfError(status, message, data?.fieldErrors, data?.error || 'CsrfError');
  }

  cachedCsrfToken = {
    token: data.token,
    headerName: data.headerName || 'X-XSRF-TOKEN',
    parameterName: data.parameterName || '_csrf'
  };

  return cachedCsrfToken;
}
