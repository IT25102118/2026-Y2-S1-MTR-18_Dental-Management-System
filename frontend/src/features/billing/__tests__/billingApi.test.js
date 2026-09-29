import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createInvoice,
  updateInvoice,
  getInvoices,
  getInvoice,
  getInvoiceByNumber,
  issueInvoice,
  cancelInvoice,
  recordPayment,
  getInvoicePayments,
  reversePayment,
  getPaymentReceipt,
  getDailyIncomeSummary,
  getMonthlyIncomeSummary,
  BillingApiError
} from '../api/billingApi';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '../types';
import * as authApi from '../../auth/api/authApi';

vi.mock('../../auth/api/authApi', () => ({
  getCsrfToken: vi.fn()
}));

describe('billingApi client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.mocked(authApi.getCsrfToken).mockResolvedValue({
      token: 'test-csrf-token',
      headerName: 'X-XSRF-TOKEN',
      parameterName: '_csrf'
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ==========================================
  // INVOICE OPERATIONS
  // ==========================================

  it('1. createInvoice sends POST to /api/invoices with correct body and CSRF header', async () => {
    const mockInvoiceResponse = {
      id: 1,
      invoiceNumber: 'INV-2026-0001',
      patientId: 100,
      status: InvoiceStatus.DRAFT,
      totalAmount: 150.00
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockInvoiceResponse
    });

    const payload = {
      patientId: 100,
      items: [{ description: 'Cleaning', quantity: 1, unitPrice: 150.00 }]
    };

    const result = await createInvoice(payload);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices');
    expect(config.method).toBe('POST');
    expect(config.credentials).toBe('same-origin');
    expect(config.headers['Content-Type']).toBe('application/json');
    expect(config.headers['X-XSRF-TOKEN']).toBe('test-csrf-token');
    expect(JSON.parse(config.body)).toEqual({
      patientId: 100,
      items: [{ description: 'Cleaning', quantity: 1, unitPrice: 150.00 }]
    });
    expect(result).toEqual(mockInvoiceResponse);
  });

  it('2. updateInvoice sends PUT to /api/invoices/{id} with updated body and CSRF header', async () => {
    const mockUpdated = { id: 5, status: InvoiceStatus.DRAFT, totalAmount: 200.00 };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockUpdated
    });

    const payload = {
      items: [{ description: 'Exam', quantity: 1, unitPrice: 200.00 }],
      discountAmount: 10.00,
      notes: 'Discount applied'
    };

    const result = await updateInvoice(5, payload);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices/5');
    expect(config.method).toBe('PUT');
    expect(config.headers['X-XSRF-TOKEN']).toBe('test-csrf-token');
    expect(JSON.parse(config.body)).toEqual({
      items: [{ description: 'Exam', quantity: 1, unitPrice: 200.00 }],
      discountAmount: 10.00,
      notes: 'Discount applied'
    });
    expect(result).toEqual(mockUpdated);
  });

  it('2a. getInvoices sends GET to /api/invoices with no query params when filters are omitted', async () => {
    const mockInvoices = [
      { id: 1, invoiceNumber: 'INV-2026-0001', status: InvoiceStatus.UNPAID },
      { id: 2, invoiceNumber: 'INV-2026-0002', status: InvoiceStatus.DRAFT }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockInvoices
    });

    const result = await getInvoices();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices');
    expect(config.method).toBe('GET');
    expect(config.credentials).toBe('same-origin');
    expect(config.headers['X-XSRF-TOKEN']).toBeUndefined();
    expect(result).toEqual(mockInvoices);
  });

  it('2b. getInvoices sends GET to /api/invoices with formatted query string when filters provided', async () => {
    const mockInvoices = [
      { id: 1, invoiceNumber: 'INV-2026-0001', patientId: 101, status: InvoiceStatus.UNPAID }
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockInvoices
    });

    const result = await getInvoices({
      patientId: 101,
      status: InvoiceStatus.UNPAID,
      startDate: '2026-09-01',
      endDate: '2026-09-30'
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices?patientId=101&status=UNPAID&startDate=2026-09-01&endDate=2026-09-30');
    expect(config.method).toBe('GET');
    expect(result).toEqual(mockInvoices);
  });

  it('3. getInvoice sends GET to /api/invoices/{id} with credentials and no CSRF header', async () => {
    const mockInvoice = { id: 10, invoiceNumber: 'INV-2026-0010', status: InvoiceStatus.UNPAID };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockInvoice
    });

    const result = await getInvoice(10);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices/10');
    expect(config.method).toBe('GET');
    expect(config.credentials).toBe('same-origin');
    expect(config.headers['X-XSRF-TOKEN']).toBeUndefined();
    expect(result).toEqual(mockInvoice);
  });

  it('4. getInvoiceByNumber sends GET with URL-encoded invoice number', async () => {
    const mockInvoice = { id: 10, invoiceNumber: 'INV/2026/0010#1' };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockInvoice
    });

    const result = await getInvoiceByNumber('INV/2026/0010#1');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices/by-number/INV%2F2026%2F0010%231');
    expect(config.method).toBe('GET');
    expect(result).toEqual(mockInvoice);
  });

  it('5. issueInvoice sends POST to /api/invoices/{id}/issue with CSRF', async () => {
    const mockIssued = { id: 3, status: InvoiceStatus.UNPAID };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockIssued
    });

    const result = await issueInvoice(3);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices/3/issue');
    expect(config.method).toBe('POST');
    expect(config.headers['X-XSRF-TOKEN']).toBe('test-csrf-token');
    expect(result).toEqual(mockIssued);
  });

  it('6. cancelInvoice sends POST to /api/invoices/{id}/cancel with CSRF', async () => {
    const mockCancelled = { id: 3, status: InvoiceStatus.CANCELLED };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockCancelled
    });

    const result = await cancelInvoice(3);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices/3/cancel');
    expect(config.method).toBe('POST');
    expect(config.headers['X-XSRF-TOKEN']).toBe('test-csrf-token');
    expect(result).toEqual(mockCancelled);
  });

  // ==========================================
  // PAYMENT OPERATIONS
  // ==========================================

  it('7. recordPayment sends POST to /api/invoices/{invoiceId}/payments with correct body', async () => {
    const mockPayment = {
      id: 1,
      paymentNumber: 'REC-2026-0001',
      amount: 50.00,
      paymentMethod: PaymentMethod.CASH,
      status: PaymentStatus.RECORDED
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockPayment
    });

    const payload = {
      amount: 50.00,
      paymentMethod: PaymentMethod.CASH,
      paymentReference: 'REF-001'
    };

    const result = await recordPayment(42, payload);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices/42/payments');
    expect(config.method).toBe('POST');
    expect(config.headers['X-XSRF-TOKEN']).toBe('test-csrf-token');
    expect(JSON.parse(config.body)).toEqual({
      amount: 50.00,
      paymentMethod: PaymentMethod.CASH,
      paymentReference: 'REF-001'
    });
    expect(result).toEqual(mockPayment);
  });

  it('8. recordPayment body contains strictly no actor/recordedBy/staff user field', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 1 })
    });

    const payloadWithSneakyFields = {
      amount: 75.00,
      paymentMethod: PaymentMethod.CARD,
      recordedBy: 999, // Should NOT be included in outgoing request body
      userId: 888,
      actor: 'evil'
    };

    await recordPayment(10, payloadWithSneakyFields);

    const [, config] = global.fetch.mock.calls[0];
    const parsedBody = JSON.parse(config.body);
    expect(parsedBody).not.toHaveProperty('recordedBy');
    expect(parsedBody).not.toHaveProperty('userId');
    expect(parsedBody).not.toHaveProperty('actor');
    expect(parsedBody).toEqual({
      amount: 75.00,
      paymentMethod: PaymentMethod.CARD
    });
  });

  it('9. getInvoicePayments sends GET to /api/invoices/{invoiceId}/payments', async () => {
    const mockPayments = [{ id: 1, amount: 50.00 }, { id: 2, amount: 25.00 }];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockPayments
    });

    const result = await getInvoicePayments(12);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/invoices/12/payments');
    expect(config.method).toBe('GET');
    expect(result).toEqual(mockPayments);
  });

  it('10. reversePayment sends POST to /api/payments/{paymentId}/reverse with CSRF', async () => {
    const mockReversed = { id: 10, status: PaymentStatus.REVERSED, reversalReason: 'Duplicate payment' };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockReversed
    });

    const result = await reversePayment(10, { reason: 'Duplicate payment' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/payments/10/reverse');
    expect(config.method).toBe('POST');
    expect(config.headers['X-XSRF-TOKEN']).toBe('test-csrf-token');
    expect(JSON.parse(config.body)).toEqual({ reason: 'Duplicate payment' });
    expect(result).toEqual(mockReversed);
  });

  it('11. reversePayment body contains reason only (no actor or reversedBy field)', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 10 })
    });

    await reversePayment(10, { reason: 'Mistake', reversedBy: 123, staffId: 456 });

    const [, config] = global.fetch.mock.calls[0];
    const parsedBody = JSON.parse(config.body);
    expect(parsedBody).not.toHaveProperty('reversedBy');
    expect(parsedBody).not.toHaveProperty('staffId');
    expect(parsedBody).toEqual({ reason: 'Mistake' });

    // Also supports string directly
    await reversePayment(10, 'Single string reason');
    const [, config2] = global.fetch.mock.calls[1];
    expect(JSON.parse(config2.body)).toEqual({ reason: 'Single string reason' });
  });

  // ==========================================
  // RECEIPT OPERATIONS
  // ==========================================

  it('12. getPaymentReceipt sends GET to /api/payments/{paymentId}/receipt', async () => {
    const mockReceipt = {
      paymentId: 10,
      paymentNumber: 'REC-2026-0010',
      invoiceNumber: 'INV-2026-0001',
      paymentAmount: 100.00
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockReceipt
    });

    const result = await getPaymentReceipt(10);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/payments/10/receipt');
    expect(config.method).toBe('GET');
    expect(result).toEqual(mockReceipt);
  });

  // ==========================================
  // REPORT OPERATIONS
  // ==========================================

  it('13. getDailyIncomeSummary sends GET with date query parameter', async () => {
    const mockSummary = {
      startDate: '2026-09-15',
      endDate: '2026-09-16',
      totalIncome: 1250.00,
      breakdownByMethod: { CASH: 500.00, CARD: 750.00 }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockSummary
    });

    const result = await getDailyIncomeSummary('2026-09-15');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/billing/reports/income/daily?date=2026-09-15');
    expect(config.method).toBe('GET');
    expect(result).toEqual(mockSummary);
  });

  it('14. getMonthlyIncomeSummary sends GET with month query parameter', async () => {
    const mockSummary = {
      startDate: '2026-09-01',
      endDate: '2026-10-01',
      totalIncome: 15000.00,
      breakdownByMethod: { CASH: 5000.00, CARD: 10000.00 }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => mockSummary
    });

    const result = await getMonthlyIncomeSummary('2026-09');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, config] = global.fetch.mock.calls[0];
    expect(url).toBe('/api/billing/reports/income/monthly?month=2026-09');
    expect(config.method).toBe('GET');
    expect(result).toEqual(mockSummary);
  });

  // ==========================================
  // DOMAIN CONSTANTS & ENUMS
  // ==========================================

  it('15. Exported enums contain expected domain values and are immutable', () => {
    expect(InvoiceStatus).toEqual({
      DRAFT: 'DRAFT',
      UNPAID: 'UNPAID',
      PARTIALLY_PAID: 'PARTIALLY_PAID',
      PAID: 'PAID',
      CANCELLED: 'CANCELLED'
    });

    expect(PaymentMethod).toEqual({
      CASH: 'CASH',
      CARD: 'CARD',
      BANK_TRANSFER: 'BANK_TRANSFER',
      OTHER: 'OTHER'
    });

    expect(PaymentStatus).toEqual({
      RECORDED: 'RECORDED',
      REVERSED: 'REVERSED'
    });

    expect(Object.isFrozen(InvoiceStatus)).toBe(true);
    expect(Object.isFrozen(PaymentMethod)).toBe(true);
    expect(Object.isFrozen(PaymentStatus)).toBe(true);
  });

  // ==========================================
  // CREDENTIALS, CSRF & ERROR HANDLING
  // ==========================================

  it('16. Reuses existing same-origin credentials and CSRF coordination', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({})
    });

    await issueInvoice(9);

    expect(authApi.getCsrfToken).toHaveBeenCalledTimes(1);
    const [, config] = global.fetch.mock.calls[0];
    expect(config.credentials).toBe('same-origin');
    expect(config.headers['X-XSRF-TOKEN']).toBe('test-csrf-token');
  });

  it('17. Propagates structured BillingApiError preserving status, message, and fieldErrors', async () => {
    const errorPayload = {
      status: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      fieldErrors: {
        amount: 'Payment amount must be strictly greater than zero'
      }
    };

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => errorPayload
    });

    try {
      await recordPayment(1, { amount: -5.00, paymentMethod: PaymentMethod.CASH });
      expect.fail('Expected recordPayment to throw BillingApiError');
    } catch (err) {
      expect(err).toBeInstanceOf(BillingApiError);
      expect(err.status).toBe(400);
      expect(err.message).toBe('Validation failed');
      expect(err.error).toBe('Bad Request');
      expect(err.fieldErrors).toEqual({
        amount: 'Payment amount must be strictly greater than zero'
      });
      expect(err.raw).toEqual(errorPayload);
    }
  });

  it('18. Translates network fetch failures into status 0 NetworkError BillingApiError', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    try {
      await getInvoice(1);
      expect.fail('Expected getInvoice to throw NetworkError');
    } catch (err) {
      expect(err).toBeInstanceOf(BillingApiError);
      expect(err.status).toBe(0);
      expect(err.error).toBe('NetworkError');
      expect(err.message).toContain('Failed to fetch');
    }
  });
});
