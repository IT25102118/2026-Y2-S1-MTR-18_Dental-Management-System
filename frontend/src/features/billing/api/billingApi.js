/**
 * API client for Billing and Payment Management (MF-05).
 * Communicates with backend /api/invoices, /api/payments, and /api/billing/reports endpoints.
 */

import { getCsrfToken } from '../../auth/api/authApi';

export class BillingApiError extends Error {
  constructor(status, message, fieldErrors = {}, error = null, raw = null) {
    super(message || `Billing API error (${status})`);
    this.name = 'BillingApiError';
    this.status = status;
    this.fieldErrors = fieldErrors || {};
    this.error = error;
    this.raw = raw;
  }
}

/**
 * Base HTTP request handler using standard fetch with credentials and CSRF coordination.
 *
 * @param {string} endpoint Target URL path
 * @param {Object} [options] Fetch configuration options
 * @returns {Promise<any>} Parsed response data
 */
async function request(endpoint, options = {}) {
  const { body, headers = {}, method = 'GET', ...restOptions } = options;
  const config = {
    method,
    credentials: 'same-origin',
    ...restOptions,
    headers: {
      Accept: 'application/json',
      ...headers
    }
  };

  // Mutating requests require CSRF token coordination
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    try {
      const csrf = await getCsrfToken();
      if (csrf?.token && csrf?.headerName) {
        config.headers[csrf.headerName] = csrf.token;
      }
    } catch {
      // If CSRF resolution fails, allow request to proceed so server returns standard 403 CSRF error
    }
  }

  if (body !== undefined && body !== null) {
    config.body = JSON.stringify(body);
    config.headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(endpoint, config);
  } catch (err) {
    throw new BillingApiError(
      0,
      err.message || 'Unable to communicate with the billing service. Please check your connection.',
      {},
      'NetworkError'
    );
  }

  if (response.status === 204) {
    return null;
  }

  let data;
  const contentType = response.headers?.get('content-type') || '';
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
    const errorBody = typeof data === 'object' && data !== null ? data : {};
    const message = errorBody.message || (typeof data === 'string' && data) || response.statusText || 'Billing operation failed';
    const fieldErrors = errorBody.fieldErrors || {};
    const errorName = errorBody.error || response.statusText || 'Error';
    throw new BillingApiError(response.status, message, fieldErrors, errorName, data);
  }

  return data;
}

// ==========================================
// INVOICE API OPERATIONS
// ==========================================

/**
 * Creates a new DRAFT invoice.
 * Endpoint: POST /api/invoices
 *
 * @param {import('../types').CreateInvoiceRequest} payload
 * @returns {Promise<import('../types').InvoiceResponse>} Created draft invoice
 */
export async function createInvoice(payload) {
  const body = {
    patientId: payload.patientId,
    items: payload.items || []
  };

  if (payload.treatmentPlanId !== undefined && payload.treatmentPlanId !== null) {
    body.treatmentPlanId = payload.treatmentPlanId;
  }
  if (payload.invoiceDate !== undefined && payload.invoiceDate !== null) {
    body.invoiceDate = payload.invoiceDate;
  }
  if (payload.discountAmount !== undefined && payload.discountAmount !== null) {
    body.discountAmount = payload.discountAmount;
  }
  if (payload.notes !== undefined && payload.notes !== null) {
    body.notes = payload.notes;
  }

  return request('/api/invoices', {
    method: 'POST',
    body
  });
}

/**
 * Updates an existing DRAFT invoice.
 * Endpoint: PUT /api/invoices/{id}
 *
 * @param {number} id Invoice ID
 * @param {import('../types').UpdateDraftInvoiceRequest} payload
 * @returns {Promise<import('../types').InvoiceResponse>} Updated invoice
 */
export async function updateInvoice(id, payload) {
  const body = {
    items: payload.items || []
  };

  if (payload.treatmentPlanId !== undefined && payload.treatmentPlanId !== null) {
    body.treatmentPlanId = payload.treatmentPlanId;
  }
  if (payload.invoiceDate !== undefined && payload.invoiceDate !== null) {
    body.invoiceDate = payload.invoiceDate;
  }
  if (payload.discountAmount !== undefined && payload.discountAmount !== null) {
    body.discountAmount = payload.discountAmount;
  }
  if (payload.notes !== undefined && payload.notes !== null) {
    body.notes = payload.notes;
  }

  return request(`/api/invoices/${id}`, {
    method: 'PUT',
    body
  });
}

/**
 * Retrieves invoices matching optional filter criteria.
 * Endpoint: GET /api/invoices?patientId=...&status=...&startDate=...&endDate=...
 *
 * @param {Object} [filters]
 * @param {number} [filters.patientId] Filter by patient ID
 * @param {string} [filters.status] Filter by invoice status (InvoiceStatus)
 * @param {string} [filters.startDate] Filter by start date (YYYY-MM-DD)
 * @param {string} [filters.endDate] Filter by end date (YYYY-MM-DD)
 * @returns {Promise<import('../types').InvoiceResponse[]>} List of invoices
 */
export async function getInvoices({ patientId, status, startDate, endDate } = {}) {
  const params = new URLSearchParams();

  if (patientId !== undefined && patientId !== null && patientId !== '') {
    params.set('patientId', String(patientId));
  }
  if (status !== undefined && status !== null && status !== '') {
    params.set('status', status);
  }
  if (startDate !== undefined && startDate !== null && startDate !== '') {
    params.set('startDate', startDate);
  }
  if (endDate !== undefined && endDate !== null && endDate !== '') {
    params.set('endDate', endDate);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/api/invoices?${queryString}` : '/api/invoices';

  return request(endpoint, {
    method: 'GET'
  });
}

/**
 * Retrieves invoice details by ID.
 * Endpoint: GET /api/invoices/{id}
 *
 * @param {number} id Invoice ID
 * @returns {Promise<import('../types').InvoiceResponse>}
 */
export async function getInvoice(id) {
  return request(`/api/invoices/${id}`, {
    method: 'GET'
  });
}

/**
 * Retrieves invoice details by invoice number (e.g. INV-2026-0001).
 * Endpoint: GET /api/invoices/by-number/{invoiceNumber}
 *
 * @param {string} invoiceNumber Human-readable invoice number
 * @returns {Promise<import('../types').InvoiceResponse>}
 */
export async function getInvoiceByNumber(invoiceNumber) {
  return request(`/api/invoices/by-number/${encodeURIComponent(invoiceNumber)}`, {
    method: 'GET'
  });
}

/**
 * Issues a DRAFT invoice to UNPAID status.
 * Endpoint: POST /api/invoices/{id}/issue
 *
 * @param {number} id Invoice ID
 * @returns {Promise<import('../types').InvoiceResponse>} Issued invoice
 */
export async function issueInvoice(id) {
  return request(`/api/invoices/${id}/issue`, {
    method: 'POST'
  });
}

/**
 * Cancels an eligible invoice.
 * Endpoint: POST /api/invoices/{id}/cancel
 *
 * @param {number} id Invoice ID
 * @returns {Promise<import('../types').InvoiceResponse>} Cancelled invoice
 */
export async function cancelInvoice(id) {
  return request(`/api/invoices/${id}/cancel`, {
    method: 'POST'
  });
}

// ==========================================
// PAYMENT API OPERATIONS
// ==========================================

/**
 * Records a full or partial payment against an issued invoice.
 * Server strictly derives responsible staff actor from authenticated session.
 * Endpoint: POST /api/invoices/{invoiceId}/payments
 *
 * @param {number} invoiceId Target invoice ID
 * @param {import('../types').RecordPaymentRequest} payload
 * @returns {Promise<import('../types').PaymentResponse>} Recorded payment
 */
export async function recordPayment(invoiceId, payload) {
  const body = {
    amount: payload.amount,
    paymentMethod: payload.paymentMethod
  };

  if (payload.paymentReference !== undefined && payload.paymentReference !== null && payload.paymentReference !== '') {
    body.paymentReference = payload.paymentReference.trim();
  }

  return request(`/api/invoices/${invoiceId}/payments`, {
    method: 'POST',
    body
  });
}

/**
 * Retrieves all payments recorded against a given invoice.
 * Endpoint: GET /api/invoices/{invoiceId}/payments
 *
 * @param {number} invoiceId Target invoice ID
 * @returns {Promise<import('../types').PaymentResponse[]>} List of payments
 */
export async function getInvoicePayments(invoiceId) {
  return request(`/api/invoices/${invoiceId}/payments`, {
    method: 'GET'
  });
}

/**
 * Reverses an existing recorded payment with mandatory audit justification.
 * Server strictly derives responsible staff actor from authenticated session.
 * Endpoint: POST /api/payments/{paymentId}/reverse
 *
 * @param {number} paymentId Target payment ID
 * @param {import('../types').ReversePaymentRequest|string} payload
 * @returns {Promise<import('../types').PaymentResponse>} Reversed payment
 */
export async function reversePayment(paymentId, payload) {
  const reason = typeof payload === 'string' ? payload : payload?.reason;
  const body = {
    reason: reason?.trim() || ''
  };

  return request(`/api/payments/${paymentId}/reverse`, {
    method: 'POST',
    body
  });
}

// ==========================================
// RECEIPT API OPERATIONS
// ==========================================

/**
 * Retrieves authoritative printable receipt data for a payment.
 * Endpoint: GET /api/payments/{paymentId}/receipt
 *
 * @param {number} paymentId Target payment ID
 * @returns {Promise<import('../types').ReceiptResponse>} Receipt data
 */
export async function getPaymentReceipt(paymentId) {
  return request(`/api/payments/${paymentId}/receipt`, {
    method: 'GET'
  });
}

// ==========================================
// REPORT API OPERATIONS
// ==========================================

/**
 * Retrieves daily clinic income summary for a target date.
 * Endpoint: GET /api/billing/reports/income/daily?date=YYYY-MM-DD
 *
 * @param {string} date Calendar date in ISO format (YYYY-MM-DD)
 * @returns {Promise<import('../types').IncomeSummaryResponse>} Daily summary
 */
export async function getDailyIncomeSummary(date) {
  return request(`/api/billing/reports/income/daily?date=${encodeURIComponent(date)}`, {
    method: 'GET'
  });
}

/**
 * Retrieves monthly clinic income summary for a target month.
 * Endpoint: GET /api/billing/reports/income/monthly?month=YYYY-MM
 *
 * @param {string} month Calendar year-month in format YYYY-MM
 * @returns {Promise<import('../types').IncomeSummaryResponse>} Monthly summary
 */
export async function getMonthlyIncomeSummary(month) {
  return request(`/api/billing/reports/income/monthly?month=${encodeURIComponent(month)}`, {
    method: 'GET'
  });
}
