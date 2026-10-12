import {
  getCsrfToken,
  clearCsrfToken
} from '../../../shared/security/csrfClient';

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

  const method = (config.method || 'GET').toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  if (isMutating) {
    config.credentials = 'same-origin';
    let csrf;
    try {
      csrf = await getCsrfToken();
    } catch (err) {
      throw new InventoryApiError(
        err.status || 0,
        err.message || 'Unable to obtain CSRF token for request',
        {},
        'CsrfError',
        err
      );
    }
    config.headers[csrf.headerName] = csrf.token;
  }

  if (body !== undefined && body !== null) {
    config.body = JSON.stringify(body);
    config.headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    // The Network Call
    response = await fetch(endpoint, config);
  } catch (err) {
    throw new InventoryApiError(
      0,
      err.message || 'Unable to communicate with the inventory service. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 403) {
    clearCsrfToken();
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

// Fetch paginated inventory items with optional search and filters.

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
  // GET (Fetch Items from backend)
  const url = queryString ? `/api/inventory/items?${queryString}` : '/api/inventory/items';
  const data = await request(url, { method: 'GET' });
  return normalizePage(data);
}

// Fetch single inventory item by ID.

export async function getItemById(id) {
  //GET By ID (Fetch single item from backend)
  return request(`/api/inventory/items/${id}`, { method: 'GET' });
}

//Create a new inventory catalog item.
export async function createItem(payload) {
  const body = {
    itemCode: payload.itemCode?.trim(),
    name: payload.name?.trim(),
    category: payload.category?.trim(),
    unit: payload.unit?.trim(),
    reorderLevel: Number(payload.reorderLevel),
    defaultSupplierReference: payload.defaultSupplierReference?.trim() || null
  };
  // POST (Send new item to backend)
  return request('/api/inventory/items', {
    method: 'POST',
    body
  });
}

//Update an existing inventory catalog item.

export async function updateItem(id, payload) {
  const body = {
    name: payload.name?.trim(),
    category: payload.category?.trim(),
    unit: payload.unit?.trim(),
    reorderLevel: Number(payload.reorderLevel),
    defaultSupplierReference: payload.defaultSupplierReference?.trim() || null
  };
  // PUT (Update item)
  return request(`/api/inventory/items/${id}`, {
    method: 'PUT',
    body
  });
}

export async function updateItemStatus(id, active) {
  return request(`/api/inventory/items/${id}/status`, {
    // PATCH (Update status in backend)
    method: 'PATCH',
    body: { active: Boolean(active) }
  });
}
