import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvoiceDetailPage from '../pages/InvoiceDetailPage';
import PaymentDialog from '../components/PaymentDialog';
import * as billingApi from '../api/billingApi';
import { InvoiceStatus, PaymentMethod } from '../types';

vi.mock('../api/billingApi', async () => {
  const actual = await vi.importActual('../api/billingApi');
  return {
    ...actual,
    getInvoice: vi.fn(),
    getInvoicePayments: vi.fn().mockResolvedValue([]),
    recordPayment: vi.fn(),
    issueInvoice: vi.fn(),
    cancelInvoice: vi.fn()
  };
});

describe('PaymentDialog & Payment Recording (UI-BIL-03)', () => {
  const sampleUnpaidInvoice = {
    id: 10,
    invoiceNumber: 'INV-2026-0010',
    patientId: 101,
    invoiceDate: '2026-09-15',
    treatmentPlanId: 4,
    status: InvoiceStatus.UNPAID,
    subtotal: 150.00,
    discountAmount: 0.00,
    totalAmount: 150.00,
    paidAmount: 0.00,
    balanceAmount: 150.00,
    notes: 'Standard consultation and cleaning',
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

  const samplePartiallyPaidInvoice = {
    ...sampleUnpaidInvoice,
    status: InvoiceStatus.PARTIALLY_PAID,
    paidAmount: 50.00,
    balanceAmount: 100.00
  };

  const sampleDraftInvoice = {
    ...sampleUnpaidInvoice,
    status: InvoiceStatus.DRAFT,
    issuedAt: null
  };

  const samplePaidInvoice = {
    ...sampleUnpaidInvoice,
    status: InvoiceStatus.PAID,
    paidAmount: 150.00,
    balanceAmount: 0.00
  };

  const sampleCancelledInvoice = {
    ...sampleUnpaidInvoice,
    status: InvoiceStatus.CANCELLED,
    issuedAt: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // VISIBILITY TESTS (1-5)
  // ==========================================
  describe('VISIBILITY', () => {
    it('1. UNPAID invoice shows Record Payment button', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument();
      });
    });

    it('2. PARTIALLY_PAID invoice shows Record Payment button', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(samplePartiallyPaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument();
      });
    });

    it('3. DRAFT hides Record Payment button', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice #INV-2026-0010');
      });

      expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
    });

    it('4. PAID hides Record Payment button', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(samplePaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice #INV-2026-0010');
      });

      expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
    });

    it('5. CANCELLED hides Record Payment button', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleCancelledInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice #INV-2026-0010');
      });

      expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // DIALOG INTERACTION TESTS (6-12)
  // ==========================================
  describe('DIALOG', () => {
    it('6. clicking Record Payment opens dialog', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /record payment/i })).toBeInTheDocument();
    });

    it('7. amount input renders in dialog', () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      expect(screen.getByLabelText(/payment amount/i)).toBeInTheDocument();
    });

    it('8. payment method selector renders in dialog', () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
    });

    it('9. reference field renders in dialog', () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      expect(screen.getByLabelText(/payment reference/i)).toBeInTheDocument();
    });

    it('10. all four payment methods available', () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      const select = screen.getByLabelText(/payment method/i);
      const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);

      expect(options).toContain(PaymentMethod.CASH);
      expect(options).toContain(PaymentMethod.CARD);
      expect(options).toContain(PaymentMethod.BANK_TRANSFER);
      expect(options).toContain(PaymentMethod.OTHER);
    });

    it('11. cancel button closes dialog', () => {
      const handleClose = vi.fn();
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={handleClose} onSuccess={vi.fn()} />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('12. cancel makes no API request', () => {
      const handleClose = vi.fn();
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={handleClose} onSuccess={vi.fn()} />
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(billingApi.recordPayment).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // VALIDATION TESTS (13-19)
  // ==========================================
  describe('VALIDATION', () => {
    it('13. empty amount blocked client-side', async () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      expect(screen.getByText(/payment amount is required/i)).toBeInTheDocument();
      expect(billingApi.recordPayment).not.toHaveBeenCalled();
    });

    it('14. zero amount blocked client-side', async () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      expect(
        screen.getByText(/payment amount must be strictly greater than zero/i)
      ).toBeInTheDocument();
      expect(billingApi.recordPayment).not.toHaveBeenCalled();
    });

    it('15. negative amount blocked client-side', async () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '-25.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      expect(
        screen.getByText(/payment amount must be strictly greater than zero/i)
      ).toBeInTheDocument();
      expect(billingApi.recordPayment).not.toHaveBeenCalled();
    });

    it('16. missing payment method blocked client-side', async () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '50.00' } });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      expect(screen.getByText(/payment method is required/i)).toBeInTheDocument();
      expect(billingApi.recordPayment).not.toHaveBeenCalled();
    });

    it('17. amount greater than current balance blocked client-side', async () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      // Balance is 150.00; enter 200.00
      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '200.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CARD }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      expect(
        screen.getByText(/payment amount cannot exceed remaining balance of 150\.00/i)
      ).toBeInTheDocument();
      expect(billingApi.recordPayment).not.toHaveBeenCalled();
    });

    it('18. valid partial amount accepted and submitted', async () => {
      billingApi.recordPayment.mockResolvedValueOnce({
        id: 1,
        invoiceId: 10,
        amount: 50.00,
        paymentMethod: PaymentMethod.CASH,
        status: 'RECORDED'
      });
      const handleSuccess = vi.fn();

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={handleSuccess} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '50.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);
      });

      expect(billingApi.recordPayment).toHaveBeenCalledWith(10, {
        amount: 50,
        paymentMethod: PaymentMethod.CASH
      });
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });

    it('19. full balance amount accepted and Pay Full Balance helper populates amount', async () => {
      billingApi.recordPayment.mockResolvedValueOnce({
        id: 2,
        invoiceId: 10,
        amount: 150.00,
        paymentMethod: PaymentMethod.CARD,
        status: 'RECORDED'
      });
      const handleSuccess = vi.fn();

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={handleSuccess} />
      );

      // Click helper to populate full balance
      fireEvent.click(screen.getByRole('button', { name: /pay full balance/i }));
      expect(screen.getByLabelText(/payment amount/i)).toHaveValue(150);

      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CARD }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledWith(10, {
          amount: 150,
          paymentMethod: PaymentMethod.CARD
        });
      });
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // REQUEST PAYLOAD TESTS (20-26)
  // ==========================================
  describe('REQUEST PAYLOAD', () => {
    it('20. valid submit calls recordPayment(invoiceId, request)', async () => {
      billingApi.recordPayment.mockResolvedValueOnce({ id: 1 });

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '75.50' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.BANK_TRANSFER }
      });
      fireEvent.change(screen.getByLabelText(/payment reference/i), {
        target: { value: 'TXN-98765' }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);
      });
      expect(billingApi.recordPayment).toHaveBeenCalledWith(10, expect.any(Object));
    });

    it('21. amount sent correctly as number', async () => {
      billingApi.recordPayment.mockResolvedValueOnce({ id: 1 });

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '75.50' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);
      });
      const [, payload] = billingApi.recordPayment.mock.calls[0];
      expect(payload.amount).toBe(75.5);
    });

    it('22. paymentMethod sent exactly', async () => {
      billingApi.recordPayment.mockResolvedValueOnce({ id: 1 });

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '10.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.OTHER }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);
      });
      const [, payload] = billingApi.recordPayment.mock.calls[0];
      expect(payload.paymentMethod).toBe(PaymentMethod.OTHER);
    });

    it('23. paymentReference sent correctly when populated', async () => {
      billingApi.recordPayment.mockResolvedValueOnce({ id: 1 });

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '10.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.change(screen.getByLabelText(/payment reference/i), {
        target: { value: 'REC-00123' }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);
      });
      const [, payload] = billingApi.recordPayment.mock.calls[0];
      expect(payload.paymentReference).toBe('REC-00123');
    });

    it('24. request contains no recordedBy', async () => {
      billingApi.recordPayment.mockResolvedValueOnce({ id: 1 });

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '10.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);
      });
      const [, payload] = billingApi.recordPayment.mock.calls[0];
      expect(payload).not.toHaveProperty('recordedBy');
    });

    it('25. request contains no userId', async () => {
      billingApi.recordPayment.mockResolvedValueOnce({ id: 1 });

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '10.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);
      });
      const [, payload] = billingApi.recordPayment.mock.calls[0];
      expect(payload).not.toHaveProperty('userId');
    });

    it('26. request contains no actor/staff field', async () => {
      billingApi.recordPayment.mockResolvedValueOnce({ id: 1 });

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '10.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);
      });
      const [, payload] = billingApi.recordPayment.mock.calls[0];
      expect(payload).not.toHaveProperty('actor');
      expect(payload).not.toHaveProperty('staffId');
      expect(payload).not.toHaveProperty('role');
    });
  });

  // ==========================================
  // SUCCESS FLOW TESTS (27-33)
  // ==========================================
  describe('SUCCESS FLOW', () => {
    it('27-33. full success flow refreshes invoice, updates amounts, updates status, removes button on PAID, and closes dialog', async () => {
      // 1. Initial load returns UNPAID invoice
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);

      // 2. Payment submission succeeds
      billingApi.recordPayment.mockResolvedValueOnce({
        id: 5,
        invoiceId: 10,
        amount: 150.00,
        paymentMethod: PaymentMethod.CARD,
        status: 'RECORDED'
      });

      // 3. getInvoice refresh returns PAID invoice
      billingApi.getInvoice.mockResolvedValueOnce({
        ...sampleUnpaidInvoice,
        paidAmount: 150.00,
        balanceAmount: 0.00,
        status: InvoiceStatus.PAID
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument();
      });

      // Open dialog
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Submit payment
      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '150.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CARD }
      });
      fireEvent.click(screen.getByRole('button', { name: /^record payment$/i }));

      // 27. getInvoice called for refresh
      await waitFor(() => {
        expect(billingApi.getInvoice).toHaveBeenCalledTimes(2);
      });

      // 32. Success feedback shown
      expect(screen.getByTestId('invoice-action-success')).toHaveTextContent(
        /payment recorded successfully/i
      );

      // 33. Dialog closes
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // 28. Refreshed paidAmount renders
      expect(screen.getAllByText('150.00').length).toBeGreaterThan(0);

      // 29. Refreshed balance renders
      expect(screen.getAllByText('0.00').length).toBeGreaterThan(0);

      // 30. Refreshed status badge renders
      const badges = screen.getAllByRole('status');
      expect(badges.some((b) => b.textContent === 'Paid')).toBe(true);

      // 31. PAID refresh removes Record Payment button
      expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // ERROR HANDLING TESTS (34-39)
  // ==========================================
  describe('ERROR HANDLING', () => {
    it('34. backend overpayment error shown safely in dialog', async () => {
      billingApi.recordPayment.mockRejectedValueOnce(
        new billingApi.BillingApiError(
          400,
          'Payment amount exceeds remaining balance of 100.00 (Overpayment)'
        )
      );

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '120.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(screen.getByTestId('payment-dialog-error')).toBeInTheDocument();
      });

      expect(screen.getByText(/payment amount exceeds remaining balance/i)).toBeInTheDocument();
    });

    it('35. backend invalid-status error shown safely in dialog', async () => {
      billingApi.recordPayment.mockRejectedValueOnce(
        new billingApi.BillingApiError(
          400,
          'Payment can only be recorded on UNPAID or PARTIALLY_PAID invoices'
        )
      );

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '50.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(screen.getByTestId('payment-dialog-error')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/payment can only be recorded on unpaid or partially_paid invoices/i)
      ).toBeInTheDocument();
    });

    it('36. fieldErrors shown where supported', async () => {
      billingApi.recordPayment.mockRejectedValueOnce(
        new billingApi.BillingApiError(400, 'Validation failed', {
          amount: 'Amount must be strictly greater than zero',
          paymentReference: 'Reference contains invalid characters'
        })
      );

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '50.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(screen.getByText('Amount must be strictly greater than zero')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Reference contains invalid characters')
      ).toBeInTheDocument();
    });

    it('37. network/server error shown safely', async () => {
      billingApi.recordPayment.mockRejectedValueOnce(
        new billingApi.BillingApiError(500, 'Database query execution timed out')
      );

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '50.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      await waitFor(() => {
        expect(screen.getByTestId('payment-dialog-error')).toHaveTextContent(
          /database query execution timed out/i
        );
      });
    });

    it('38-39. failed payment does not locally alter invoice and keeps form open for correction', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);
      billingApi.recordPayment.mockRejectedValueOnce(
        new billingApi.BillingApiError(400, 'Payment declined by server')
      );

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '50.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /^record payment$/i }));

      await waitFor(() => {
        expect(screen.getByTestId('payment-dialog-error')).toBeInTheDocument();
      });

      // Dialog is still open and usable
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/payment amount/i)).toHaveValue(50);

      // Close dialog and verify invoice remains unaltered
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      expect(screen.getAllByText('150.00').length).toBeGreaterThan(0);
      const badges = screen.getAllByRole('status');
      expect(badges.some((b) => b.textContent === 'Unpaid')).toBe(true);
    });
  });

  // ==========================================
  // BUSY STATE TESTS (40-41)
  // ==========================================
  describe('BUSY STATE', () => {
    it('40-41. duplicate submission prevented and submit button disabled while pending', async () => {
      let resolvePayment;
      const pendingPromise = new Promise((resolve) => {
        resolvePayment = resolve;
      });
      billingApi.recordPayment.mockReturnValueOnce(pendingPromise);

      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '50.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });

      const submitBtn = screen.getByRole('button', { name: /record payment/i });
      fireEvent.click(submitBtn);

      // Button is disabled and says Recording Payment...
      const pendingBtn = screen.getByRole('button', { name: /recording payment\.\.\./i });
      expect(pendingBtn).toBeDisabled();
      expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);

      // Clicking again does not submit duplicate request
      fireEvent.click(pendingBtn);
      expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);

      resolvePayment({ id: 1 });
      await waitFor(() => {
        expect(billingApi.recordPayment).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ==========================================
  // BOUNDARY TESTS (42-47)
  // ==========================================
  describe('BOUNDARIES', () => {
    it('42. no payment history table introduced', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice #INV-2026-0010');
      });

      expect(screen.queryByLabelText(/payment history/i)).not.toBeInTheDocument();
    });

    it('43. no reversal action introduced in this slice', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(samplePartiallyPaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice #INV-2026-0010');
      });

      expect(screen.queryByRole('button', { name: /reverse/i })).not.toBeInTheDocument();
    });

    it('44. no receipt action introduced in this slice', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(samplePartiallyPaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice #INV-2026-0010');
      });

      expect(screen.queryByRole('button', { name: /receipt/i })).not.toBeInTheDocument();
    });

    it('45. no sensitive card fields rendered anywhere in dialog', () => {
      render(
        <PaymentDialog invoice={sampleUnpaidInvoice} onClose={vi.fn()} onSuccess={vi.fn()} />
      );

      expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/cvv/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/cvc/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/expiry/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/expiration/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    });

    it('46-47. no local invoice status mutation or paid/balance mutation occurs without backend response', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);
      billingApi.recordPayment.mockResolvedValueOnce({ id: 10 });
      // When getInvoice refreshes, returns exact backend response
      billingApi.getInvoice.mockResolvedValueOnce({
        ...sampleUnpaidInvoice,
        status: InvoiceStatus.PARTIALLY_PAID,
        paidAmount: 60.00,
        balanceAmount: 90.00
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /record payment/i }));
      fireEvent.change(screen.getByLabelText(/payment amount/i), { target: { value: '60.00' } });
      fireEvent.change(screen.getByLabelText(/payment method/i), {
        target: { value: PaymentMethod.CASH }
      });
      fireEvent.click(screen.getByRole('button', { name: /^record payment$/i }));

      await waitFor(() => {
        expect(screen.getByText('60.00')).toBeInTheDocument();
      });

      expect(screen.getByText('90.00')).toBeInTheDocument();
      const badges = screen.getAllByRole('status');
      expect(badges.some((b) => b.textContent === 'Partially Paid')).toBe(true);
    });
  });
});
