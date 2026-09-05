/**
 * API client for Inventory Catalog operations.
 * Communicates with backend /api/inventory/items endpoints.
 */

export class InventoryApiError extends Error {
  constructor(status, message, fieldErrors = {}, error = null, raw = null) {
    super(message || `API error (${status})`);
    this.name = 'InventoryApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
    this.raw = raw;
  }
}

/**
 * Normalizes Spring PageImpl JSON response to a safe predictable shape.
 */
export function normalizePage(pageData = {}) {
  const content = Array.isArray(pageData?.content) ? pageData.content : [];
  const number = typeof pageData?.number === 'number' ? pageData.number : 0;
  const size = typeof pageData?.size === 'number' ? pageData.size : content.length;
  const totalPages = typeof pageData?.totalPages === 'number' ? pageData.totalPages : (content.length > 0 ? 1 : 0);
  const totalElements = typeof pageData?.totalElements === 'number' ? pageData.totalElements : content.length;
  const first = typeof pageData?.first === 'boolean' ? pageData.first : (number === 0);
  const last = typeof pageData?.last === 'boolean' ? pageData.last : (number >= totalPages - 1);
  const empty = typeof pageData?.empty === 'boolean' ? pageData.empty : (content.length === 0);

  return {
    content,
    number,
    size,
    totalPages,
    totalElements,
    first,
    last,
    empty
  };
}

async function request(endpoint, options = {}) {
  const { body, headers = {}, ...restOptions } = options;
  const config = {
    ...restOptions,
    headers: {
      ...headers
    }
  };

  if (body !== undefined && body !== null) {
    config.body = JSON.stringify(body);
    config.headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (err) {
    throw new InventoryApiError(
      0,
      err.message || 'Unable to communicate with the inventory service. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 204) {
    return null;
  }

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const errorBody = (typeof data === 'object' && data !== null) ? data : {};
    const message = errorBody.message || (typeof data === 'string' && data) || response.statusText || 'Operation failed';
    const fieldErrors = errorBody.fieldErrors || {};
    const errorName = errorBody.error || response.statusText || 'Error';
    throw new InventoryApiError(response.status, message, fieldErrors, errorName, data);
  }

  return data;
}

/**
 * Fetch paginated inventory items with optional search and filters.
 */
export async function getItems({
  search,
  category,
  active,
  stockStatus,
  page = 0,
  size = 20,
  sort = 'name,asc'
} = {}) {
  const params = new URLSearchParams();

  if (typeof search === 'string' && search.trim() !== '') {
    params.append('search', search.trim());
  }

  if (typeof category === 'string' && category.trim() !== '') {
    params.append('category', category.trim());
  }

  // Preserve active=false explicitly (do not drop falsy boolean values)
  if (active !== undefined && active !== null && active !== '') {
    params.append('active', String(active));
  }

  if (stockStatus && stockStatus !== 'ALL') {
    params.append('stockStatus', stockStatus);
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
  const url = queryString ? `/api/inventory/items?${queryString}` : '/api/inventory/items';
  const data = await request(url, { method: 'GET' });
  return normalizePage(data);
}

/**
 * Fetch single inventory item by ID.
 */
export async function getItemById(id) {
  return request(`/api/inventory/items/${id}`, { method: 'GET' });
}

/**
 * Create a new inventory catalog item.
 * Strictly sends only CreateInventoryItemRequest fields.
 */
export async function createItem(payload) {
  const body = {
    itemCode: payload.itemCode?.trim(),
    name: payload.name?.trim(),
    category: payload.category?.trim(),
    unit: payload.unit?.trim(),
    reorderLevel: Number(payload.reorderLevel),
    defaultSupplierReference: payload.defaultSupplierReference ? payload.defaultSupplierReference.trim() : null
  };
  return request('/api/inventory/items', {
    method: 'POST',
    body
  });
}

/**
 * Update an existing inventory catalog item.
 * Strictly sends only UpdateInventoryItemRequest fields (itemCode and quantity cannot be updated).
 */
export async function updateItem(id, payload) {
  const body = {
    name: payload.name?.trim(),
    category: payload.category?.trim(),
    unit: payload.unit?.trim(),
    reorderLevel: Number(payload.reorderLevel),
    defaultSupplierReference: payload.defaultSupplierReference ? payload.defaultSupplierReference.trim() : null
  };
  return request(`/api/inventory/items/${id}`, {
    method: 'PUT',
    body
  });
}

/**
 * Toggle active status of an inventory item.
 * Sends { active: boolean } via PATCH /api/inventory/items/{id}/status.
 */
export async function updateItemStatus(id, active) {
  return request(`/api/inventory/items/${id}/status`, {
    method: 'PATCH',
    body: { active: Boolean(active) }
  });
}
