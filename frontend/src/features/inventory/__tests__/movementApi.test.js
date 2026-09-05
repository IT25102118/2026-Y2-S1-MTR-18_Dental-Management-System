import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getItemMovements,
  getItemBatches,
  searchBatches
} from '../api/movementApi';
import { InventoryApiError } from '../api/inventoryApi';

describe('movementApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
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
});
