import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getLowStockAlerts, getExpiryAlerts } from '../api/alertApi';
import { InventoryApiError } from '../api/inventoryApi';

describe('alertApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('getLowStockAlerts', () => {
    it('constructs correct URL with category, pagination, and sorting', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [
            {
              itemId: 10,
              itemCode: 'ITM-010',
              name: 'Dental Bibs',
              category: 'Consumable',
              unit: 'pack',
              currentQuantity: 2,
              reorderLevel: 5,
              deficit: 3,
              outOfStock: false,
              defaultSupplierReference: 'SUPP-BIBS'
            }
          ],
          number: 0,
          size: 20,
          totalPages: 1,
          totalElements: 1
        })
      });

      const res = await getLowStockAlerts({
        category: 'Consumable',
        page: 0,
        size: 20,
        sort: 'currentQuantity,asc'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/alerts/low-stock?category=Consumable&page=0&size=20&sort=currentQuantity%2Casc',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.content).toHaveLength(1);
      expect(res.content[0].deficit).toBe(3);
    });

    it('omits category parameter when empty or undefined', async () => {
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

      await getLowStockAlerts();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/alerts/low-stock?page=0&size=20&sort=currentQuantity%2Casc',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('handles HTTP error responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 500,
          error: 'Internal Server Error',
          message: 'Database query failed'
        })
      });

      await expect(getLowStockAlerts()).rejects.toThrow(InventoryApiError);
    });
  });

  describe('getExpiryAlerts', () => {
    it('throws InventoryApiError if through parameter is missing', async () => {
      await expect(getExpiryAlerts({ through: '' })).rejects.toThrow(InventoryApiError);
      await expect(getExpiryAlerts({})).rejects.toThrow('through date parameter is required');
    });

    it('constructs correct URL with through date and pagination', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [
            {
              batchId: 55,
              itemId: 1,
              itemCode: 'ITM-001',
              itemName: 'Anesthetic Cartridges',
              category: 'Pharmaceutical',
              unit: 'box',
              batchNumber: 'LOT-ANES-99',
              quantityOnHand: 8,
              expiryDate: '2026-09-15',
              status: 'EXPIRING',
              daysRemaining: 10,
              supplierReference: 'SUPP-PHARMA'
            }
          ],
          number: 0,
          size: 20,
          totalPages: 1,
          totalElements: 1
        })
      });

      const res = await getExpiryAlerts({
        through: '2026-10-01',
        page: 0,
        size: 20
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/inventory/alerts/expiry?through=2026-10-01&page=0&size=20&sort=expiryDate%2Casc',
        expect.objectContaining({ method: 'GET' })
      );
      expect(res.content).toHaveLength(1);
      expect(res.content[0].batchNumber).toBe('LOT-ANES-99');
      expect(res.content[0].daysRemaining).toBe(10);
    });

    it('handles backend 400 error when through date is in the past', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          status: 400,
          error: 'Bad Request',
          message: 'through date must not be in the past: 2026-01-01'
        })
      });

      await expect(getExpiryAlerts({ through: '2026-01-01' })).rejects.toThrow(
        /through date must not be in the past/i
      );
    });
  });
});
