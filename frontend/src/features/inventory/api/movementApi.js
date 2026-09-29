import { InventoryApiError, normalizePage } from './inventoryApi';
import { getCsrfToken, clearCsrfToken } from '../../../shared/security/csrfClient';

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

/**
 * Record a new stock movement for an inventory item.
 * Endpoint: POST /api/inventory/items/{itemId}/movements
 *
 * Payload does NOT send responsibleUserId; the backend authoritatively
 * associates the movement with the authenticated session context.
 *
 * @param {number|string} itemId
 * @param {Object} movementData
 * @param {string} movementData.movementType - 'RECEIVED' | 'USED' | 'DAMAGED' | 'ADJUSTED' | 'EXPIRED'
 * @param {number} movementData.quantity - Strictly positive integer
 * @param {string} [movementData.adjustmentDirection] - 'INCREASE' | 'DECREASE' (required if ADJUSTED)
 * @param {string} [movementData.reason] - Required if ADJUSTED, optional otherwise
 * @param {string} [movementData.batchNumber]
 * @param {string} [movementData.expiryDate]
 * @param {number} [movementData.batchId]
 * @param {string} [movementData.receivedDate]
 * @param {string} [movementData.supplierReference]
 * @param {number} [movementData.treatmentProcedureId]
 * @returns {Promise<Object>} StockMovementResponse
 */
export async function recordStockMovement(itemId, movementData = {}) {
  const payload = {
    movementType: movementData.movementType,
    quantity: Number(movementData.quantity)
  };

  if (movementData.adjustmentDirection) {
    payload.adjustmentDirection = movementData.adjustmentDirection;
  }

  if (typeof movementData.reason === 'string' && movementData.reason.trim() !== '') {
    payload.reason = movementData.reason.trim();
  }

  if (typeof movementData.batchNumber === 'string' && movementData.batchNumber.trim() !== '') {
    payload.batchNumber = movementData.batchNumber.trim();
  }

  if (movementData.expiryDate) {
    payload.expiryDate = movementData.expiryDate;
  }

  if (movementData.batchId !== undefined && movementData.batchId !== null && movementData.batchId !== '') {
    payload.batchId = Number(movementData.batchId);
  }

  if (movementData.receivedDate) {
    payload.receivedDate = movementData.receivedDate;
  }

  if (typeof movementData.supplierReference === 'string' && movementData.supplierReference.trim() !== '') {
    payload.supplierReference = movementData.supplierReference.trim();
  }

  if (movementData.treatmentProcedureId !== undefined && movementData.treatmentProcedureId !== null && movementData.treatmentProcedureId !== '') {
    payload.treatmentProcedureId = Number(movementData.treatmentProcedureId);
  }

  const csrf = await getCsrfToken();

  let response;
  try {
    response = await fetch(`/api/inventory/items/${itemId}/movements`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        [csrf.headerName]: csrf.token
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    throw new InventoryApiError(
      0,
      err.message || 'Unable to record stock movement. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 403) {
    clearCsrfToken();
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message = data?.message || response.statusText || 'Failed to record stock movement';
    throw new InventoryApiError(response.status, message, data?.fieldErrors || {}, data?.error || 'Error', data);
  }

  return data;
}

/**
 * Reverse a historical stock movement.
 * Endpoint: POST /api/inventory/items/{itemId}/movements/{movementId}/reverse
 *
 * Payload does NOT send responsibleUserId; the backend authoritatively
 * associates the reversal with the authenticated session context.
 *
 * @param {number|string} itemId
 * @param {number|string} movementId
 * @param {Object} reversalData
 * @param {string} reversalData.reason - Mandatory explanation for reversal
 * @returns {Promise<Object>} StockMovementResponse
 */
export async function reverseStockMovement(itemId, movementId, reversalData = {}) {
  const payload = {
    reason: typeof reversalData.reason === 'string' ? reversalData.reason.trim() : ''
  };

  const csrf = await getCsrfToken();

  let response;
  try {
    response = await fetch(`/api/inventory/items/${itemId}/movements/${movementId}/reverse`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        [csrf.headerName]: csrf.token
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    throw new InventoryApiError(
      0,
      err.message || 'Unable to reverse stock movement. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 403) {
    clearCsrfToken();
  }

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message = data?.message || response.statusText || 'Failed to reverse stock movement';
    throw new InventoryApiError(response.status, message, data?.fieldErrors || {}, data?.error || 'Error', data);
  }

  return data;
}

