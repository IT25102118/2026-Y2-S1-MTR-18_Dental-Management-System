import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  updateItemStatus,
  InventoryApiError,
  normalizePage
} from '../api/inventoryApi';
import {
  getCsrfToken,
  clearCsrfToken,
  getCachedCsrfToken
} from '../../../shared/security/csrfClient';
import {
  getCsrfToken as authGetCsrfToken,
  registerPatient
} from '../../auth/api/authApi';

describe('inventoryApi client', () => {
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

  describe('getItems', () => {
    it('constructs query URL with search, pagination, and sorting', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [{ id: 1, itemCode: 'ITM-001', name: 'Dental Mirror' }],
          number: 0,
          size: 20,
          totalPages: 1,
          totalElements: 1
        })
      });

      const res = await getItems({
        search: 'mirror',
        page: 0,
        size: 20,
        sort: 'name,asc'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items?search=mirror&page=0&size=20&sort=name%2Casc',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.content).toHaveLength(1);
      expect(res.content[0].itemCode).toBe('ITM-001');
      expect(res.number).toBe(0);
      expect(res.totalPages).toBe(1);
    });

    it('omits empty, null, or undefined parameters from query string', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ content: [] })
      });

      await getItems({
        search: '',
        category: '   ',
        active: undefined,
        stockStatus: 'ALL'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items?page=0&size=20&sort=name%2Casc',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('preserves active=false and does not drop falsy boolean values', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ content: [] })
      });

      await getItems({ active: false });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('active=false'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('preserves active=true in query string', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ content: [] })
      });

      await getItems({ active: true });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('active=true'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('encodes category and valid stockStatus enums', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ content: [] })
      });

      await getItems({
        category: 'Diagnostic',
        stockStatus: 'LOW_STOCK'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('category=Diagnostic&stockStatus=LOW_STOCK'),
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('getItemById', () => {
    it('fetches single item by ID', async () => {
      const mockItem = { id: 42, itemCode: 'ITM-042', name: 'Probe' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockItem
      });

      const res = await getItemById(42);
      expect(global.fetch).toHaveBeenCalledWith('/api/inventory/items/42', expect.objectContaining({ method: 'GET' }));
      expect(res).toEqual(mockItem);
    });
  });

  describe('createItem', () => {
    it('obtains CSRF, sends POST request with same-origin credentials, CSRF header, and only allowed fields', async () => {
      const createdItem = { id: 1, itemCode: 'ITM-001', name: 'Cotton Roll' };
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'inv-csrf-1', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => createdItem
        });

      const payload = {
        itemCode: 'ITM-001',
        name: 'Cotton Roll',
        category: 'Consumable',
        unit: 'pack',
        reorderLevel: 10,
        defaultSupplierReference: 'SUP-99',
        // Disallowed / extraneous fields that must be stripped:
        id: 999,
        currentQuantity: 50,
        active: false,
        version: 1
      };

      const res = await createItem(payload);

      expect(global.fetch).toHaveBeenCalledTimes(2);

      // 1. First fetch obtained CSRF
      const [csrfUrl, csrfOpts] = global.fetch.mock.calls[0];
      expect(csrfUrl).toBe('/api/auth/csrf');
      expect(csrfOpts.credentials).toBe('same-origin');

      // 2. Second fetch sent POST with CSRF header
      const [postUrl, postOpts] = global.fetch.mock.calls[1];
      expect(postUrl).toBe('/api/inventory/items');
      expect(postOpts.method).toBe('POST');
      expect(postOpts.credentials).toBe('same-origin');
      expect(postOpts.headers).toEqual(expect.objectContaining({
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': 'inv-csrf-1'
      }));
      expect(postOpts.body).toBe(JSON.stringify({
        itemCode: 'ITM-001',
        name: 'Cotton Roll',
        category: 'Consumable',
        unit: 'pack',
        reorderLevel: 10,
        defaultSupplierReference: 'SUP-99'
      }));
      expect(res).toEqual(createdItem);
    });

    it('reuses cached CSRF token without fetching from network again', async () => {
      // Warm the cache
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ token: 'pre-cached-token', headerName: 'X-XSRF-TOKEN' })
      });
      await getCsrfToken();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Next mutation should use the cached token directly
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 2, itemCode: 'ITM-002', name: 'Gauze' })
      });

      await createItem({ itemCode: 'ITM-002', name: 'Gauze', reorderLevel: 5 });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      const [, postOpts] = global.fetch.mock.calls[1];
      expect(postOpts.headers['X-XSRF-TOKEN']).toBe('pre-cached-token');
    });

    it('normalizes whitespace-only defaultSupplierReference to null in createItem', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'create-csrf', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: 3, itemCode: 'ITM-003', name: 'Mask' })
        });

      await createItem({
        itemCode: 'ITM-003',
        name: 'Mask',
        category: 'Safety',
        unit: 'box',
        reorderLevel: 0,
        defaultSupplierReference: '   '
      });

      const [, postOpts] = global.fetch.mock.calls[1];
      const parsedBody = JSON.parse(postOpts.body);
      expect(parsedBody.defaultSupplierReference).toBeNull();
      expect(parsedBody.reorderLevel).toBe(0);
    });
  });

  describe('updateItem', () => {
    it('obtains CSRF, sends PUT request with same-origin credentials, CSRF header, allowed fields, and strips itemCode', async () => {
      const updatedItem = { id: 1, itemCode: 'ITM-001', name: 'Updated Name' };
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'put-csrf-token', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => updatedItem
        });

      const payload = {
        itemCode: 'SHOULD_NOT_BE_SENT',
        name: 'Updated Name',
        category: 'Diagnostic',
        unit: 'piece',
        reorderLevel: 15,
        defaultSupplierReference: 'SUP-01',
        currentQuantity: 100
      };

      const res = await updateItem(1, payload);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      const [putUrl, putOpts] = global.fetch.mock.calls[1];
      expect(putUrl).toBe('/api/inventory/items/1');
      expect(putOpts.method).toBe('PUT');
      expect(putOpts.credentials).toBe('same-origin');
      expect(putOpts.headers).toEqual(expect.objectContaining({
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': 'put-csrf-token'
      }));
      expect(putOpts.body).toBe(JSON.stringify({
        name: 'Updated Name',
        category: 'Diagnostic',
        unit: 'piece',
        reorderLevel: 15,
        defaultSupplierReference: 'SUP-01'
      }));
      expect(res).toEqual(updatedItem);
    });

    it('normalizes whitespace-only defaultSupplierReference to null in updateItem', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'put-csrf-token', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: 1, name: 'Updated Name' })
        });

      await updateItem(1, {
        name: 'Updated Name',
        category: 'Diagnostic',
        unit: 'piece',
        reorderLevel: 0,
        defaultSupplierReference: '   '
      });

      const [, putOpts] = global.fetch.mock.calls[1];
      const parsedBody = JSON.parse(putOpts.body);
      expect(parsedBody.defaultSupplierReference).toBeNull();
      expect(parsedBody.reorderLevel).toBe(0);
    });
  });

  describe('updateItemStatus', () => {
    it('obtains CSRF and sends PATCH request with { active: false }, credentials and CSRF header', async () => {
      const responseItem = { id: 1, active: false };
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'patch-csrf-token', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => responseItem
        });

      const res = await updateItemStatus(1, false);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      const [patchUrl, patchOpts] = global.fetch.mock.calls[1];
      expect(patchUrl).toBe('/api/inventory/items/1/status');
      expect(patchOpts.method).toBe('PATCH');
      expect(patchOpts.credentials).toBe('same-origin');
      expect(patchOpts.headers).toEqual(expect.objectContaining({
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': 'patch-csrf-token'
      }));
      expect(patchOpts.body).toBe(JSON.stringify({ active: false }));
      expect(res.active).toBe(false);
    });

    it('sends PATCH request with { active: true } using cached CSRF token', async () => {
      const responseItem = { id: 1, active: true };
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'patch-csrf-token', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => responseItem
        });

      const res = await updateItemStatus(1, true);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      const [, patchOpts] = global.fetch.mock.calls[1];
      expect(patchOpts.body).toBe(JSON.stringify({ active: true }));
      expect(res.active).toBe(true);
    });
  });

  describe('Error normalization', () => {
    it('normalizes 400 Bad Request with fieldErrors', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'csrf-err-test', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            status: 400,
            error: 'Bad Request',
            message: 'Validation failed',
            fieldErrors: {
              itemCode: 'Item code is required',
              reorderLevel: 'Reorder level must be greater than or equal to zero'
            }
          })
        });

      try {
        await createItem({});
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryApiError);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Validation failed');
        expect(err.fieldErrors.itemCode).toBe('Item code is required');
        expect(err.fieldErrors.reorderLevel).toBe('Reorder level must be greater than or equal to zero');
      }
    });

    it('normalizes 404 Not Found error', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 404,
          error: 'Not Found',
          message: 'Inventory item not found with ID: 99'
        })
      });

      try {
        await getItemById(99);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryApiError);
        expect(err.status).toBe(404);
        expect(err.message).toContain('Inventory item not found');
      }
    });

    it('normalizes 409 Conflict error for duplicate item code', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'csrf-err-test', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          statusText: 'Conflict',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            status: 409,
            error: 'Conflict',
            message: "An inventory item with code 'ITM-001' already exists"
          })
        });

      try {
        await createItem({ itemCode: 'ITM-001' });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryApiError);
        expect(err.status).toBe(409);
        expect(err.message).toContain('already exists');
      }
    });

    it('normalizes network exceptions into InventoryApiError safely', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      try {
        await getItems();
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryApiError);
        expect(err.status).toBe(0);
        expect(err.error).toBe('NetworkError');
      }
    });

    it('clears shared CSRF cache and surfaces InventoryApiError on 403 without automatic retry', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'csrf-to-be-cleared', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            status: 403,
            error: 'Forbidden',
            message: 'Invalid CSRF token'
          })
        });

      try {
        await updateItem(1, { name: 'Item' });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryApiError);
        expect(err.status).toBe(403);
        expect(err.message).toBe('Invalid CSRF token');
      }

      // Exactly 2 calls (1 CSRF + 1 PUT), NO automatic retry
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Shared CSRF cache is cleared
      expect(getCachedCsrfToken()).toBeNull();
    });

    it('throws InventoryApiError when CSRF token fetch fails during mutation', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers()
      });

      try {
        await createItem({ itemCode: 'ITM-001' });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InventoryApiError);
        expect(err.error).toBe('CsrfError');
      }

      // Mutation POST was never attempted
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('normalizePage helper', () => {
    it('provides safe defaults when input is empty or null', () => {
      const page = normalizePage(null);
      expect(page.content).toEqual([]);
      expect(page.number).toBe(0);
      expect(page.totalPages).toBe(0);
      expect(page.totalElements).toBe(0);
      expect(page.first).toBe(true);
      expect(page.last).toBe(true);
      expect(page.empty).toBe(true);
    });
  });

  describe('D3 CSRF cache coherence with Auth', () => {
    it('shares the single in-memory CSRF cache between Inventory and Auth operations', async () => {
      // 1. Inventory createItem fetches CSRF token
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'shared-d3-token', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ id: 1, itemCode: 'ITM-01', name: 'Item' })
        });

      await createItem({ itemCode: 'ITM-01', name: 'Item', reorderLevel: 5 });
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // 2. Auth getCsrfToken sees the same cached token without network
      const authCsrf = await authGetCsrfToken();
      expect(authCsrf.token).toBe('shared-d3-token');
      expect(global.fetch).toHaveBeenCalledTimes(2); // No extra network call!

      // 3. Registering patient uses this exact cached token without another GET /api/auth/csrf
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ id: 10, email: 'coherence@example.com' })
      });

      await registerPatient({
        firstName: 'Coherent',
        lastName: 'Patient',
        email: 'coherence@example.com',
        password: 'Password123'
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
      const [, regOpts] = global.fetch.mock.calls[2];
      expect(regOpts.headers['X-XSRF-TOKEN']).toBe('shared-d3-token');
    });

    it('clears shared cache across all modules when Inventory receives 403', async () => {
      // Seed cache
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ token: 'to-be-evicted', headerName: 'X-XSRF-TOKEN' })
      });
      await authGetCsrfToken();
      expect(getCachedCsrfToken().token).toBe('to-be-evicted');

      // Inventory mutation returns 403
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ status: 403, message: 'Invalid CSRF token' })
      });

      await expect(updateItemStatus(1, false)).rejects.toThrow(InventoryApiError);

      // Cache is cleared for both Auth and Inventory
      expect(getCachedCsrfToken()).toBeNull();

      // Next Auth call must fetch a new token
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ token: 'brand-new-token', headerName: 'X-XSRF-TOKEN' })
      });

      const freshToken = await authGetCsrfToken();
      expect(freshToken.token).toBe('brand-new-token');
    });
  });
});
