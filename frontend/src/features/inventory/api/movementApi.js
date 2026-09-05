import { InventoryApiError, normalizePage } from './inventoryApi';

/**
 * Fetch stock movement history for a specific inventory item.
 * Endpoint: GET /api/inventory/items/{itemId}/movements
 */
export async function getItemMovements(itemId, {
  movementType,
  page = 0,
  size = 20,
  sort = 'occurredAt,desc'
} = {}) {
  const params = new URLSearchParams();

  if (movementType && movementType !== 'ALL') {
    params.append('movementType', movementType);
  }

  if (page !== undefined && page !== null) {
    params.append('page', String(page));
  }

  if (size !== undefined && size !== null) {
    params.append('size', String(size));
  }

  if (sort) {
    params.append('sort', sort);
  }

  const queryString = params.toString();
  const url = queryString
    ? `/api/inventory/items/${itemId}/movements?${queryString}`
    : `/api/inventory/items/${itemId}/movements`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
  } catch (err) {
    throw new InventoryApiError(
      0,
      err.message || 'Unable to load stock movements. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const message = errorData?.message || response.statusText || 'Failed to fetch movement history';
    throw new InventoryApiError(response.status, message, errorData?.fieldErrors || {}, errorData?.error || 'Error', errorData);
  }

  const data = await response.json();
  return normalizePage(data);
}

/**
 * Fetch inventory batches associated with a specific item.
 * Endpoint: GET /api/inventory/items/{itemId}/batches
 */
export async function getItemBatches(itemId, {
  positiveStockOnly = false,
  page = 0,
  size = 50,
  sort = 'expiryDate,asc'
} = {}) {
  const params = new URLSearchParams();

  if (positiveStockOnly !== undefined && positiveStockOnly !== null) {
    params.append('positiveStockOnly', String(positiveStockOnly));
  }

  if (page !== undefined && page !== null) {
    params.append('page', String(page));
  }

  if (size !== undefined && size !== null) {
    params.append('size', String(size));
  }

  if (sort) {
    params.append('sort', sort);
  }

  const queryString = params.toString();
  const url = queryString
    ? `/api/inventory/items/${itemId}/batches?${queryString}`
    : `/api/inventory/items/${itemId}/batches`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
  } catch (err) {
    throw new InventoryApiError(
      0,
      err.message || 'Unable to load item batches. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const message = errorData?.message || response.statusText || 'Failed to fetch item batches';
    throw new InventoryApiError(response.status, message, errorData?.fieldErrors || {}, errorData?.error || 'Error', errorData);
  }

  const data = await response.json();
  return normalizePage(data);
}

/**
 * Search batches globally across all inventory items using backend-supported filters.
 * Endpoint: GET /api/inventory/batches
 */
export async function searchBatches({
  itemId,
  batchNumber,
  expiryFrom,
  expiryTo,
  positiveStockOnly = false,
  page = 0,
  size = 20,
  sort = 'expiryDate,asc'
} = {}) {
  const params = new URLSearchParams();

  if (itemId) {
    params.append('itemId', String(itemId));
  }

  if (typeof batchNumber === 'string' && batchNumber.trim() !== '') {
    params.append('batchNumber', batchNumber.trim());
  }

  if (expiryFrom) {
    params.append('expiryFrom', expiryFrom);
  }

  if (expiryTo) {
    params.append('expiryTo', expiryTo);
  }

  if (positiveStockOnly !== undefined && positiveStockOnly !== null) {
    params.append('positiveStockOnly', String(positiveStockOnly));
  }

  if (page !== undefined && page !== null) {
    params.append('page', String(page));
  }

  if (size !== undefined && size !== null) {
    params.append('size', String(size));
  }

  if (sort) {
    params.append('sort', sort);
  }

  const queryString = params.toString();
  const url = queryString
    ? `/api/inventory/batches?${queryString}`
    : '/api/inventory/batches';

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
  } catch (err) {
    throw new InventoryApiError(
      0,
      err.message || 'Unable to search batches. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }
    const message = errorData?.message || response.statusText || 'Failed to search batches';
    throw new InventoryApiError(response.status, message, errorData?.fieldErrors || {}, errorData?.error || 'Error', errorData);
  }

  const data = await response.json();
  return normalizePage(data);
}
