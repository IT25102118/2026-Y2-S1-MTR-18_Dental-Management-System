import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvoiceListPage from '../pages/InvoiceListPage';
import * as billingApi from '../api/billingApi';
import { InvoiceStatus } from '../types';
import App from '../../../App';
import * as authApi from '../../auth/api/authApi';

vi.mock('../api/billingApi', async () => {
  const actual = await vi.importActual('../api/billingApi');
  return {
    ...actual,
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

describe('InvoiceListPage (UI-BIL-01)', () => {
  const sampleInvoices = [
    {
      id: 1,
      invoiceNumber: 'INV-2026-0001',
      patientId: 101,
      invoiceDate: '2026-09-15',
      totalAmount: 150.00,
      paidAmount: 50.00,
      balanceAmount: 100.00,
      status: InvoiceStatus.PARTIALLY_PAID
    },
    {
      id: 2,
      invoiceNumber: 'INV-2026-0002',
      patientId: 102,
      invoiceDate: '2026-09-14',
      totalAmount: 200.00,
      paidAmount: 0.00,
      balanceAmount: 200.00,
      status: InvoiceStatus.UNPAID
    },
    {
      id: 3,
      invoiceNumber: 'INV-2026-0003',
      patientId: 103,
      invoiceDate: '2026-09-13',
      totalAmount: 75.00,
      paidAmount: 75.00,
      balanceAmount: 0.00,
      status: InvoiceStatus.PAID
    },
    {
      id: 4,
      invoiceNumber: 'INV-2026-0004',
      patientId: 104,
      invoiceDate: '2026-09-12',
      totalAmount: 80.00,
      paidAmount: 0.00,
      balanceAmount: 80.00,
      status: InvoiceStatus.DRAFT
    },
    {
      id: 5,
      invoiceNumber: 'INV-2026-0005',
      patientId: 105,
      invoiceDate: '2026-09-11',
      totalAmount: 90.00,
      paidAmount: 0.00,
      balanceAmount: 90.00,
      status: InvoiceStatus.CANCELLED
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. loads invoices on mount and 2. calls getInvoices with no filters initially', async () => {
    billingApi.getInvoices.mockResolvedValueOnce(sampleInvoices);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    expect(billingApi.getInvoices).toHaveBeenCalledTimes(1);
    expect(billingApi.getInvoices).toHaveBeenCalledWith({});

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });
  });

  it('3-8. renders table with invoice number, patient ID, date, total, paid, and balance', async () => {
    billingApi.getInvoices.mockResolvedValueOnce([sampleInvoices[0]]);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    expect(within(table).getByText('INV-2026-0001')).toBeInTheDocument(); // invoice number
    expect(within(table).getByText('101')).toBeInTheDocument(); // patient ID
    expect(within(table).getByText('2026-09-15')).toBeInTheDocument(); // date
    expect(within(table).getByText('150.00')).toBeInTheDocument(); // total
    expect(within(table).getByText('50.00')).toBeInTheDocument(); // paid
    expect(within(table).getByText('100.00')).toBeInTheDocument(); // balance
  });

  it('9. renders each status text and badge (DRAFT, UNPAID, PARTIALLY_PAID, PAID, CANCELLED)', async () => {
    billingApi.getInvoices.mockResolvedValueOnce(sampleInvoices);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const badges = within(table).getAllByRole('status');
    const badgeTexts = badges.map((b) => b.textContent.trim());

    expect(badgeTexts).toContain('Partially Paid');
    expect(badgeTexts).toContain('Unpaid');
    expect(badgeTexts).toContain('Paid');
    expect(badgeTexts).toContain('Draft');
    expect(badgeTexts).toContain('Cancelled');
  });

  it('10. empty result shows empty state and keeps filters available', async () => {
    billingApi.getInvoices.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/no invoices found/i)).toBeInTheDocument();
    expect(screen.getByRole('search')).toBeInTheDocument(); // filters still available
  });

  it('11. loading state displays while fetch is pending', () => {
    billingApi.getInvoices.mockReturnValue(new Promise(() => {})); // pending forever

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading invoices/i);
  });

  it('12. API failure shows error state with retry button', async () => {
    billingApi.getInvoices.mockRejectedValueOnce(
      new billingApi.BillingApiError(500, 'Server connection failure')
    );

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('invoice-list-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/server connection failure/i)).toBeInTheDocument();

    // Clicking retry calls getInvoices again
    billingApi.getInvoices.mockResolvedValueOnce([sampleInvoices[0]]);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });
    expect(billingApi.getInvoices).toHaveBeenCalledTimes(2);
  });

  it('13. patientId filter passed correctly', async () => {
    billingApi.getInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(billingApi.getInvoices).toHaveBeenLastCalledWith({ patientId: 101 });
  });

  it('14. status filter passed correctly', async () => {
    billingApi.getInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/status/i), { target: { value: 'UNPAID' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(billingApi.getInvoices).toHaveBeenLastCalledWith({ status: 'UNPAID' });
  });

  it('15. start and end date filters passed correctly', async () => {
    billingApi.getInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-09-01' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(billingApi.getInvoices).toHaveBeenLastCalledWith({
      startDate: '2026-09-01',
      endDate: '2026-09-30'
    });
  });

  it('16. blank filters omitted from request', async () => {
    billingApi.getInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    expect(billingApi.getInvoices).toHaveBeenLastCalledWith({});
  });

  it('17. reset button clears inputs and reloads unfiltered list', async () => {
    billingApi.getInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '101' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));
    expect(billingApi.getInvoices).toHaveBeenLastCalledWith({ patientId: 101 });

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByLabelText(/patient id/i)).toHaveValue(null);
    expect(billingApi.getInvoices).toHaveBeenLastCalledWith({});
  });

  it('18. invalid startDate > endDate blocked client-side with validation error', async () => {
    billingApi.getInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });

    const initialCallCount = billingApi.getInvoices.mock.calls.length;

    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-09-30' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    // Local validation feedback rendered
    expect(screen.getByTestId('filter-date-error')).toHaveTextContent(/start date cannot be after end date/i);

    // API was NOT called with invalid date range
    expect(billingApi.getInvoices.mock.calls.length).toBe(initialCallCount);
  });

  it('19a. non-draft row renders View link but no edit, issue, cancel, pay, or receipt actions', async () => {
    billingApi.getInvoices.mockResolvedValueOnce([sampleInvoices[0]]);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const viewLink = within(table).getByRole('link', { name: /view/i });
    expect(viewLink).toBeInTheDocument();
    expect(viewLink).toHaveAttribute('href', '/billing/invoices/1');

    expect(within(table).queryByRole('link', { name: /edit/i })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /issue/i })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /pay/i })).not.toBeInTheDocument();
    expect(within(table).queryByRole('button', { name: /receipt/i })).not.toBeInTheDocument();
  });

  it('19b. draft row renders View link and Edit link pointing to form', async () => {
    billingApi.getInvoices.mockResolvedValueOnce([sampleInvoices[3]]); // ID 4 is DRAFT

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('INV-2026-0004')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const viewLink = within(table).getByRole('link', { name: /view/i });
    expect(viewLink).toBeInTheDocument();
    expect(viewLink).toHaveAttribute('href', '/billing/invoices/4');

    const editLink = within(table).getByRole('link', { name: /edit/i });
    expect(editLink).toBeInTheDocument();
    expect(editLink).toHaveAttribute('href', '/billing/invoices/4/edit');
  });

  it('19c. header renders Create Invoice link pointing to new invoice form', async () => {
    billingApi.getInvoices.mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <InvoiceListPage />
      </MemoryRouter>
    );

    const createLink = screen.getByRole('link', { name: /\+ create invoice/i });
    expect(createLink).toBeInTheDocument();
    expect(createLink).toHaveAttribute('href', '/billing/invoices/new');
  });

  it('20a. role-aware navigation: ADMINISTRATOR sees Invoices & Billing link on home page', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: 'admin@dentcare.com',
      role: 'ADMINISTRATOR',
      firstName: 'Admin',
      lastName: 'User'
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Invoices & Billing/i)).toBeInTheDocument();
    });
  });

  it('20b. role-aware navigation: RECEPTIONIST sees Invoices & Billing link on home page', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 2,
      email: 'reception@dentcare.com',
      role: 'RECEPTIONIST',
      firstName: 'Reception',
      lastName: 'User'
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Invoices & Billing/i)).toBeInTheDocument();
    });
  });

  it('20c. role-aware navigation: PATIENT does NOT see Invoices & Billing link', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 5,
      email: 'patient@dentcare.com',
      role: 'PATIENT',
      firstName: 'Patient',
      lastName: 'User'
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/My Account/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Invoices & Billing/i)).not.toBeInTheDocument();
  });
});
