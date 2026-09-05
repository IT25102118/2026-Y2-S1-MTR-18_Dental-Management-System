import { InventoryApiError, normalizePage } from './inventoryApi';

/**
 * Fetch paginated low-stock operational alerts for active inventory items.
 * Endpoint: GET /api/inventory/alerts/low-stock
 */
export async function getLowStockAlerts({
  category,
  page = 0,
  size = 20,
  sort = 'currentQuantity,asc'
} = {}) {
  const params = new URLSearchParams();

  if (category && category.trim() !== '') {
    params.append('category', category.trim());
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
    ? `/api/inventory/alerts/low-stock?${queryString}`
    : '/api/inventory/alerts/low-stock';

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
      err.message || 'Unable to load low-stock alerts. Please check your connection.',
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
    const message = errorData?.message || response.statusText || 'Failed to fetch low-stock alerts';
    throw new InventoryApiError(response.status, message, errorData?.fieldErrors || {}, errorData?.error || 'Error', errorData);
  }

  const data = await response.json();
  return normalizePage(data);
}

/**
 * Fetch paginated expiry operational alerts for active inventory batches through a specific date.
 * Endpoint: GET /api/inventory/alerts/expiry?through=YYYY-MM-DD
 */
export async function getExpiryAlerts({
  through,
  page = 0,
  size = 20,
  sort = 'expiryDate,asc'
} = {}) {
  if (!through || String(through).trim() === '') {
    throw new InventoryApiError(400, 'through date parameter is required', {}, 'Bad Request');
  }

  const params = new URLSearchParams();
  params.append('through', String(through).trim());

  if (page !== undefined && page !== null) {
    params.append('page', String(page));
  }

  if (size !== undefined && size !== null) {
    params.append('size', String(size));
  }

  if (sort) {
    params.append('sort', sort);
  }

  const url = `/api/inventory/alerts/expiry?${params.toString()}`;

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
      err.message || 'Unable to load expiry alerts. Please check your connection.',
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
    const message = errorData?.message || response.statusText || 'Failed to fetch expiry alerts';
    throw new InventoryApiError(response.status, message, errorData?.fieldErrors || {}, errorData?.error || 'Error', errorData);
  }

  const data = await response.json();
  return normalizePage(data);
}
