import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PatientInvoiceDetailPage from '../pages/PatientInvoiceDetailPage';
import * as AuthContextModule from '../context/AuthContext';
import * as patientPortalApi from '../../patient/api/patientPortalApi';

vi.mock('../../patient/api/patientPortalApi', () => ({
  getPatientInvoices: vi.fn(),
  getPatientInvoiceById: vi.fn(),
  getPatientReceipt: vi.fn()
}));

describe('PatientInvoiceDetailPage', () => {
  const mockUser = {
    id: 101,
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    role: 'PATIENT'
  };

  const sampleInvoiceDetail = {
    id: 501,
    invoiceNumber: 'INV-2026-0001',
    invoiceDate: '2026-09-20',
    subtotal: 150.00,
    discountAmount: 0.00,
    totalAmount: 150.00,
    paidAmount: 50.00,
    balanceAmount: 100.00,
    status: 'PARTIALLY_PAID',
    notes: 'Follow-up appointment next month',
    issuedAt: '2026-09-20T10:00:00',
    items: [
      {
        id: 601,
        treatmentProcedureId: 10,
        description: 'Comprehensive Dental Cleaning & Examination',
        quantity: 1,
        unitPrice: 150.00,
        lineTotal: 150.00
      }
    ],
    payments: [
      {
        id: 701,
        paymentNumber: 'PAY-2026-0001',
        amount: 50.00,
        paymentMethod: 'CARD',
        paymentReference: 'AUTH-12345',
        paidAt: '2026-09-20T10:30:00',
        status: 'RECORDED'
      }
    ]
  };

  const sampleReceipt = {
    paymentId: 701,
    paymentNumber: 'PAY-2026-0001',
    invoiceId: 501,
    invoiceNumber: 'INV-2026-0001',
    paymentAmount: 50.00,
    paymentMethod: 'CARD',
    paymentReference: 'AUTH-12345',
    paidAt: '2026-09-20T10:30:00',
    invoiceTotalAmount: 150.00,
    remainingBalance: 100.00,
    status: 'RECORDED'
  };

  let printSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: vi.fn()
    });
  });

  afterEach(() => {
    printSpy.mockRestore();
  });

  it('1. displays loading state while fetching invoice details', () => {
    patientPortalApi.getPatientInvoiceById.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/patient/invoices/501']}>
        <Routes>
          <Route path="/patient/invoices/:id" element={<PatientInvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('invoice-detail-loading')).toBeInTheDocument();
  });

  it('2. renders 404 Not Found state gracefully when invoice does not exist', async () => {
    const error = new Error('Invoice not found');
    error.status = 404;
    patientPortalApi.getPatientInvoiceById.mockRejectedValue(error);

    render(
      <MemoryRouter initialEntries={['/patient/invoices/9999']}>
        <Routes>
          <Route path="/patient/invoices/:id" element={<PatientInvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('invoice-detail-not-found')).toBeInTheDocument();
    });

    expect(screen.getByText(/invoice not found/i)).toBeInTheDocument();
  });

  it('3. renders 403 Forbidden state gracefully when accessing another patient invoice', async () => {
    const error = new Error('Access denied');
    error.status = 403;
    patientPortalApi.getPatientInvoiceById.mockRejectedValue(error);

    render(
      <MemoryRouter initialEntries={['/patient/invoices/888']}>
        <Routes>
          <Route path="/patient/invoices/:id" element={<PatientInvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('invoice-detail-forbidden')).toBeInTheDocument();
    });

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('4. renders full invoice details, itemized charges, and payment history', async () => {
    patientPortalApi.getPatientInvoiceById.mockResolvedValue(sampleInvoiceDetail);

    render(
      <MemoryRouter initialEntries={['/patient/invoices/501']}>
        <Routes>
          <Route path="/patient/invoices/:id" element={<PatientInvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('invoice-detail-card')).toBeInTheDocument();
    });

    // Header info
    expect(screen.getByTestId('invoice-number')).toHaveTextContent('Invoice #INV-2026-0001');
    expect(screen.getByTestId('invoice-status')).toHaveTextContent('Partially paid');

    // Totals
    expect(screen.getByTestId('invoice-total')).toHaveTextContent('$150.00');
    expect(screen.getByTestId('invoice-paid')).toHaveTextContent('$50.00');
    expect(screen.getByTestId('invoice-balance')).toHaveTextContent('$100.00');

    // Notes
    expect(screen.getByTestId('invoice-notes')).toHaveTextContent('Follow-up appointment next month');

    // Itemized charges
    expect(screen.getByTestId('invoice-item-0')).toBeInTheDocument();
    expect(screen.getByText('Comprehensive Dental Cleaning & Examination')).toBeInTheDocument();

    // Payment history
    expect(screen.getByTestId('payment-row-701')).toBeInTheDocument();
    expect(screen.getByText('PAY-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('AUTH-12345')).toBeInTheDocument();
  });

  it('5. handles missing optional fields safely (no notes, empty items, empty payments)', async () => {
    const minimalInvoice = {
      id: 502,
      invoiceNumber: 'INV-2026-0002',
      invoiceDate: '2026-09-21',
      totalAmount: 75.00,
      paidAmount: 0.00,
      balanceAmount: 75.00,
      status: 'UNPAID',
      notes: null,
      items: [],
      payments: []
    };
    patientPortalApi.getPatientInvoiceById.mockResolvedValue(minimalInvoice);

    render(
      <MemoryRouter initialEntries={['/patient/invoices/502']}>
        <Routes>
          <Route path="/patient/invoices/:id" element={<PatientInvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('invoice-detail-card')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('invoice-notes')).not.toBeInTheDocument();
    expect(screen.getByText(/no itemized charges listed for this invoice/i)).toBeInTheDocument();
    expect(screen.getByTestId('no-payments-notice')).toHaveTextContent(/no payments have been recorded for this invoice yet/i);
  });

  it('6. opens receipt modal, renders real receipt data, and executes print action without PDF claim', async () => {
    patientPortalApi.getPatientInvoiceById.mockResolvedValue(sampleInvoiceDetail);
    patientPortalApi.getPatientReceipt.mockResolvedValue(sampleReceipt);

    render(
      <MemoryRouter initialEntries={['/patient/invoices/501']}>
        <Routes>
          <Route path="/patient/invoices/:id" element={<PatientInvoiceDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('view-receipt-btn-701')).toBeInTheDocument();
    });

    // Click View Receipt
    fireEvent.click(screen.getByTestId('view-receipt-btn-701'));

    await waitFor(() => {
      expect(screen.getByTestId('patient-receipt-modal')).toBeInTheDocument();
    });

    // Verify receipt data rendered truthfully
    expect(screen.getByTestId('receipt-number')).toHaveTextContent('PAY-2026-0001');
    expect(screen.getByTestId('receipt-amount')).toHaveTextContent('$50.00');
    expect(screen.getByTestId('receipt-invoice-num')).toHaveTextContent('INV-2026-0001');
    expect(screen.getByTestId('receipt-method')).toHaveTextContent('CARD');
    expect(screen.getByTestId('receipt-reference')).toHaveTextContent('AUTH-12345');
    expect(screen.getByTestId('receipt-remaining-balance')).toHaveTextContent('$100.00');

    // Verify NO "Download PDF" claim is made
    expect(screen.queryByText(/download pdf/i)).not.toBeInTheDocument();

    // Verify Print Receipt triggers window.print()
    const printBtn = screen.getByTestId('print-receipt-btn');
    expect(printBtn).toBeInTheDocument();
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalledTimes(1);

    // Close receipt modal
    fireEvent.click(screen.getByTestId('close-receipt-btn'));
    expect(screen.queryByTestId('patient-receipt-modal')).not.toBeInTheDocument();
  });
});
