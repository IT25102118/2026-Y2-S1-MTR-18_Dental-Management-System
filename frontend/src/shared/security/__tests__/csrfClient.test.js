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

  // =======================================================
  // Concurrency, Strict Serialization & Invalidation Tests
  // =======================================================

  // Test A (Section 12): Stale waiter rejects as invalidated when clearCsrfToken occurs
  it('rejects original waiter as invalidated when clearCsrfToken occurs while fetch is in-flight', async () => {
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

    // 4. Original waiter must reject as invalidated
    await expect(pA).rejects.toThrow(CsrfError);
    // Cache must remain empty
    expect(getCachedCsrfToken()).toBeNull();
  });

  // Test B (Section 13): Post-clear caller queues behind active physical fetch without network overlap
  it('queues post-clear caller behind active physical fetch without network overlap and updates cache on settlement', async () => {
    const deferredA = createDeferred();
    const deferredB = createDeferred();
    global.fetch
      .mockReturnValueOnce(deferredA.promise)
      .mockReturnValueOnce(deferredB.promise);

    // 1. Start physical network fetch A
    const pA = getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 2. Clear token while A is in-flight
    clearCsrfToken();
    expect(getCachedCsrfToken()).toBeNull();

    // 3. Call getCsrfToken for new generation B
    const pB = getCsrfToken();

    // 4. Assert fetch invocation count is STILL 1 while A unresolved
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 5. Resolve A
    deferredA.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'stale-token-a',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    // 6. Old A caller rejects
    await expect(pA).rejects.toThrow(CsrfError);

    // 7. Now assert second network GET starts
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // 8. Resolve B
    deferredB.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'fresh-token-b',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    // 9. B caller receives token B
    const resB = await pB;
    expect(resB.token).toBe('fresh-token-b');

    // 10. Cache = B
    expect(getCachedCsrfToken()).toBe(resB);
  });

  // Test C (Section 14): Force supersession without network overlap
  it('supersedes active ordinary fetch on forceRefresh without network overlap and delivers fresh token to force caller', async () => {
    const deferredA = createDeferred();
    const deferredB = createDeferred();
    global.fetch
      .mockReturnValueOnce(deferredA.promise)
      .mockReturnValueOnce(deferredB.promise);

    // 1. Ordinary fetch A is active
    const pA = getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 2. Call getCsrfToken({ forceRefresh: true })
    const pB = getCsrfToken({ forceRefresh: true });

    // 3. While A unresolved, network fetch count remains 1
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 4. Resolve A
    deferredA.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'superseded-token-a',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    // 5. A waiter rejects as invalidated
    await expect(pA).rejects.toThrow(CsrfError);

    // 6. Forced fetch B now starts
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // 7. Resolve B
    deferredB.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'forced-token-b',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    // 8. Force caller receives B
    const resB = await pB;
    expect(resB.token).toBe('forced-token-b');

    // 9. Cache = B
    expect(getCachedCsrfToken()).toBe(resB);
  });

  // Test D (Section 15): Strict response order / cookie safety invariant (no overlapping network fetches)
  it('enforces strict serialization so subsequent CSRF network request never starts before predecessor settles', async () => {
    let fetchAActive = false;
    let fetchBStartedWhileAActive = false;

    const deferredA = createDeferred();
    const deferredB = createDeferred();

    global.fetch.mockImplementation((url) => {
      if (url === '/api/auth/csrf') {
        if (!fetchAActive && global.fetch.mock.calls.length === 1) {
          fetchAActive = true;
          return deferredA.promise.finally(() => {
            fetchAActive = false;
          });
        }
        if (fetchAActive) {
          fetchBStartedWhileAActive = true;
        }
        return deferredB.promise;
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const pA = getCsrfToken();
    clearCsrfToken();
    const pB = getCsrfToken();

    // While A is physically pending, B must not have started
    expect(fetchAActive).toBe(true);
    expect(fetchBStartedWhileAActive).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    deferredA.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ token: 'token-a', headerName: 'X-XSRF-TOKEN' })
    });

    await expect(pA).rejects.toThrow(CsrfError);

    // Now A has settled, B can start
    expect(fetchAActive).toBe(false);
    expect(fetchBStartedWhileAActive).toBe(false);
    expect(global.fetch).toHaveBeenCalledTimes(2);

    deferredB.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ token: 'token-b', headerName: 'X-XSRF-TOKEN' })
    });

    const resB = await pB;
    expect(resB.token).toBe('token-b');
    expect(fetchBStartedWhileAActive).toBe(false);
  });

  // Test E (Section 16): Forced refresh with cache — concurrent ordinary caller joins B
  it('shares in-flight forced refresh with concurrent ordinary callers without returning stale cached token', async () => {
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
    // Concurrent ordinary caller arrives while B is active
    const pConcurrentOrdinary = getCsrfToken();

    // Exactly one B network request
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

  // Test F (Section 17): Failure + queue recovery
  it('recovers serialization queue when invalidated predecessor network fetch fails, allowing queued fetch to succeed', async () => {
    const deferredA = createDeferred();
    const deferredB = createDeferred();
    global.fetch
      .mockReturnValueOnce(deferredA.promise)
      .mockReturnValueOnce(deferredB.promise);

    // 1. Old invalidated A is active
    const pA = getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    clearCsrfToken();

    // 2. New-generation B is queued
    const pB = getCsrfToken();
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // 3. A network request fails
    deferredA.reject(new Error('Network drop on fetch A'));

    // 4. Old A waiter rejects
    await expect(pA).rejects.toThrow(CsrfError);

    // 5. Queue is not deadlocked: B still starts after A settles
    expect(global.fetch).toHaveBeenCalledTimes(2);

    // 6. B can succeed
    deferredB.resolve({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        token: 'token-b-after-failure',
        headerName: 'X-XSRF-TOKEN'
      })
    });

    const resB = await pB;
    expect(resB.token).toBe('token-b-after-failure');

    // 7. B becomes cache
    expect(getCachedCsrfToken()).toBe(resB);
  });
});
