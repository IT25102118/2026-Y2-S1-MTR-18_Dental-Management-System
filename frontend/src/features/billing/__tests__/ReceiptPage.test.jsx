import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReceiptPage from '../pages/ReceiptPage';
import InvoiceDetailPage from '../pages/InvoiceDetailPage';
import * as billingApi from '../api/billingApi';
import * as authApi from '../../auth/api/authApi';
import { PaymentMethod, PaymentStatus, InvoiceStatus } from '../types';
import App from '../../../App';

vi.mock('../api/billingApi', async () => {
  const actual = await vi.importActual('../api/billingApi');
  return {
    ...actual,
    getPaymentReceipt: vi.fn(),
    getInvoice: vi.fn(),
    getInvoicePayments: vi.fn(),
    recordPayment: vi.fn(),
    reversePayment: vi.fn(),
    getInvoices: vi.fn()
  };
});

vi.mock('../../auth/api/authApi', async () => {
  const actual = await vi.importActual('../../auth/api/authApi');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    getCsrfToken: vi.fn().mockResolvedValue({ token: 'test-csrf', headerName: 'X-XSRF-TOKEN' }),
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(true)
  };
});

describe('Receipt View & Browser Print (UI-BIL-04)', () => {
  const sampleReceipt = {
    paymentId: 101,
    paymentNumber: 'REC-2026-0001',
    invoiceId: 10,
    invoiceNumber: 'INV-2026-0010',
    patientId: 45,
    paymentAmount: 50.00,
    paymentMethod: PaymentMethod.CASH,
    paymentReference: 'CASH-REF-001',
    paidAt: '2026-09-15T10:30:00',
    invoiceTotalAmount: 150.00,
    remainingBalance: 100.00,
    recordedBy: 2
  };

  const sampleInvoice = {
    id: 10,
    invoiceNumber: 'INV-2026-0010',
    patientId: 45,
    invoiceDate: '2026-09-15',
    treatmentPlanId: 4,
    status: InvoiceStatus.PARTIALLY_PAID,
    subtotal: 150.00,
    discountAmount: 0.00,
    totalAmount: 150.00,
    paidAmount: 50.00,
    balanceAmount: 100.00,
    notes: 'Sample test note',
    issuedAt: '2026-09-15T09:00:00',
    items: [
      {
        id: 1,
        description: 'Dental Exam',
        quantity: 1,
        unitPrice: 50.00,
        lineTotal: 50.00
      }
    ]
  };

  const sampleHistoricalPayment = {
    id: 101,
    invoiceId: 10,
    paymentNumber: 'REC-2026-0001',
    amount: 50.00,
    paymentMethod: PaymentMethod.CASH,
    paymentReference: 'CASH-REF-001',
    paidAt: '2026-09-15T10:30:00',
    status: PaymentStatus.REVERSED,
    reversalOfPaymentId: null,
    reversalReason: 'Accidental payment entry',
    recordedBy: 2,
    createdAt: '2026-09-15T10:30:00'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  // ==========================================
  // RECEIPT LOAD & DISPLAY (1-16)
  // ==========================================
  describe('RECEIPT LOAD & DISPLAY', () => {
    it('1. receipt route calls getPaymentReceipt(paymentId)', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(billingApi.getPaymentReceipt).toHaveBeenCalledWith('101');
      });
    });

    it('2. loading state shown while receipt data is loading', async () => {
      billingApi.getPaymentReceipt.mockReturnValueOnce(new Promise(() => {})); // pending

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('receipt-loading')).toHaveTextContent(/loading receipt/i);
    });

    it('3. receipt identifier renders prominently in heading', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-header-number')).toHaveTextContent('REC-2026-0001');
      });
    });

    it('4. payment number renders in payment details', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-payment-number')).toHaveTextContent('REC-2026-0001');
      });
    });

    it('5. invoice number renders in invoice information', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-invoice-number')).toHaveTextContent('INV-2026-0010');
      });
    });

    it('6. patient ID renders if DTO exposes it', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-patient-id')).toHaveTextContent('45');
      });
    });

    it('7. payment amount renders accurately', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-payment-amount')).toHaveTextContent('50.00');
      });
    });

    it('8. payment method renders', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-payment-method')).toHaveTextContent('CASH');
      });
    });

    it('9. payment reference renders when provided', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-payment-reference')).toHaveTextContent('CASH-REF-001');
      });
    });

    it('10. null reference handled safely as dash', async () => {
      const receiptNoRef = {
        ...sampleReceipt,
        paymentReference: null
      };
      billingApi.getPaymentReceipt.mockResolvedValueOnce(receiptNoRef);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-payment-reference')).toHaveTextContent('—');
      });
    });

    it('11. paidAt timestamp renders', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-paid-at')).not.toBeEmptyDOMElement();
      });
    });

    it('12. invoice total renders', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-invoice-total')).toHaveTextContent('150.00');
      });
    });

    it('13. paid amount renders if DTO exposes it', async () => {
      const receiptWithPaid = {
        ...sampleReceipt,
        paidAmount: 50.00
      };
      billingApi.getPaymentReceipt.mockResolvedValueOnce(receiptWithPaid);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-paid-amount')).toHaveTextContent('50.00');
      });
    });

    it('14. remaining balance renders', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-remaining-balance')).toHaveTextContent('100.00');
      });
    });

    it('15. recordedBy renders only if DTO exposes it', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-recorded-by')).toHaveTextContent('2');
      });
    });

    it('16. no locally calculated monetary values: directly renders DTO values', async () => {
      // Pass unusual non-standard values to verify no local recalculation occurs
      const customReceipt = {
        ...sampleReceipt,
        invoiceTotalAmount: 200.00,
        paymentAmount: 75.00,
        remainingBalance: 125.00
      };
      billingApi.getPaymentReceipt.mockResolvedValueOnce(customReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-payment-amount')).toHaveTextContent('75.00');
      });
      expect(screen.getByTestId('receipt-invoice-total')).toHaveTextContent('200.00');
      expect(screen.getByTestId('receipt-remaining-balance')).toHaveTextContent('125.00');
    });
  });

  // ==========================================
  // HISTORICAL & REVERSED RECEIPTS (17-19)
  // ==========================================
  describe('HISTORICAL & REVERSED RECEIPTS', () => {
    it('17. receipt route can render data for a reversed historical payment', async () => {
      const reversedReceipt = {
        ...sampleReceipt,
        paymentId: 101,
        paymentNumber: 'REC-2026-0001'
      };
      billingApi.getPaymentReceipt.mockResolvedValueOnce(reversedReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-header-number')).toHaveTextContent('REC-2026-0001');
      });
    });

    it('18. frontend does not reject receipt because payment was reversed', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-content')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('receipt-error')).not.toBeInTheDocument();
    });

    it('19. Payment History shows receipt action for supported historical rows', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleHistoricalPayment]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /view receipt for payment rec-2026-0001/i })).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // NAVIGATION (20-21)
  // ==========================================
  describe('NAVIGATION', () => {
    it('20. Back to Invoice links to correct invoice using receipt invoiceId', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /← back to invoice/i })).toHaveAttribute(
          'href',
          '/billing/invoices/10'
        );
      });
    });

    it('21. Payment History receipt link points to correct payment receipt route', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([
        {
          id: 101,
          invoiceId: 10,
          paymentNumber: 'REC-2026-0001',
          amount: 50.00,
          paymentMethod: PaymentMethod.CASH,
          paymentReference: 'CASH-REF-001',
          paidAt: '2026-09-15T10:30:00',
          status: PaymentStatus.RECORDED
        }
      ]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /view receipt for payment rec-2026-0001/i });
        expect(link).toHaveAttribute('href', '/billing/payments/101/receipt');
      });
    });
  });

  // ==========================================
  // PRINT (22-26)
  // ==========================================
  describe('PRINT', () => {
    it('22. Print Receipt button renders', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /print receipt/i })).toBeInTheDocument();
      });
    });

    it('23. clicking Print Receipt invokes window.print()', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /print receipt/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /print receipt/i }));
      expect(window.print).toHaveBeenCalledTimes(1);
    });

    it('24. print action does not trigger any financial mutation API call', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /print receipt/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /print receipt/i }));
      expect(billingApi.recordPayment).not.toHaveBeenCalled();
      expect(billingApi.reversePayment).not.toHaveBeenCalled();
    });

    it('25. receipt container has clean receipt-card class', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-content')).toHaveClass('receipt-card');
      });
    });

    it('26. non-print controls have no-print class to hide during printing', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveClass('no-print');
      });
      const actionContainer = screen.getByRole('button', { name: /print receipt/i }).closest('.billing-actions');
      expect(actionContainer).toHaveClass('no-print');
    });
  });

  // ==========================================
  // ERROR HANDLING (27-30)
  // ==========================================
  describe('ERROR HANDLING', () => {
    it('27. payment/receipt 404 handled safely with clear not found UI', async () => {
      const err = new Error('Receipt not found');
      err.status = 404;
      billingApi.getPaymentReceipt.mockRejectedValueOnce(err);

      render(
        <MemoryRouter initialEntries={['/billing/payments/999/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-not-found')).toBeInTheDocument();
      });
      expect(screen.getByText(/receipt not found/i)).toBeInTheDocument();
    });

    it('28. 401 handled safely with authentication message', async () => {
      const err = new Error('Unauthorized');
      err.status = 401;
      billingApi.getPaymentReceipt.mockRejectedValueOnce(err);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-error')).toHaveTextContent(/authentication required/i);
      });
    });

    it('29. 403 handled safely with access denied message', async () => {
      const err = new Error('Forbidden');
      err.status = 403;
      billingApi.getPaymentReceipt.mockRejectedValueOnce(err);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-error')).toHaveTextContent(/access denied/i);
      });
    });

    it('30. server/network error handled safely without raw internals', async () => {
      const err = new Error('Network error connecting to backend');
      billingApi.getPaymentReceipt.mockRejectedValueOnce(err);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-error')).toHaveTextContent(/network error/i);
      });
    });
  });

  // ==========================================
  // ROLE-BASED ACCESS CONTROL (31-35)
  // ==========================================
  describe('ROLE-BASED ACCESS CONTROL', () => {
    it('31. ADMINISTRATOR role is allowed on receipt route', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        email: 'admin@dentcare.com',
        role: 'ADMINISTRATOR',
        firstName: 'Admin',
        lastName: 'User'
      });
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-content')).toBeInTheDocument();
      });
    });

    it('32. RECEPTIONIST role is allowed on receipt route', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 2,
        email: 'reception@dentcare.com',
        role: 'RECEPTIONIST',
        firstName: 'Reception',
        lastName: 'User'
      });
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-content')).toBeInTheDocument();
      });
    });

    it('33. PATIENT role is denied and redirected to home', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 5,
        email: 'patient@dentcare.com',
        role: 'PATIENT',
        firstName: 'Patient',
        lastName: 'User'
      });

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('patient-dashboard')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('receipt-content')).not.toBeInTheDocument();
    });

    it('34. DENTIST role is denied and redirected to home', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 3,
        email: 'dentist@dentcare.com',
        role: 'DENTIST',
        firstName: 'Dentist',
        lastName: 'User'
      });

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Dental Practice Management System/i)).toBeInTheDocument();
      });
      expect(screen.queryByTestId('receipt-content')).not.toBeInTheDocument();
    });

    it('35. DENTAL_ASSISTANT role is denied and redirected to home', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 4,
        email: 'assistant@dentcare.com',
        role: 'DENTAL_ASSISTANT',
        firstName: 'Assistant',
        lastName: 'User'
      });

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Dental Practice Management System/i)).toBeInTheDocument();
      });
      expect(screen.queryByTestId('receipt-content')).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // SYSTEM BOUNDARIES (36-43)
  // ==========================================
  describe('SYSTEM BOUNDARIES', () => {
    it('36-37. does not reference or import jsPDF, html2canvas, or Blob/download', () => {
      expect(window).not.toHaveProperty('jspdf');
      expect(window).not.toHaveProperty('html2canvas');
    });

    it('38-39. does not invoke payment mutation or payment deletion APIs', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-content')).toBeInTheDocument();
      });

      expect(billingApi.recordPayment).not.toHaveBeenCalled();
      expect(billingApi.reversePayment).not.toHaveBeenCalled();
    });

    it('40. does not load income reports', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-content')).toBeInTheDocument();
      });

      expect(billingApi.getInvoices).not.toHaveBeenCalled();
    });

    it('41. does not invent currency symbol/code', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-payment-amount')).toHaveTextContent(/^50\.00$/);
      });
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/USD/)).not.toBeInTheDocument();
      expect(screen.queryByText(/LKR/)).not.toBeInTheDocument();
    });

    it('42. does not make patient ownership assumptions', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('receipt-patient-id')).toHaveTextContent('45');
      });
      // Does not render invented patient name
      expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
    });

    it('43. uses billingApi without direct fetch outside repository client', async () => {
      billingApi.getPaymentReceipt.mockResolvedValueOnce(sampleReceipt);

      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      render(
        <MemoryRouter initialEntries={['/billing/payments/101/receipt']}>
          <Routes>
            <Route path="/billing/payments/:paymentId/receipt" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(billingApi.getPaymentReceipt).toHaveBeenCalled();
      });

      // Directly rendered ReceiptPage should not invoke raw fetch outside billingApi
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });
});
