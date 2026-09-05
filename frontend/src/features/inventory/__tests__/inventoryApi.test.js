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

describe('inventoryApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
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
    it('sends POST request with only CreateInventoryItemRequest allowed fields', async () => {
      const createdItem = { id: 1, itemCode: 'ITM-001', name: 'Cotton Roll' };
      global.fetch.mockResolvedValueOnce({
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

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            itemCode: 'ITM-001',
            name: 'Cotton Roll',
            category: 'Consumable',
            unit: 'pack',
            reorderLevel: 10,
            defaultSupplierReference: 'SUP-99'
          })
        })
      );
      expect(res).toEqual(createdItem);
    });
  });

  describe('updateItem', () => {
    it('sends PUT request with only UpdateInventoryItemRequest allowed fields and strips itemCode', async () => {
      const updatedItem = { id: 1, itemCode: 'ITM-001', name: 'Updated Name' };
      global.fetch.mockResolvedValueOnce({
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

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items/1',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            name: 'Updated Name',
            category: 'Diagnostic',
            unit: 'piece',
            reorderLevel: 15,
            defaultSupplierReference: 'SUP-01'
          })
        })
      );
      expect(res).toEqual(updatedItem);
    });
  });

  describe('updateItemStatus', () => {
    it('sends PATCH request with { active: false }', async () => {
      const responseItem = { id: 1, active: false };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => responseItem
      });

      const res = await updateItemStatus(1, false);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items/1/status',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ active: false })
        })
      );
      expect(res.active).toBe(false);
    });

    it('sends PATCH request with { active: true }', async () => {
      const responseItem = { id: 1, active: true };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => responseItem
      });

      const res = await updateItemStatus(1, true);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items/1/status',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ active: true })
        })
      );
      expect(res.active).toBe(true);
    });
  });

  describe('Error normalization', () => {
    it('normalizes 400 Bad Request with fieldErrors', async () => {
      global.fetch.mockResolvedValueOnce({
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
      global.fetch.mockResolvedValueOnce({
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
});
