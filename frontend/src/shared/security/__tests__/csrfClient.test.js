import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCsrfToken,
  clearCsrfToken,
  getCachedCsrfToken,
  CsrfError
} from '../csrfClient';

describe('shared csrfClient', () => {
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

  it('fetches CSRF token via GET /api/auth/csrf and caches it', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'shared-csrf-token-1',
        headerName: 'X-XSRF-TOKEN',
        parameterName: '_csrf'
      })
    });

    expect(getCachedCsrfToken()).toBeNull();

    const tokenData1 = await getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/auth/csrf');
    expect(options.method).toBe('GET');
    expect(options.credentials).toBe('same-origin');
    expect(tokenData1.token).toBe('shared-csrf-token-1');
    expect(tokenData1.headerName).toBe('X-XSRF-TOKEN');
    expect(getCachedCsrfToken()).toBe(tokenData1);

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
        json: async () => ({ token: 'shared-token-v1', headerName: 'X-XSRF-TOKEN' })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ token: 'shared-token-v2', headerName: 'X-XSRF-TOKEN' })
      });

    const t1 = await getCsrfToken();
    expect(t1.token).toBe('shared-token-v1');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const t2 = await getCsrfToken({ forceRefresh: true });
    expect(t2.token).toBe('shared-token-v2');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('clearCsrfToken evicts the cached token', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ token: 'shared-token-a', headerName: 'X-XSRF-TOKEN' })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ token: 'shared-token-b', headerName: 'X-XSRF-TOKEN' })
      });

    await getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    clearCsrfToken();
    expect(getCachedCsrfToken()).toBeNull();

    const nextToken = await getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(nextToken.token).toBe('shared-token-b');
  });

  it('throws CsrfError with status 0 on network failure', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(getCsrfToken()).rejects.toThrow(CsrfError);
  });

  it('throws CsrfError on HTTP error status from /api/auth/csrf', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Server error' })
    });

    await expect(getCsrfToken()).rejects.toThrow(CsrfError);
  });

  // ==========================================
  // Concurrency & Invalidation Tests
  // ==========================================
  function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  // Test A: Two cold-cache calls share a single network request
  it('deduplicates concurrent cold-cache calls into a single in-flight network request', async () => {
    const deferred = createDeferred();
    global.fetch.mockReturnValueOnce(deferred.promise);

    expect(getCachedCsrfToken()).toBeNull();

    const p1 = getCsrfToken();
    const p2 = getCsrfToken();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    deferred.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'token-a',
        headerName: 'X-XSRF-TOKEN',
        parameterName: '_csrf'
      })
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toEqual({
      token: 'token-a',
      headerName: 'X-XSRF-TOKEN',
      parameterName: '_csrf'
    });
    expect(r2).toBe(r1);
    expect(getCachedCsrfToken()).toBe(r1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // Test B: Shared failure propagates to all waiters and clears in-flight state
  it('propagates network failure to all concurrent waiters and clears in-flight state so later callers can retry', async () => {
    const deferred = createDeferred();
    global.fetch.mockReturnValueOnce(deferred.promise);

    const p1 = getCsrfToken();
    const p2 = getCsrfToken();

    expect(global.fetch).toHaveBeenCalledTimes(1);

    deferred.reject(new Error('Network disconnected'));

    await Promise.all([
      expect(p1).rejects.toThrow(CsrfError),
      expect(p2).rejects.toThrow(CsrfError)
    ]);

    expect(getCachedCsrfToken()).toBeNull();

    // Later caller should initiate a new network request successfully
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'recovered-token',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    const retryResult = await getCsrfToken();
    expect(retryResult.token).toBe('recovered-token');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(getCachedCsrfToken()).toBe(retryResult);
  });

  // Test C: clearCsrfToken prevents in-flight fetch from populating cache
  it('prevents an in-flight fetch started before clearCsrfToken from repopulating the cache after clear', async () => {
    const deferredA = createDeferred();
    global.fetch.mockReturnValueOnce(deferredA.promise);

    // 1. Start fetch A
    const pA = getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 2. Clear token while fetch A is in-flight
    clearCsrfToken();
    expect(getCachedCsrfToken()).toBeNull();

    // 3. Resolve fetch A with stale token A
    deferredA.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'stale-token-a',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    const resA = await pA;
    expect(resA.token).toBe('stale-token-a');
    // Old token must NOT repopulate cache!
    expect(getCachedCsrfToken()).toBeNull();

    // 4. Next caller starts fetch B and sets cache
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'fresh-token-b',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    const resB = await getCsrfToken();
    expect(resB.token).toBe('fresh-token-b');
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(getCachedCsrfToken()).toBe(resB);
  });

  // Test D: forceRefresh bypasses cache and concurrent ordinary callers share it
  it('bypasses cached token on forceRefresh and shares in-flight forced request with concurrent callers', async () => {
    // Prime cache with token A
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'initial-token-a',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    const initial = await getCsrfToken();
    expect(initial.token).toBe('initial-token-a');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Start forced refresh with deferred network response
    const deferredB = createDeferred();
    global.fetch.mockReturnValueOnce(deferredB.promise);

    const pForced = getCsrfToken({ forceRefresh: true });
    // Concurrent ordinary caller should await the forced in-flight request rather than returning stale token A
    const pConcurrentOrdinary = getCsrfToken();

    expect(global.fetch).toHaveBeenCalledTimes(2);

    deferredB.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'refreshed-token-b',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    const [resForced, resOrdinary] = await Promise.all([pForced, pConcurrentOrdinary]);
    expect(resForced.token).toBe('refreshed-token-b');
    expect(resOrdinary.token).toBe('refreshed-token-b');
    expect(resOrdinary).toBe(resForced);
    expect(getCachedCsrfToken()).toBe(resForced);
  });
});
