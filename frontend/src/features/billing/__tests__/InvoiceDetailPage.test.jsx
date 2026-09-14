import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import InvoiceDetailPage from '../pages/InvoiceDetailPage';
import InvoiceListPage from '../pages/InvoiceListPage';
import * as billingApi from '../api/billingApi';
import { InvoiceStatus } from '../types';
import App from '../../../App';
import * as authApi from '../../auth/api/authApi';

vi.mock('../api/billingApi', async () => {
  const actual = await vi.importActual('../api/billingApi');
  return {
    ...actual,
    getInvoice: vi.fn(),
    issueInvoice: vi.fn(),
    cancelInvoice: vi.fn(),
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

describe('InvoiceDetailPage (UI-BIL-03)', () => {
  const sampleDraftInvoice = {
    id: 10,
    invoiceNumber: 'INV-2026-0010',
    patientId: 101,
    invoiceDate: '2026-09-15',
    treatmentPlanId: 4,
    status: InvoiceStatus.DRAFT,
    subtotal: 120.00,
    discountAmount: 10.00,
    totalAmount: 110.00,
    paidAmount: 0.00,
    balanceAmount: 110.00,
    notes: 'Initial checkup and prophylaxis draft',
    issuedAt: null,
    createdAt: '2026-09-15T09:00:00',
    items: [
      {
        id: 1,
        description: 'Comprehensive Exam',
        quantity: 1,
        unitPrice: 50.00,
        lineTotal: 50.00,
        treatmentProcedureId: 101
      },
      {
        id: 2,
        description: 'Prophylaxis Cleaning',
        quantity: 2,
        unitPrice: 35.00,
        lineTotal: 70.00,
        treatmentProcedureId: null
      }
    ]
  };

  const sampleUnpaidInvoice = {
    ...sampleDraftInvoice,
    status: InvoiceStatus.UNPAID,
    issuedAt: '2026-09-15T10:00:00'
  };

  const samplePartiallyPaidInvoice = {
    ...sampleDraftInvoice,
    status: InvoiceStatus.PARTIALLY_PAID,
    paidAmount: 50.00,
    balanceAmount: 60.00,
    issuedAt: '2026-09-15T10:00:00'
  };

  const samplePaidInvoice = {
    ...sampleDraftInvoice,
    status: InvoiceStatus.PAID,
    paidAmount: 110.00,
    balanceAmount: 0.00,
    issuedAt: '2026-09-15T10:00:00'
  };

  const sampleCancelledInvoice = {
    ...sampleDraftInvoice,
    status: InvoiceStatus.CANCELLED,
    issuedAt: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================
  // LOAD & DISPLAY TESTS (1-15)
  // ==========================================
  describe('LOAD / DISPLAY', () => {
    it('1. route loads invoice by ID', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(billingApi.getInvoice).toHaveBeenCalledWith('10');
      });
    });

    it('2. loading state renders while fetching', async () => {
      billingApi.getInvoice.mockReturnValueOnce(new Promise(() => {})); // pending

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('invoice-detail-loading')).toHaveTextContent(/loading invoice details/i);
    });

    it('3. invoice number renders in header', async () => {
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
    });

    it('4. patient ID renders correctly', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('101')).toBeInTheDocument();
      });
    });

    it('5. invoice date renders', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('2026-09-15')).toBeInTheDocument();
      });
    });

    it('6. status badge renders with accessible status role', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        const badges = screen.getAllByRole('status');
        expect(badges.some((b) => b.textContent === 'Draft')).toBe(true);
      });
    });

    it('7. subtotal renders authoritative server value', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('120.00')).toBeInTheDocument();
      });
    });

    it('8. discount renders authoritative server value', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('10.00')).toBeInTheDocument();
      });
    });

    it('9. total renders authoritative server value', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('110.00')).toBeInTheDocument();
      });
    });

    it('10. paid amount renders authoritative server value', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(samplePartiallyPaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('50.00')).toBeInTheDocument();
      });
    });

    it('11. balance renders authoritative server value', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(samplePartiallyPaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('60.00')).toBeInTheDocument();
      });
    });

    it('12. notes render when present', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Initial checkup and prophylaxis draft')).toBeInTheDocument();
      });
    });

    it('13. item rows render with description, qty, unit price, line total, and procedure id', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Comprehensive Exam')).toBeInTheDocument();
      });

      expect(screen.getByText('Prophylaxis Cleaning')).toBeInTheDocument();
      expect(screen.getByText('50.00')).toBeInTheDocument();
      expect(screen.getByText('70.00')).toBeInTheDocument();
      expect(screen.getByText('101')).toBeInTheDocument();
    });

    it('14. zero-item draft renders empty-item state', async () => {
      const emptyDraft = {
        ...sampleDraftInvoice,
        items: []
      };
      billingApi.getInvoice.mockResolvedValueOnce(emptyDraft);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('no-items-message')).toHaveTextContent(/no invoice items/i);
      });
    });

    it('15. optional context IDs handle null safely', async () => {
      const minimalDraft = {
        ...sampleDraftInvoice,
        treatmentPlanId: null,
        notes: null,
        issuedAt: null
      };
      billingApi.getInvoice.mockResolvedValueOnce(minimalDraft);

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

      expect(screen.queryByLabelText(/invoice notes/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // ERROR HANDLING TESTS (16-17)
  // ==========================================
  describe('ERRORS', () => {
    it('16. 404 renders not-found state with link to invoice list', async () => {
      billingApi.getInvoice.mockRejectedValueOnce(
        new billingApi.BillingApiError(404, 'Invoice not found')
      );

      render(
        <MemoryRouter initialEntries={['/billing/invoices/999']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('invoice-not-found')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 2, name: /invoice not found/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to invoices/i })).toHaveAttribute('href', '/billing/invoices');
    });

    it('17. API/server error renders safe error state with link back', async () => {
      billingApi.getInvoice.mockRejectedValueOnce(
        new billingApi.BillingApiError(500, 'Database query failed')
      );

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('invoice-load-error')).toBeInTheDocument();
      });

      expect(screen.getByText(/database query failed/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to invoices/i })).toHaveAttribute('href', '/billing/invoices');
    });
  });

  // ==========================================
  // EDIT ACTION TESTS (18-19)
  // ==========================================
  describe('EDIT ACTION', () => {
    it('18. DRAFT shows Edit action pointing to edit route', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /edit draft/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('link', { name: /edit draft/i })).toHaveAttribute(
        'href',
        '/billing/invoices/10/edit'
      );
    });

    it('19. non-DRAFT hides Edit action', async () => {
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

      expect(screen.queryByRole('link', { name: /edit draft/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // ISSUE ACTION TESTS (20-26)
  // ==========================================
  describe('ISSUE ACTION', () => {
    it('20. DRAFT shows Issue action', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /issue invoice/i })).toBeInTheDocument();
      });
    });

    it('21. non-DRAFT hides Issue action', async () => {
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

      expect(screen.queryByRole('button', { name: /issue invoice/i })).not.toBeInTheDocument();
    });

    it('22. cancelled confirmation does not call API', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /issue invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /issue invoice/i }));

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(billingApi.issueInvoice).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('23. confirmed issue calls issueInvoice(id)', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);
      billingApi.issueInvoice.mockResolvedValueOnce({
        ...sampleDraftInvoice,
        status: InvoiceStatus.UNPAID
      });
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /issue invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /issue invoice/i }));

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(billingApi.issueInvoice).toHaveBeenCalledWith(10);

      confirmSpy.mockRestore();
    });

    it('24. successful issue updates page from returned response', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);
      billingApi.issueInvoice.mockResolvedValueOnce({
        ...sampleDraftInvoice,
        status: InvoiceStatus.UNPAID,
        issuedAt: '2026-09-15T11:00:00'
      });
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /issue invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /issue invoice/i }));

      await waitFor(() => {
        expect(screen.getByTestId('invoice-action-success')).toHaveTextContent(/invoice issued successfully/i);
      });

      // Status should now be Unpaid
      const badges = screen.getAllByRole('status');
      expect(badges.some((b) => b.textContent === 'Unpaid')).toBe(true);

      // Issue button and Edit link should now be hidden
      expect(screen.queryByRole('button', { name: /issue invoice/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /edit draft/i })).not.toBeInTheDocument();

      confirmSpy.mockRestore();
    });

    it('25. issue validation error is shown safely', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);
      billingApi.issueInvoice.mockRejectedValueOnce(
        new billingApi.BillingApiError(
          400,
          'Invoice must contain at least one line item before it can be issued (BR-09)'
        )
      );
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /issue invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /issue invoice/i }));

      await waitFor(() => {
        expect(screen.getByTestId('invoice-action-error')).toHaveTextContent(
          /invoice must contain at least one line item before it can be issued/i
        );
      });

      // Status remains DRAFT
      const badges = screen.getAllByRole('status');
      expect(badges.some((b) => b.textContent === 'Draft')).toBe(true);

      confirmSpy.mockRestore();
    });

    it('26. duplicate issue submission is prevented while in flight', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);
      let resolveIssue;
      const pendingPromise = new Promise((resolve) => {
        resolveIssue = resolve;
      });
      billingApi.issueInvoice.mockReturnValueOnce(pendingPromise);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /issue invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /issue invoice/i }));

      // Button is disabled and text is Issuing...
      const issuingBtn = screen.getByRole('button', { name: /issuing\.\.\./i });
      expect(issuingBtn).toBeDisabled();

      resolveIssue({
        ...sampleDraftInvoice,
        status: InvoiceStatus.UNPAID
      });

      await waitFor(() => {
        expect(screen.getByTestId('invoice-action-success')).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });
  });

  // ==========================================
  // CANCEL ACTION TESTS (27-33)
  // ==========================================
  describe('CANCEL ACTION', () => {
    it('27a. cancel action is visible for DRAFT, UNPAID, and PARTIALLY_PAID', async () => {
      // DRAFT
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);
      const { unmount } = render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel invoice/i })).toBeInTheDocument();
      });
      unmount();

      // UNPAID
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);
      const { unmount: unmount2 } = render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel invoice/i })).toBeInTheDocument();
      });
      unmount2();

      // PARTIALLY_PAID
      billingApi.getInvoice.mockResolvedValueOnce(samplePartiallyPaidInvoice);
      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel invoice/i })).toBeInTheDocument();
      });
    });

    it('27b. cancel action is hidden for PAID and CANCELLED (read-only)', async () => {
      // PAID
      billingApi.getInvoice.mockResolvedValueOnce(samplePaidInvoice);
      const { unmount } = render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice #INV-2026-0010');
      });
      expect(screen.queryByRole('button', { name: /cancel invoice/i })).not.toBeInTheDocument();
      unmount();

      // CANCELLED
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
      expect(screen.queryByRole('button', { name: /cancel invoice/i })).not.toBeInTheDocument();
    });

    it('28. cancel confirmation is required', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel invoice/i }));

      expect(confirmSpy).toHaveBeenCalledTimes(1);
      confirmSpy.mockRestore();
    });

    it('29. cancelled confirmation does not call API', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel invoice/i }));

      expect(billingApi.cancelInvoice).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });

    it('30. confirmed cancel calls cancelInvoice(id)', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);
      billingApi.cancelInvoice.mockResolvedValueOnce(sampleCancelledInvoice);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel invoice/i }));

      expect(billingApi.cancelInvoice).toHaveBeenCalledWith(10);
      confirmSpy.mockRestore();
    });

    it('31. successful cancellation updates page from returned response', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);
      billingApi.cancelInvoice.mockResolvedValueOnce(sampleCancelledInvoice);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel invoice/i }));

      await waitFor(() => {
        expect(screen.getByTestId('invoice-action-success')).toHaveTextContent(/invoice cancelled successfully/i);
      });

      // Status should now be Cancelled
      const badges = screen.getAllByRole('status');
      expect(badges.some((b) => b.textContent === 'Cancelled')).toBe(true);

      // Cancel button should no longer be rendered
      expect(screen.queryByRole('button', { name: /cancel invoice/i })).not.toBeInTheDocument();

      confirmSpy.mockRestore();
    });

    it('32. backend rejection due to active payment/lifecycle is shown safely', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(samplePartiallyPaidInvoice);
      billingApi.cancelInvoice.mockRejectedValueOnce(
        new billingApi.BillingApiError(
          409,
          'Invoice cannot be cancelled while active recorded payments remain; recorded payments must first be reversed'
        )
      );
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel invoice/i }));

      await waitFor(() => {
        expect(screen.getByTestId('invoice-action-error')).toHaveTextContent(
          /invoice cannot be cancelled while active recorded payments remain/i
        );
      });

      confirmSpy.mockRestore();
    });

    it('33. duplicate cancel submission prevented while in flight', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(sampleUnpaidInvoice);
      let resolveCancel;
      const pendingPromise = new Promise((resolve) => {
        resolveCancel = resolve;
      });
      billingApi.cancelInvoice.mockReturnValueOnce(pendingPromise);
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel invoice/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel invoice/i }));

      expect(screen.getByRole('button', { name: /cancelling\.\.\./i })).toBeDisabled();

      resolveCancel(sampleCancelledInvoice);

      await waitFor(() => {
        expect(screen.getByTestId('invoice-action-success')).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });
  });

  // ==========================================
  // BOUNDARY TESTS (34-38)
  // ==========================================
  describe('BOUNDARIES', () => {
    it('34. no delete action exists on detail page', async () => {
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

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('35. no payment action rendered on detail page in this slice', async () => {
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

      expect(screen.queryByRole('button', { name: /pay/i })).not.toBeInTheDocument();
    });

    it('36. no receipt action rendered on detail page in this slice', async () => {
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

      expect(screen.queryByRole('button', { name: /receipt/i })).not.toBeInTheDocument();
    });

    it('37. no reversal action rendered on detail page in this slice', async () => {
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

      expect(screen.queryByRole('button', { name: /reverse/i })).not.toBeInTheDocument();
    });

    it('38. no local financial recalculation is performed on detail page', async () => {
      // In this test, backend intentionally returns custom values to verify frontend displays them directly without recalculating
      const customTotalsInvoice = {
        ...sampleDraftInvoice,
        subtotal: 999.99,
        discountAmount: 111.11,
        totalAmount: 888.88,
        paidAmount: 222.22,
        balanceAmount: 666.66
      };
      billingApi.getInvoice.mockResolvedValueOnce(customTotalsInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <Routes>
            <Route path="/billing/invoices/:id" element={<InvoiceDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('999.99')).toBeInTheDocument();
      });

      expect(screen.getByText('111.11')).toBeInTheDocument();
      expect(screen.getByText('888.88')).toBeInTheDocument();
      expect(screen.getByText('222.22')).toBeInTheDocument();
      expect(screen.getByText('666.66')).toBeInTheDocument();
    });
  });

  // ==========================================
  // LIST INTEGRATION TESTS (39-41)
  // ==========================================
  describe('LIST INTEGRATION', () => {
    it('39. list View link points to real detail route', async () => {
      billingApi.getInvoices.mockResolvedValueOnce([sampleUnpaidInvoice]);

      render(
        <MemoryRouter>
          <InvoiceListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('INV-2026-0010')).toBeInTheDocument();
      });

      const table = screen.getByRole('table');
      const viewLink = within(table).getByRole('link', { name: /view/i });
      expect(viewLink).toHaveAttribute('href', '/billing/invoices/10');
    });

    it('40. DRAFT keeps Edit link', async () => {
      billingApi.getInvoices.mockResolvedValueOnce([sampleDraftInvoice]);

      render(
        <MemoryRouter>
          <InvoiceListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('INV-2026-0010')).toBeInTheDocument();
      });

      const table = screen.getByRole('table');
      const editLink = within(table).getByRole('link', { name: /edit/i });
      expect(editLink).toHaveAttribute('href', '/billing/invoices/10/edit');
    });

    it('41. non-DRAFT remains non-editable in list', async () => {
      billingApi.getInvoices.mockResolvedValueOnce([sampleUnpaidInvoice]);

      render(
        <MemoryRouter>
          <InvoiceListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('INV-2026-0010')).toBeInTheDocument();
      });

      const table = screen.getByRole('table');
      expect(within(table).queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // ROLE ROUTING TESTS (42-46)
  // ==========================================
  describe('ROLE ROUTING (App.jsx)', () => {
    it('42. ADMINISTRATOR allowed on /billing/invoices/:id', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        email: 'admin@dentcare.com',
        role: 'ADMINISTRATOR'
      });
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice #INV-2026-0010');
      });
    });

    it('43. RECEPTIONIST allowed on /billing/invoices/:id', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 2,
        email: 'reception@dentcare.com',
        role: 'RECEPTIONIST'
      });
      billingApi.getInvoice.mockResolvedValueOnce(sampleDraftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Invoice #INV-2026-0010');
      });
    });

    it('44. PATIENT denied on /billing/invoices/:id', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 5,
        email: 'patient@dentcare.com',
        role: 'PATIENT'
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('heading', { level: 1, name: /invoice #/i })).not.toBeInTheDocument();
      });
    });

    it('45. DENTIST denied on /billing/invoices/:id', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 3,
        email: 'dentist@dentcare.com',
        role: 'DENTIST'
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('heading', { level: 1, name: /invoice #/i })).not.toBeInTheDocument();
      });
    });

    it('46. DENTAL_ASSISTANT denied on /billing/invoices/:id', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 4,
        email: 'assistant@dentcare.com',
        role: 'DENTAL_ASSISTANT'
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/10']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('heading', { level: 1, name: /invoice #/i })).not.toBeInTheDocument();
      });
    });
  });
});
