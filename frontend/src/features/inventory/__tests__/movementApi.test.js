import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getItemMovements,
  getItemBatches,
  searchBatches,
  recordStockMovement,
  reverseStockMovement
} from '../api/movementApi';
import { InventoryApiError } from '../api/inventoryApi';
import { clearCsrfToken } from '../../../shared/security/csrfClient';

describe('movementApi client', () => {
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

  describe('getItemMovements', () => {
    it('constructs correct URL with item ID, movementType, pagination, and sorting', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [
            {
              id: 101,
              inventoryItemId: 1,
              itemCode: 'ITM-001',
              itemName: 'Dental Mirror',
              movementType: 'RECEIVED',
              adjustmentDirection: null,
              quantity: 20,
              quantityDelta: 20,
              resultingQuantity: 20,
              occurredAt: '2026-09-01T12:00:00',
              reason: 'Initial stock receipt',
              responsibleUserId: 5,
              reversalOfMovementId: null,
              treatmentProcedureId: null,
              batchNumber: 'BATCH-2026-A',
              expiryDate: '2027-12-31',
              inventoryBatchId: 10
            }
          ],
          number: 0,
          size: 20,
          totalPages: 1,
          totalElements: 1
        })
      });

      const res = await getItemMovements(1, {
        movementType: 'RECEIVED',
        page: 0,
        size: 20,
        sort: 'occurredAt,desc'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items/1/movements?movementType=RECEIVED&page=0&size=20&sort=occurredAt%2Cdesc',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.content).toHaveLength(1);
      expect(res.content[0].batchNumber).toBe('BATCH-2026-A');
      expect(res.content[0].responsibleUserId).toBe(5);
    });

    it('omits movementType query parameter when ALL or undefined', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [],
          number: 0,
          size: 20,
          totalPages: 0,
          totalElements: 0
        })
      });

      await getItemMovements(1, { movementType: 'ALL' });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items/1/movements?page=0&size=20&sort=occurredAt%2Cdesc',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('handles HTTP error responses and throws InventoryApiError', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 404,
          error: 'Not Found',
          message: 'Inventory item 999 not found'
        })
      });

      await expect(getItemMovements(999)).rejects.toThrow(InventoryApiError);
    });
  });

  describe('getItemBatches', () => {
    it('constructs correct URL with positiveStockOnly parameter', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [
            {
              id: 10,
              inventoryItemId: 1,
              itemCode: 'ITM-001',
              itemName: 'Dental Mirror',
              batchNumber: 'BATCH-2026-A',
              expiryDate: '2027-12-31',
              quantityOnHand: 25,
              receivedDate: '2026-09-01',
              supplierReference: 'SUPP-01'
            }
          ],
          number: 0,
          size: 50,
          totalPages: 1,
          totalElements: 1
        })
      });

      const res = await getItemBatches(1, { positiveStockOnly: true });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/items/1/batches?positiveStockOnly=true&page=0&size=50&sort=expiryDate%2Casc',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.content).toHaveLength(1);
      expect(res.content[0].quantityOnHand).toBe(25);
    });
  });

  describe('searchBatches', () => {
    it('constructs global batch search URL with query filters', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [
            {
              id: 10,
              inventoryItemId: 1,
              itemCode: 'ITM-001',
              itemName: 'Dental Mirror',
              batchNumber: 'LOT-99',
              expiryDate: '2027-06-30',
              quantityOnHand: 15,
              receivedDate: '2026-08-15',
              supplierReference: 'SUPP-A'
            }
          ],
          number: 0,
          size: 20,
          totalPages: 1,
          totalElements: 1
        })
      });

      const res = await searchBatches({
        batchNumber: 'LOT-99',
        expiryFrom: '2027-01-01',
        expiryTo: '2027-12-31',
        positiveStockOnly: true
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/batches?batchNumber=LOT-99&expiryFrom=2027-01-01&expiryTo=2027-12-31&positiveStockOnly=true&page=0&size=20&sort=expiryDate%2Casc',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.content).toHaveLength(1);
      expect(res.content[0].batchNumber).toBe('LOT-99');
    });

    it('handles network failure gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

      await expect(searchBatches()).rejects.toThrow(InventoryApiError);
    });
  });

  describe('recordStockMovement', () => {
    it('obtains CSRF token, sends POST with same-origin credentials and CSRF header, omitting responsibleUserId', async () => {
      const sampleResponse = {
        id: 10,
        inventoryItemId: 1,
        movementType: 'RECEIVED',
        quantity: 25,
        resultingQuantity: 50
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'csrf-mov-1', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => sampleResponse
        });

      const payload = {
        movementType: 'RECEIVED',
        quantity: 25,
        reason: 'Shipment restock',
        batchNumber: 'LOT-123',
        expiryDate: '2028-01-01',
        responsibleUserId: 9999 // Extraneous/client-supplied user ID that should NOT be sent
      };

      const result = await recordStockMovement(1, payload);

      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Verify CSRF fetch
      expect(global.fetch.mock.calls[0][0]).toBe('/api/auth/csrf');

      // Verify movement POST
      const [url, options] = global.fetch.mock.calls[1];
      expect(url).toBe('/api/inventory/items/1/movements');
      expect(options.method).toBe('POST');
      expect(options.credentials).toBe('same-origin');
      expect(options.headers['X-XSRF-TOKEN']).toBe('csrf-mov-1');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.movementType).toBe('RECEIVED');
      expect(body.quantity).toBe(25);
      expect(body.reason).toBe('Shipment restock');
      expect(body.batchNumber).toBe('LOT-123');
      expect(body.expiryDate).toBe('2028-01-01');
      expect(body.responsibleUserId).toBeUndefined();

      expect(result).toEqual(sampleResponse);
    });

    it('handles backend error responses like insufficient stock (409 Conflict)', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'csrf-mov-2', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            status: 409,
            error: 'Conflict',
            message: 'Insufficient stock: requested 30, available 10'
          })
        });

      await expect(
        recordStockMovement(1, { movementType: 'USED', quantity: 30 })
      ).rejects.toMatchObject({
        status: 409,
        message: 'Insufficient stock: requested 30, available 10'
      });
    });
  });

  describe('reverseStockMovement', () => {
    it('obtains CSRF token, sends POST with reason payload to reverse endpoint', async () => {
      const reversalResponse = {
        id: 20,
        inventoryItemId: 1,
        movementType: 'ADJUSTED',
        adjustmentDirection: 'DECREASE',
        reversalOfMovementId: 10,
        quantity: 25,
        resultingQuantity: 25
      };

      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'csrf-rev-1', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => reversalResponse
        });

      const result = await reverseStockMovement(1, 10, { reason: 'Defective goods returned' });

      expect(global.fetch).toHaveBeenCalledTimes(2);

      const [url, options] = global.fetch.mock.calls[1];
      expect(url).toBe('/api/inventory/items/1/movements/10/reverse');
      expect(options.method).toBe('POST');
      expect(options.credentials).toBe('same-origin');
      expect(options.headers['X-XSRF-TOKEN']).toBe('csrf-rev-1');

      const body = JSON.parse(options.body);
      expect(body.reason).toBe('Defective goods returned');
      expect(body.responsibleUserId).toBeUndefined();

      expect(result).toEqual(reversalResponse);
    });

    it('handles duplicate reversal (409 Conflict) cleanly', async () => {
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ token: 'csrf-rev-2', headerName: 'X-XSRF-TOKEN' })
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            status: 409,
            error: 'Conflict',
            message: 'This stock movement has already been reversed: ID 10'
          })
        });

      await expect(
        reverseStockMovement(1, 10, { reason: 'Try again' })
      ).rejects.toMatchObject({
        status: 409,
        message: 'This stock movement has already been reversed: ID 10'
      });
    });
  });
});
