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
let inFlightPromise = null;
let inFlightIsForced = false;
let csrfGeneration = 0;

/**
 * Clears the in-memory CSRF token cache and invalidates any in-flight fetch
 * so it cannot repopulate the cache upon completion.
 */
export function clearCsrfToken() {
  cachedCsrfToken = null;
  inFlightPromise = null;
  inFlightIsForced = false;
  csrfGeneration++;
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
 * Deduplicates concurrent in-flight fetches so multiple callers share a single network request.
 *
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false] If true, bypasses the cache and issues a fresh network request.
 * @returns {Promise<{token: string, headerName: string, parameterName: string}>}
 */
export async function getCsrfToken({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    if (inFlightPromise !== null) {
      return inFlightPromise;
    }
    if (cachedCsrfToken !== null) {
      return cachedCsrfToken;
    }
  } else {
    if (inFlightPromise !== null && inFlightIsForced) {
      return inFlightPromise;
    }
  }

  const isForced = forceRefresh;
  const capturedGeneration = ++csrfGeneration;
  inFlightIsForced = isForced;

  const fetchPromise = (async () => {
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

    const tokenData = {
      token: data.token,
      headerName: data.headerName || 'X-XSRF-TOKEN',
      parameterName: data.parameterName || '_csrf'
    };

    // Only commit to cache if this fetch has not been invalidated by clearCsrfToken or superseded
    if (capturedGeneration === csrfGeneration) {
      cachedCsrfToken = tokenData;
    }

    return tokenData;
  })();

  inFlightPromise = fetchPromise;

  try {
    return await fetchPromise;
  } finally {
    if (inFlightPromise === fetchPromise) {
      inFlightPromise = null;
      inFlightIsForced = false;
    }
  }
}
