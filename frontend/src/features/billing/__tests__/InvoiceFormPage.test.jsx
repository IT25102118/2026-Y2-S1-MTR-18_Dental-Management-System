import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvoiceFormPage from '../pages/InvoiceFormPage';
import * as billingApi from '../api/billingApi';
import { InvoiceStatus } from '../types';
import App from '../../../App';
import * as authApi from '../../auth/api/authApi';

vi.mock('../api/billingApi', async () => {
  const actual = await vi.importActual('../api/billingApi');
  return {
    ...actual,
    createInvoice: vi.fn(),
    updateInvoice: vi.fn(),
    getInvoice: vi.fn()
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

describe('InvoiceFormPage (UI-BIL-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const draftInvoice = {
    id: 42,
    invoiceNumber: 'INV-2026-0042',
    patientId: 105,
    invoiceDate: '2026-09-15',
    treatmentPlanId: 7,
    status: InvoiceStatus.DRAFT,
    subtotal: 120.00,
    discountAmount: 10.00,
    taxAmount: 0.00,
    totalAmount: 110.00,
    paidAmount: 0.00,
    balanceAmount: 110.00,
    notes: 'Draft note for follow-up',
    items: [
      {
        id: 1,
        description: 'Initial Consultation',
        quantity: 1,
        unitPrice: 50.00,
        totalPrice: 50.00,
        treatmentProcedureId: 12
      },
      {
        id: 2,
        description: 'Dental X-Ray',
        quantity: 2,
        unitPrice: 35.00,
        totalPrice: 70.00,
        treatmentProcedureId: null
      }
    ]
  };

  describe('CREATE Mode (/billing/invoices/new)', () => {
    it('1. renders create form with empty fields and default date', () => {
      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { level: 1, name: /create invoice draft/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/patient id/i)).toHaveValue(null);
      expect(screen.getByLabelText(/invoice date/i)).not.toHaveValue('');
      expect(screen.getByLabelText(/treatment plan id/i)).toHaveValue(null);
      expect(screen.getByLabelText(/discount amount/i)).toHaveValue(null);
      expect(screen.getByLabelText(/notes/i)).toHaveValue('');
      expect(screen.getByRole('button', { name: /create draft/i })).toBeInTheDocument();
    });

    it('2. validates patientId is required before submitting', async () => {
      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

      expect(screen.getByText(/patient id is required/i)).toBeInTheDocument();
      expect(billingApi.createInvoice).not.toHaveBeenCalled();
    });

    it('3. validates patientId must be a positive integer', async () => {
      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '-5' } });
      fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

      expect(screen.getByText(/patient id must be a positive integer/i)).toBeInTheDocument();
      expect(billingApi.createInvoice).not.toHaveBeenCalled();
    });

    it('4. validates treatmentPlanId must be positive integer if supplied', async () => {
      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '101' } });
      fireEvent.change(screen.getByLabelText(/treatment plan id/i), { target: { value: '-2' } });
      fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

      expect(screen.getByText(/treatment plan id must be a positive integer/i)).toBeInTheDocument();
      expect(billingApi.createInvoice).not.toHaveBeenCalled();
    });

    it('5. can add and remove line items dynamically', async () => {
      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      expect(screen.getByText(/no line items added yet/i)).toBeInTheDocument();

      // Add first item
      fireEvent.click(screen.getByRole('button', { name: /\+ add line item/i }));
      expect(screen.getByLabelText(/item 1 description/i)).toBeInTheDocument();

      // Add second item
      fireEvent.click(screen.getByRole('button', { name: /\+ add line item/i }));
      expect(screen.getByLabelText(/item 2 description/i)).toBeInTheDocument();

      // Remove item 1
      fireEvent.click(screen.getByLabelText(/remove item 1/i));
      // Now only 1 item remains
      expect(screen.getByLabelText(/item 1 description/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/item 2 description/i)).not.toBeInTheDocument();
    });

    it('6. validates item description, quantity, and unit price client-side', async () => {
      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '101' } });
      fireEvent.click(screen.getByRole('button', { name: /\+ add line item/i }));

      // Leave description blank, set invalid qty and negative price
      fireEvent.change(screen.getByLabelText(/item 1 description/i), { target: { value: '  ' } });
      fireEvent.change(screen.getByLabelText(/item 1 quantity/i), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText(/item 1 unit price/i), { target: { value: '-10' } });

      fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

      expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      expect(screen.getByText(/quantity must be an integer of at least 1/i)).toBeInTheDocument();
      expect(screen.getByText(/unit price must be non-negative/i)).toBeInTheDocument();
      expect(billingApi.createInvoice).not.toHaveBeenCalled();
    });

    it('7. validates discount amount cannot be negative', async () => {
      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '101' } });
      fireEvent.change(screen.getByLabelText(/discount amount/i), { target: { value: '-15' } });
      fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

      expect(screen.getByText(/discount amount must be non-negative/i)).toBeInTheDocument();
      expect(billingApi.createInvoice).not.toHaveBeenCalled();
    });

    it('8. calculates live subtotal and estimated total in preview card', async () => {
      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      // Add item 1: 2 x 50.00 = 100.00
      fireEvent.click(screen.getByRole('button', { name: /\+ add line item/i }));
      fireEvent.change(screen.getByLabelText(/item 1 description/i), { target: { value: 'Cleaning' } });
      fireEvent.change(screen.getByLabelText(/item 1 quantity/i), { target: { value: '2' } });
      fireEvent.change(screen.getByLabelText(/item 1 unit price/i), { target: { value: '50.00' } });

      // Add item 2: 1 x 30.00 = 30.00
      fireEvent.click(screen.getByRole('button', { name: /\+ add line item/i }));
      fireEvent.change(screen.getByLabelText(/item 2 description/i), { target: { value: 'Polishing' } });
      fireEvent.change(screen.getByLabelText(/item 2 quantity/i), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText(/item 2 unit price/i), { target: { value: '30.00' } });

      // Apply discount 20.00
      fireEvent.change(screen.getByLabelText(/discount amount/i), { target: { value: '20.00' } });

      const preview = screen.getByLabelText(/estimated calculation preview/i);
      expect(within(preview).getByText('130.00')).toBeInTheDocument(); // Subtotal
      expect(within(preview).getByText('-20.00')).toBeInTheDocument(); // Discount
      expect(within(preview).getByText('110.00')).toBeInTheDocument(); // Total
    });

    it('9. submits valid form with exact allowed fields for CREATE and navigates on success', async () => {
      billingApi.createInvoice.mockResolvedValueOnce({
        id: 99,
        invoiceNumber: 'INV-2026-0099',
        patientId: 101,
        status: 'DRAFT'
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <Routes>
            <Route path="/billing/invoices/new" element={<InvoiceFormPage />} />
            <Route path="/billing/invoices" element={<div>Invoice List Destination</div>} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '101' } });
      fireEvent.change(screen.getByLabelText(/treatment plan id/i), { target: { value: '5' } });
      fireEvent.change(screen.getByLabelText(/discount amount/i), { target: { value: '10.00' } });
      fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Follow-up in two weeks' } });

      fireEvent.click(screen.getByRole('button', { name: /\+ add line item/i }));
      fireEvent.change(screen.getByLabelText(/item 1 description/i), { target: { value: 'Consultation' } });
      fireEvent.change(screen.getByLabelText(/item 1 quantity/i), { target: { value: '1' } });
      fireEvent.change(screen.getByLabelText(/item 1 unit price/i), { target: { value: '60.00' } });
      fireEvent.change(screen.getByLabelText(/item 1 procedure id/i), { target: { value: '15' } });

      fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

      await waitFor(() => {
        expect(billingApi.createInvoice).toHaveBeenCalledTimes(1);
      });

      expect(billingApi.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 101,
          treatmentPlanId: 5,
          discountAmount: 10,
          notes: 'Follow-up in two weeks',
          items: [
            {
              description: 'Consultation',
              quantity: 1,
              unitPrice: 60,
              treatmentProcedureId: 15
            }
          ]
        })
      );

      // Verify no forbidden properties in payload
      const calledPayload = billingApi.createInvoice.mock.calls[0][0];
      expect(calledPayload).not.toHaveProperty('id');
      expect(calledPayload).not.toHaveProperty('invoiceNumber');
      expect(calledPayload).not.toHaveProperty('status');
      expect(calledPayload).not.toHaveProperty('paidAmount');
      expect(calledPayload).not.toHaveProperty('balanceAmount');
      expect(calledPayload).not.toHaveProperty('userId');
      expect(calledPayload).not.toHaveProperty('actor');

      // Navigation occurred
      await waitFor(() => {
        expect(screen.getByText('Invoice List Destination')).toBeInTheDocument();
      });
    });

    it('10. allows saving draft with empty items list', async () => {
      billingApi.createInvoice.mockResolvedValueOnce({
        id: 100,
        invoiceNumber: 'INV-2026-0100',
        patientId: 102,
        status: 'DRAFT',
        items: []
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '102' } });
      fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

      await waitFor(() => {
        expect(billingApi.createInvoice).toHaveBeenCalledTimes(1);
      });

      expect(billingApi.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 102,
          items: []
        })
      );
    });

    it('11. displays server error and field errors on API failure', async () => {
      billingApi.createInvoice.mockRejectedValueOnce(
        new billingApi.BillingApiError(400, 'Invalid invoice payload', {
          patientId: 'Patient does not exist',
          discountAmount: 'Discount exceeds allowed maximum'
        })
      );

      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '999' } });
      fireEvent.click(screen.getByRole('button', { name: /create draft/i }));

      await waitFor(() => {
        expect(screen.getByTestId('form-submit-error')).toBeInTheDocument();
      });

      expect(screen.getByText('Patient does not exist')).toBeInTheDocument();
      expect(screen.getByText('Discount exceeds allowed maximum')).toBeInTheDocument();
    });

    it('12. disables submit button while submitting to prevent duplicate submits', async () => {
      let resolvePromise;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      billingApi.createInvoice.mockReturnValueOnce(pendingPromise);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '101' } });
      const submitBtn = screen.getByRole('button', { name: /create draft/i });
      fireEvent.click(submitBtn);

      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled();
      expect(billingApi.createInvoice).toHaveBeenCalledTimes(1);

      resolvePromise({ id: 101, status: 'DRAFT' });
      await waitFor(() => {
        expect(billingApi.createInvoice).toHaveBeenCalledTimes(1);
      });
    });

    it('13. cancel link returns to invoice list', () => {
      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <InvoiceFormPage />
        </MemoryRouter>
      );

      const cancelLink = screen.getByRole('link', { name: /cancel/i });
      expect(cancelLink).toHaveAttribute('href', '/billing/invoices');
    });
  });

  describe('EDIT Mode (/billing/invoices/:id/edit)', () => {
    it('14. fetches invoice on mount and shows loading indicator', async () => {
      billingApi.getInvoice.mockReturnValueOnce(new Promise(() => {})); // pending

      render(
        <MemoryRouter initialEntries={['/billing/invoices/42/edit']}>
          <Routes>
            <Route path="/billing/invoices/:id/edit" element={<InvoiceFormPage />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByRole('status')).toHaveTextContent(/loading invoice details/i);
      expect(billingApi.getInvoice).toHaveBeenCalledWith('42');
    });

    it('15. populates form fields with fetched DRAFT invoice data', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(draftInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/42/edit']}>
          <Routes>
            <Route path="/billing/invoices/:id/edit" element={<InvoiceFormPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/edit draft invoice \(INV-2026-0042\)/i);
      });

      // Patient ID is read-only
      const patientInput = screen.getByLabelText(/patient id/i);
      expect(patientInput).toHaveValue('105');
      expect(patientInput).toHaveAttribute('disabled');
      expect(patientInput).toHaveAttribute('readonly');
      expect(screen.getByText(/patient cannot be changed on an existing invoice/i)).toBeInTheDocument();

      // Form values populated
      expect(screen.getByLabelText(/invoice date/i)).toHaveValue('2026-09-15');
      expect(screen.getByLabelText(/treatment plan id/i)).toHaveValue(7);
      expect(screen.getByLabelText(/discount amount/i)).toHaveValue(10);
      expect(screen.getByLabelText(/notes/i)).toHaveValue('Draft note for follow-up');

      // Items populated
      expect(screen.getByLabelText(/item 1 description/i)).toHaveValue('Initial Consultation');
      expect(screen.getByLabelText(/item 1 quantity/i)).toHaveValue(1);
      expect(screen.getByLabelText(/item 1 unit price/i)).toHaveValue(50);
      expect(screen.getByLabelText(/item 1 procedure id/i)).toHaveValue(12);

      expect(screen.getByLabelText(/item 2 description/i)).toHaveValue('Dental X-Ray');
      expect(screen.getByLabelText(/item 2 quantity/i)).toHaveValue(2);
      expect(screen.getByLabelText(/item 2 unit price/i)).toHaveValue(35);
    });

    it('16. submits update with strictly UpdateDraftInvoiceRequest payload (NO patientId) and navigates', async () => {
      billingApi.getInvoice.mockResolvedValueOnce(draftInvoice);
      billingApi.updateInvoice.mockResolvedValueOnce({
        ...draftInvoice,
        notes: 'Updated note'
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/42/edit']}>
          <Routes>
            <Route path="/billing/invoices/:id/edit" element={<InvoiceFormPage />} />
            <Route path="/billing/invoices" element={<div>Invoice List Destination</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/notes/i)).toHaveValue('Draft note for follow-up');
      });

      fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Updated note' } });
      fireEvent.click(screen.getByRole('button', { name: /update draft/i }));

      await waitFor(() => {
        expect(billingApi.updateInvoice).toHaveBeenCalledTimes(1);
      });

      const [calledId, calledPayload] = billingApi.updateInvoice.mock.calls[0];
      expect(calledId).toBe('42');
      expect(calledPayload).not.toHaveProperty('patientId');
      expect(calledPayload).not.toHaveProperty('invoiceNumber');
      expect(calledPayload).not.toHaveProperty('status');
      expect(calledPayload.notes).toBe('Updated note');
      expect(calledPayload.items.length).toBe(2);

      await waitFor(() => {
        expect(screen.getByText('Invoice List Destination')).toBeInTheDocument();
      });
    });

    it('17. blocks editing non-DRAFT invoice (e.g. UNPAID) and shows warning banner', async () => {
      const unpaidInvoice = {
        ...draftInvoice,
        status: InvoiceStatus.UNPAID
      };
      billingApi.getInvoice.mockResolvedValueOnce(unpaidInvoice);

      render(
        <MemoryRouter initialEntries={['/billing/invoices/42/edit']}>
          <Routes>
            <Route path="/billing/invoices/:id/edit" element={<InvoiceFormPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('non-draft-warning')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 2, name: /invoice not editable/i })).toBeInTheDocument();
      expect(screen.getByText(/only draft invoices can be edited/i)).toBeInTheDocument();
      expect(screen.getByText(/INV-2026-0042 is currently in UNPAID status/i)).toBeInTheDocument();

      // No editable form fields should be rendered
      expect(screen.queryByLabelText(/patient id/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /update draft/i })).not.toBeInTheDocument();

      // Link back to invoices is present
      const backLink = screen.getByRole('link', { name: /back to invoices/i });
      expect(backLink).toHaveAttribute('href', '/billing/invoices');
    });

    it('18. handles 404 invoice not found gracefully', async () => {
      billingApi.getInvoice.mockRejectedValueOnce(
        new billingApi.BillingApiError(404, 'Invoice not found')
      );

      render(
        <MemoryRouter initialEntries={['/billing/invoices/999/edit']}>
          <Routes>
            <Route path="/billing/invoices/:id/edit" element={<InvoiceFormPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('invoice-not-found')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { level: 2, name: /invoice not found/i })).toBeInTheDocument();
      const backLink = screen.getByRole('link', { name: /back to invoices/i });
      expect(backLink).toHaveAttribute('href', '/billing/invoices');
    });

    it('19. handles server load error gracefully', async () => {
      billingApi.getInvoice.mockRejectedValueOnce(
        new billingApi.BillingApiError(500, 'Server database connection error')
      );

      render(
        <MemoryRouter initialEntries={['/billing/invoices/42/edit']}>
          <Routes>
            <Route path="/billing/invoices/:id/edit" element={<InvoiceFormPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('invoice-load-error')).toBeInTheDocument();
      });

      expect(screen.getByText(/server database connection error/i)).toBeInTheDocument();
    });
  });

  describe('Route and Role Access Integration (App.jsx)', () => {
    it('20. ADMINISTRATOR can access /billing/invoices/new', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        email: 'admin@dentcare.com',
        role: 'ADMINISTRATOR'
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /create invoice draft/i })).toBeInTheDocument();
      });
    });

    it('21. RECEPTIONIST can access /billing/invoices/new', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 2,
        email: 'reception@dentcare.com',
        role: 'RECEPTIONIST'
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /create invoice draft/i })).toBeInTheDocument();
      });
    });

    it('22. PATIENT is denied access to /billing/invoices/new', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 5,
        email: 'patient@dentcare.com',
        role: 'PATIENT'
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('heading', { level: 1, name: /create invoice draft/i })).not.toBeInTheDocument();
      });
    });

    it('23. DENTIST is denied access to /billing/invoices/new', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 3,
        email: 'dentist@dentcare.com',
        role: 'DENTIST'
      });

      render(
        <MemoryRouter initialEntries={['/billing/invoices/new']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.queryByRole('heading', { level: 1, name: /create invoice draft/i })).not.toBeInTheDocument();
      });
    });
  });
});
