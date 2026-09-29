import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvoiceDetailPage from '../pages/InvoiceDetailPage';
import ReversePaymentDialog from '../components/ReversePaymentDialog';
import * as billingApi from '../api/billingApi';
import { InvoiceStatus, PaymentMethod, PaymentStatus } from '../types';

vi.mock('../api/billingApi', async () => {
  const actual = await vi.importActual('../api/billingApi');
  return {
    ...actual,
    getInvoice: vi.fn(),
    getInvoicePayments: vi.fn(),
    recordPayment: vi.fn(),
    reversePayment: vi.fn(),
    issueInvoice: vi.fn(),
    cancelInvoice: vi.fn()
  };
});

describe('Payment History & Controlled Reversal (MF-05)', () => {
  const sampleInvoice = {
    id: 10,
    invoiceNumber: 'INV-2026-0010',
    patientId: 101,
    invoiceDate: '2026-09-15',
    treatmentPlanId: 4,
    status: InvoiceStatus.PARTIALLY_PAID,
    subtotal: 150.00,
    discountAmount: 0.00,
    totalAmount: 150.00,
    paidAmount: 50.00,
    balanceAmount: 100.00,
    notes: 'Payment history test note',
    issuedAt: '2026-09-15T09:00:00',
    items: [
      {
        id: 1,
        description: 'Comprehensive Exam',
        quantity: 1,
        unitPrice: 50.00,
        lineTotal: 50.00
      },
      {
        id: 2,
        description: 'Dental Scaling',
        quantity: 1,
        unitPrice: 100.00,
        lineTotal: 100.00
      }
    ]
  };

  const sampleRecordedPayment = {
    id: 101,
    invoiceId: 10,
    paymentNumber: 'REC-2026-0001',
    amount: 50.00,
    paymentMethod: PaymentMethod.CASH,
    paymentReference: 'CASH-REF-1',
    paidAt: '2026-09-15T10:00:00',
    status: PaymentStatus.RECORDED,
    reversalOfPaymentId: null,
    reversalReason: null,
    recordedBy: 2,
    createdAt: '2026-09-15T10:00:00'
  };

  const sampleReversedOriginalPayment = {
    ...sampleRecordedPayment,
    status: PaymentStatus.REVERSED,
    reversalReason: 'Duplicate entry entered in error'
  };

  const sampleCompensatingReversalPayment = {
    id: 102,
    invoiceId: 10,
    paymentNumber: 'REC-2026-0002',
    amount: 50.00,
    paymentMethod: PaymentMethod.CASH,
    paymentReference: 'CASH-REF-1',
    paidAt: '2026-09-15T11:00:00',
    status: PaymentStatus.REVERSED,
    reversalOfPaymentId: 101,
    reversalReason: 'Duplicate entry entered in error',
    recordedBy: 2,
    createdAt: '2026-09-15T11:00:00'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // PAYMENT HISTORY DISPLAY (1-16)
  // ==========================================
  describe('PAYMENT HISTORY DISPLAY', () => {
    it('1-2. payment history loads for invoice using getInvoicePayments(invoiceId)', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleRecordedPayment]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(billingApi.getInvoicePayments).toHaveBeenCalledWith(10);
      });
    });

    it('3. loading state renders while payments are fetching', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockReturnValueOnce(new Promise(() => {})); // pending

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('payments-loading')).toHaveTextContent(/loading payment history/i);
      });
    });

    it('4. empty history renders empty state message', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('no-payments-message')).toHaveTextContent(/no payments recorded/i);
      });
    });

    it('5-12. RECORDED payment renders with paymentNumber, amount, method, reference, and paidAt', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleRecordedPayment]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('REC-2026-0001')).toBeInTheDocument();
      });

      expect(screen.getAllByText('50.00').length).toBeGreaterThan(0);
      expect(screen.getByText('CASH')).toBeInTheDocument();
      expect(screen.getByText('CASH-REF-1')).toBeInTheDocument();
      expect(screen.getByText('RECORDED')).toBeInTheDocument();
    });

    it('11. null payment reference handled safely as dash', async () => {
      const paymentWithoutRef = {
        ...sampleRecordedPayment,
        paymentReference: null
      };
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([paymentWithoutRef]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('REC-2026-0001')).toBeInTheDocument();
      });

      // Reference cell should show '—'
      const historyTable = screen.getByRole('table', { name: /payment history table/i });
      expect(within(historyTable).getAllByText('—').length).toBeGreaterThan(0);
    });

    it('6, 13, 14, 15. both original REVERSED row and compensating reversal row render with reason and link', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([
        sampleReversedOriginalPayment,
        sampleCompensatingReversalPayment
      ]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('REC-2026-0001')).toBeInTheDocument();
      });

      // Both payment numbers render
      expect(screen.getByText('REC-2026-0002')).toBeInTheDocument();

      // Compensating reversal relationship renders
      expect(screen.getByText(/reversal of payment #101/i)).toBeInTheDocument();

      // Reversal reasons render
      expect(screen.getAllByText('Duplicate entry entered in error').length).toBe(2);

      // Status badges render REVERSED
      expect(screen.getAllByText('REVERSED').length).toBe(2);
    });

    it('16. history API error shown safely with retry button', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockRejectedValueOnce(
        new billingApi.BillingApiError(500, 'Database connection dropped while loading payments')
      );

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('payments-error')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/database connection dropped while loading payments/i)
      ).toBeInTheDocument();

      // Retry works
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleRecordedPayment]);
      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByText('REC-2026-0001')).toBeInTheDocument();
      });
      expect(billingApi.getInvoicePayments).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================
  // REVERSAL ELIGIBILITY VISIBILITY (17-19)
  // ==========================================
  describe('REVERSAL VISIBILITY', () => {
    it('17. RECORDED payment row shows Reverse Payment action', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleRecordedPayment]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reverse payment/i })).toBeInTheDocument();
      });
    });

    it('18. REVERSED original row hides Reverse Payment action', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleReversedOriginalPayment]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('REC-2026-0001')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /reverse payment/i })).not.toBeInTheDocument();
    });

    it('19. compensating reversal row hides Reverse Payment action', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleCompensatingReversalPayment]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('REC-2026-0002')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /reverse payment/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // REVERSAL DIALOG (20-26)
  // ==========================================
  describe('REVERSAL DIALOG', () => {
    it('20-22. clicking Reverse Payment opens dialog displaying payment summary and reason field', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleRecordedPayment]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reverse payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /reverse payment/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /reverse payment/i })).toBeInTheDocument();
      expect(screen.getByText(/Payment #REC-2026-0001/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/reversal reason/i)).toBeInTheDocument();
    });

    it('23-24. blank and whitespace-only reason rejected client-side', async () => {
      render(
        <ReversePaymentDialog payment={sampleRecordedPayment} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      // Blank
      fireEvent.click(screen.getByRole('button', { name: /confirm reversal/i }));
      expect(screen.getByText(/reversal reason is required and cannot be blank/i)).toBeInTheDocument();
      expect(billingApi.reversePayment).not.toHaveBeenCalled();

      // Whitespace
      fireEvent.change(screen.getByLabelText(/reversal reason/i), { target: { value: '    ' } });
      fireEvent.click(screen.getByRole('button', { name: /confirm reversal/i }));
      expect(screen.getByText(/reversal reason is required and cannot be blank/i)).toBeInTheDocument();
      expect(billingApi.reversePayment).not.toHaveBeenCalled();
    });

    it('25. valid reason accepted and submitted', async () => {
      billingApi.reversePayment.mockResolvedValueOnce({ id: 101, status: 'REVERSED' });
      const handleSuccess = vi.fn();

      render(
        <ReversePaymentDialog
          payment={sampleRecordedPayment}
          onClose={vi.fn()}
          onSuccess={handleSuccess}
        />
      );

      fireEvent.change(screen.getByLabelText(/reversal reason/i), {
        target: { value: 'Patient cancelled treatment procedure' }
      });
      fireEvent.click(screen.getByRole('button', { name: /confirm reversal/i }));

      await waitFor(() => {
        expect(billingApi.reversePayment).toHaveBeenCalledWith(101, {
          reason: 'Patient cancelled treatment procedure'
        });
      });
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });

    it('26. cancel button closes dialog without API call', () => {
      const handleClose = vi.fn();
      render(
        <ReversePaymentDialog
          payment={sampleRecordedPayment}
          onClose={handleClose}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(billingApi.reversePayment).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // REQUEST PAYLOAD CONTRACT (27-32)
  // ==========================================
  describe('REQUEST PAYLOAD CONTRACT', () => {
    it('27-32. calls reversePayment with correct paymentId, clean reason, and strictly no user/actor fields', async () => {
      billingApi.reversePayment.mockResolvedValueOnce({ id: 101 });

      render(
        <ReversePaymentDialog payment={sampleRecordedPayment} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/reversal reason/i), {
        target: { value: ' Billing mistake corrected ' }
      });
      fireEvent.click(screen.getByRole('button', { name: /confirm reversal/i }));

      await waitFor(() => {
        expect(billingApi.reversePayment).toHaveBeenCalledTimes(1);
      });

      const [paymentId, payload] = billingApi.reversePayment.mock.calls[0];
      // 32. correct payment ID
      expect(paymentId).toBe(101);
      // 28. reason trimmed
      expect(payload.reason).toBe('Billing mistake corrected');
      // 29-31. no reversedBy, userId, staffId, actor
      expect(payload).not.toHaveProperty('reversedBy');
      expect(payload).not.toHaveProperty('userId');
      expect(payload).not.toHaveProperty('staffId');
      expect(payload).not.toHaveProperty('actor');
    });
  });

  // ==========================================
  // SUCCESS REFRESH FLOW (33-42)
  // ==========================================
  describe('SUCCESS REFRESH FLOW', () => {
    it('33-42. successful reversal refreshes history and invoice, preserves history records, updates totals/status, and displays feedback', async () => {
      // 1. Initial state
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleRecordedPayment]);

      // 2. Reversal API succeeds
      billingApi.reversePayment.mockResolvedValueOnce(sampleCompensatingReversalPayment);

      // 3. Post-reversal refreshed responses:
      // Invoice totals refreshed to UNPAID with 0 paid
      billingApi.getInvoice.mockResolvedValueOnce({
        ...sampleInvoice,
        paidAmount: 0.00,
        balanceAmount: 150.00,
        status: InvoiceStatus.UNPAID
      });

      // Payments list now includes original as REVERSED and compensating reversal row
      billingApi.getInvoicePayments.mockResolvedValueOnce([
        sampleReversedOriginalPayment,
        sampleCompensatingReversalPayment
      ]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reverse payment/i })).toBeInTheDocument();
      });

      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /reverse payment/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Submit reversal
      fireEvent.change(screen.getByLabelText(/reversal reason/i), {
        target: { value: 'Duplicate entry entered in error' }
      });
      fireEvent.click(screen.getByRole('button', { name: /confirm reversal/i }));

      // 33. getInvoicePayments called 2nd time (refresh)
      await waitFor(() => {
        expect(billingApi.getInvoicePayments).toHaveBeenCalledTimes(2);
      });

      // 34. getInvoice called 2nd time (refresh)
      expect(billingApi.getInvoice).toHaveBeenCalledTimes(2);

      // 41. Reversal dialog closes
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // 42. Success feedback shown
      expect(screen.getByTestId('invoice-action-success')).toHaveTextContent(
        /payment reversed successfully/i
      );

      // 35. Original payment remains in history
      expect(screen.getByText('REC-2026-0001')).toBeInTheDocument();

      // 36. Compensating reversal record appears
      expect(screen.getByText('REC-2026-0002')).toBeInTheDocument();

      // 37. Reversal reason displays
      expect(screen.getAllByText('Duplicate entry entered in error').length).toBe(2);

      // 38. Refreshed paidAmount displayed
      expect(screen.getAllByText('0.00').length).toBeGreaterThan(0);

      // 39. Refreshed balance displayed
      expect(screen.getAllByText('150.00').length).toBeGreaterThan(0);

      // 40. Refreshed status displayed
      const badges = screen.getAllByRole('status');
      expect(badges.some((b) => b.textContent === 'Unpaid')).toBe(true);
    });
  });

  // ==========================================
  // FAILURE & BUSY STATE HANDLING (43-50)
  // ==========================================
  describe('FAILURE & BUSY STATE', () => {
    it('43. duplicate/already-reversed backend rejection shown safely in dialog', async () => {
      billingApi.reversePayment.mockRejectedValueOnce(
        new billingApi.BillingApiError(400, 'Payment has already been reversed')
      );

      render(
        <ReversePaymentDialog
          payment={sampleRecordedPayment}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.change(screen.getByLabelText(/reversal reason/i), {
        target: { value: 'Testing already reversed' }
      });
      fireEvent.click(screen.getByRole('button', { name: /confirm reversal/i }));

      await waitFor(() => {
        expect(screen.getByTestId('reverse-dialog-error')).toBeInTheDocument();
      });

      expect(screen.getByText(/payment has already been reversed/i)).toBeInTheDocument();
    });

    it('44. payment-not-found error handled safely in dialog', async () => {
      billingApi.reversePayment.mockRejectedValueOnce(
        new billingApi.BillingApiError(404, 'Payment not found with ID 101')
      );

      render(
        <ReversePaymentDialog
          payment={sampleRecordedPayment}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.change(screen.getByLabelText(/reversal reason/i), {
        target: { value: 'Testing not found' }
      });
      fireEvent.click(screen.getByRole('button', { name: /confirm reversal/i }));

      await waitFor(() => {
        expect(screen.getByTestId('reverse-dialog-error')).toBeInTheDocument();
      });

      expect(screen.getByText(/payment not found with id 101/i)).toBeInTheDocument();
    });

    it('46. server/network error handled safely in dialog', async () => {
      billingApi.reversePayment.mockRejectedValueOnce(
        new billingApi.BillingApiError(500, 'Internal database lock acquisition failure')
      );

      render(
        <ReversePaymentDialog
          payment={sampleRecordedPayment}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.change(screen.getByLabelText(/reversal reason/i), {
        target: { value: 'Testing server failure' }
      });
      fireEvent.click(screen.getByRole('button', { name: /confirm reversal/i }));

      await waitFor(() => {
        expect(screen.getByTestId('reverse-dialog-error')).toHaveTextContent(
          /internal database lock acquisition failure/i
        );
      });
    });

    it('47-48. failed reversal does not mutate local financial state and leaves history intact', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleRecordedPayment]);
      billingApi.reversePayment.mockRejectedValueOnce(
        new billingApi.BillingApiError(500, 'Reversal transaction aborted')
      );

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reverse payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /reverse payment/i }));

      fireEvent.change(screen.getByLabelText(/reversal reason/i), {
        target: { value: 'Attempted reversal reason' }
      });
      fireEvent.click(screen.getByRole('button', { name: /confirm reversal/i }));

      await waitFor(() => {
        expect(screen.getByTestId('reverse-dialog-error')).toBeInTheDocument();
      });

      // Close dialog
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      // Financial state remains 50.00 paid and 100.00 balance
      expect(screen.getAllByText('50.00').length).toBeGreaterThan(0);
      expect(screen.getAllByText('100.00').length).toBeGreaterThan(0);
      expect(screen.getByText('REC-2026-0001')).toBeInTheDocument();
      expect(screen.getByText('RECORDED')).toBeInTheDocument();
    });

    it('49-50. duplicate reversal submission prevented and reverse button disabled while pending', async () => {
      let resolveReversal;
      const pendingPromise = new Promise((resolve) => {
        resolveReversal = resolve;
      });
      billingApi.reversePayment.mockReturnValueOnce(pendingPromise);

      render(
        <ReversePaymentDialog
          payment={sampleRecordedPayment}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.change(screen.getByLabelText(/reversal reason/i), {
        target: { value: 'Testing in flight duplicate prevention' }
      });

      const confirmBtn = screen.getByRole('button', { name: /confirm reversal/i });
      fireEvent.click(confirmBtn);

      const pendingBtn = screen.getByRole('button', { name: /reversing payment\.\.\./i });
      expect(pendingBtn).toBeDisabled();
      expect(billingApi.reversePayment).toHaveBeenCalledTimes(1);

      fireEvent.click(pendingBtn);
      expect(billingApi.reversePayment).toHaveBeenCalledTimes(1);

      resolveReversal({ id: 101 });
      await waitFor(() => {
        expect(billingApi.reversePayment).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ==========================================
  // PAYMENT RECORDING INTEGRATION (51-52)
  // ==========================================
  describe('PAYMENT RECORDING INTEGRATION', () => {
    it('51-52. successful newly recorded payment causes payment history refresh', async () => {
      // 1. Initial state has no payments
      billingApi.getInvoice.mockResolvedValueOnce({
        ...sampleInvoice,
        status: InvoiceStatus.UNPAID,
        paidAmount: 0.00,
        balanceAmount: 150.00
      });
      billingApi.getInvoicePayments.mockResolvedValueOnce([]);

      // 2. recordPayment succeeds
      billingApi.recordPayment.mockResolvedValueOnce({
        id: 101,
        invoiceId: 10,
        amount: 50.00,
        paymentMethod: PaymentMethod.CASH,
        status: 'RECORDED'
      });

      // 3. getInvoice and getInvoicePayments refresh
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([sampleRecordedPayment]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('no-payments-message')).toBeInTheDocument();
      });

      // Record payment
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));
      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '50.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /^record payment$/i }));

      // History should refresh and display the newly recorded payment
      await waitFor(() => {
        expect(billingApi.getInvoicePayments).toHaveBeenCalledTimes(2);
      });

      expect(screen.getByText('REC-2026-0001')).toBeInTheDocument();
      expect(screen.queryByTestId('no-payments-message')).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // BOUNDARIES (53-59)
  // ==========================================
  describe('BOUNDARIES', () => {
    it('53-59. no delete, edit, receipt, print, report controls, no local status mutation, and no hidden history', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleInvoice);
      billingApi.getInvoicePayments.mockResolvedValueOnce([
        sampleReversedOriginalPayment,
        sampleCompensatingReversalPayment
      ]);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('REC-2026-0001')).toBeInTheDocument();
      });

      const historyTable = screen.getByRole('table', { name: /payment history table/i });

      // 53. No delete payment button
      expect(within(historyTable).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();

      // 54. No edit payment button
      expect(within(historyTable).queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();

      // 55. No receipt control introduced in this slice
      expect(within(historyTable).queryByRole('button', { name: /receipt/i })).not.toBeInTheDocument();

      // 56. No print control introduced in this slice
      expect(within(historyTable).queryByRole('button', { name: /print/i })).not.toBeInTheDocument();

      // 57. No report UI introduced
      expect(screen.queryByText(/income report/i)).not.toBeInTheDocument();

      // 59. Both REVERSED rows remain visible (not hidden or filtered out)
      expect(within(historyTable).getByText('REC-2026-0001')).toBeInTheDocument();
      expect(within(historyTable).getByText('REC-2026-0002')).toBeInTheDocument();
    });
  });
});
