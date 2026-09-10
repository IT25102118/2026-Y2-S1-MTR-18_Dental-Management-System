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
});
