import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PatientInvoicesPage from '../pages/PatientInvoicesPage';
import AppHeader from '../../../components/AppHeader';
import * as AuthContextModule from '../context/AuthContext';
import * as patientPortalApi from '../../patient/api/patientPortalApi';

vi.mock('../../patient/api/patientPortalApi', () => ({
  getPatientInvoices: vi.fn(),
  getPatientInvoiceById: vi.fn(),
  getPatientReceipt: vi.fn()
}));

describe('PatientInvoicesPage', () => {
  const mockUser = {
    id: 101,
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    role: 'PATIENT'
  };

  const mockStaffUser = {
    id: 201,
    firstName: 'Sarah',
    lastName: 'Reception',
    email: 'sarah@dentcare.test',
    role: 'RECEPTIONIST'
  };

  const sampleInvoices = [
    {
      id: 1,
      invoiceNumber: 'INV-2026-0001',
      invoiceDate: '2026-09-20',
      totalAmount: 150.00,
      paidAmount: 50.00,
      balanceAmount: 100.00,
      status: 'PARTIALLY_PAID'
    },
    {
      id: 2,
      invoiceNumber: 'INV-2026-0002',
      invoiceDate: '2026-08-15',
      totalAmount: 80.00,
      paidAmount: 80.00,
      balanceAmount: 0.00,
      status: 'PAID'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: vi.fn()
    });
  });

  it('1. displays loading state initially while fetching invoices', () => {
    patientPortalApi.getPatientInvoices.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <PatientInvoicesPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('invoices-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading your invoices\.\.\./i)).toBeInTheDocument();
  });

  it('2. displays empty state when patient has no invoices on file', async () => {
    patientPortalApi.getPatientInvoices.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <PatientInvoicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('invoices-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/you do not have any invoices available in the patient portal yet\./i)).toBeInTheDocument();
  });

  it('3. renders list of owned invoices with correct numbers, statuses, and monetary values', async () => {
    patientPortalApi.getPatientInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <PatientInvoicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('invoice-row-1')).toBeInTheDocument();
      expect(screen.getByTestId('invoice-row-2')).toBeInTheDocument();
    });

    expect(screen.getByText('INV-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-0002')).toBeInTheDocument();
    expect(screen.getByTestId('invoice-row-1')).toHaveTextContent('$150.00');
    expect(screen.getByTestId('invoice-row-1')).toHaveTextContent('$50.00');
    expect(screen.getByTestId('invoice-row-1')).toHaveTextContent('$100.00');
    expect(screen.getByTestId('invoice-row-2')).toHaveTextContent('$80.00');
  });

  it('4. computes aggregate totals strictly from real returned invoice data', async () => {
    patientPortalApi.getPatientInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <PatientInvoicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('metric-invoice-count')).toHaveTextContent('2');
    });

    // Outstanding = 100.00 + 0.00 = 100.00
    expect(screen.getByTestId('metric-balance-due')).toHaveTextContent('$100.00');
    // Total Paid = 50.00 + 80.00 = 130.00
    expect(screen.getByTestId('metric-total-paid')).toHaveTextContent('$130.00');
  });

  it('5. filters invoices by search query and status dropdown', async () => {
    patientPortalApi.getPatientInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <PatientInvoicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('invoice-row-1')).toBeInTheDocument();
    });

    // Filter by search query
    const searchInput = screen.getByLabelText(/search invoices/i);
    fireEvent.change(searchInput, { target: { value: '0002' } });

    expect(screen.queryByTestId('invoice-row-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('invoice-row-2')).toBeInTheDocument();

    // Clear search and filter by status
    fireEvent.change(searchInput, { target: { value: '' } });
    const statusSelect = screen.getByLabelText(/filter invoices by status/i);
    fireEvent.change(statusSelect, { target: { value: 'PARTIALLY_PAID' } });

    expect(screen.getByTestId('invoice-row-1')).toBeInTheDocument();
    expect(screen.queryByTestId('invoice-row-2')).not.toBeInTheDocument();
  });

  it('6. navigates to invoice detail page when View Details is clicked', async () => {
    patientPortalApi.getPatientInvoices.mockResolvedValue(sampleInvoices);

    render(
      <MemoryRouter>
        <PatientInvoicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('view-invoice-1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('view-invoice-1')).toHaveAttribute('href', '/patient/invoices/1');
  });

  it('7. displays error alert and allows retry when API fails', async () => {
    patientPortalApi.getPatientInvoices.mockRejectedValueOnce(new Error('Network error loading invoices'));

    render(
      <MemoryRouter>
        <PatientInvoicesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('invoices-error')).toBeInTheDocument();
    });

    expect(screen.getByText(/network error loading invoices/i)).toBeInTheDocument();

    // Retry succeeds
    patientPortalApi.getPatientInvoices.mockResolvedValueOnce(sampleInvoices);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByTestId('invoice-row-1')).toBeInTheDocument();
    });
  });

  it('8. renders My Invoices in AppHeader for PATIENT, and NOT for staff', () => {
    // Patient header test
    const { unmount } = render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /my invoices/i })).toHaveAttribute('href', '/patient/invoices');

    unmount();

    // Staff header test
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockStaffUser,
      isAuthenticated: true,
      logout: vi.fn()
    });

    render(
      <MemoryRouter>
        <AppHeader />
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: /^my invoices$/i })).not.toBeInTheDocument();
  });
});
