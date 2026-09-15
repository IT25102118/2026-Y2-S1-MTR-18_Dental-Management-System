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
let csrfGeneration = 0;

let activeAuthoritativePromise = null;
let activeAuthoritativeGeneration = 0;
let activeAuthoritativeIsForced = false;

let physicalTail = null;

/**
 * Clears the in-memory CSRF token cache and invalidates any in-flight fetch
 * so its callers reject safely and it cannot repopulate the cache upon completion.
 * Retains the physical network serialization barrier so overlapping HTTP requests
 * are strictly prevented.
 */
export function clearCsrfToken() {
  cachedCsrfToken = null;
  csrfGeneration++;
  activeAuthoritativePromise = null;
  activeAuthoritativeGeneration = 0;
  activeAuthoritativeIsForced = false;
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
 * Strictly serializes physical network fetches to ensure at most one GET /api/auth/csrf is in flight.
 * Safely invalidates waiters of superseded generations so stale tokens are never returned.
 *
 * @param {Object} [options]
 * @param {boolean} [options.forceRefresh=false] If true, bypasses the cache and issues a fresh network request.
 * @returns {Promise<{token: string, headerName: string, parameterName: string}>}
 */
export async function getCsrfToken({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    if (activeAuthoritativePromise !== null && activeAuthoritativeGeneration === csrfGeneration) {
      return activeAuthoritativePromise;
    }
    if (cachedCsrfToken !== null) {
      return cachedCsrfToken;
    }
  } else {
    if (
      activeAuthoritativePromise !== null &&
      activeAuthoritativeGeneration === csrfGeneration &&
      activeAuthoritativeIsForced
    ) {
      return activeAuthoritativePromise;
    }
  }

  const isForced = forceRefresh;

  if (isForced) {
    cachedCsrfToken = null;
    if (activeAuthoritativePromise !== null && !activeAuthoritativeIsForced) {
      csrfGeneration++;
    }
  }

  const generation = ++csrfGeneration;

  // Network serialization barrier: chain behind any physically active request
  const prevTail = physicalTail;
  let releaseBarrier;
  const currentBarrier = new Promise((resolve) => {
    releaseBarrier = resolve;
  });
  physicalTail = currentBarrier;

  const runPhysicalFetch = async () => {
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

    if (generation !== csrfGeneration) {
      throw new CsrfError(
        0,
        'CSRF token fetch was invalidated due to session change or token refresh.',
        {},
        'CsrfInvalidated'
      );
    }

    cachedCsrfToken = tokenData;
    return tokenData;
  };

  const fetchPromise = (async () => {
    try {
      if (prevTail !== null) {
        try {
          await prevTail;
        } catch {
          // Predecessor failure must not poison our queued request
        }
        if (generation !== csrfGeneration) {
          throw new CsrfError(
            0,
            'CSRF token fetch was invalidated due to session change or token refresh.',
            {},
            'CsrfInvalidated'
          );
        }
      }
      return await runPhysicalFetch();
    } finally {
      releaseBarrier();
      if (physicalTail === currentBarrier) {
        physicalTail = null;
      }
      if (activeAuthoritativePromise === fetchPromise) {
        activeAuthoritativePromise = null;
        activeAuthoritativeGeneration = 0;
        activeAuthoritativeIsForced = false;
      }
    }
  })();

  activeAuthoritativePromise = fetchPromise;
  activeAuthoritativeGeneration = generation;
  activeAuthoritativeIsForced = isForced;

  try {
    return await fetchPromise;
  } finally {
    if (activeAuthoritativePromise === fetchPromise) {
      activeAuthoritativePromise = null;
      activeAuthoritativeGeneration = 0;
      activeAuthoritativeIsForced = false;
    }
  }
}
