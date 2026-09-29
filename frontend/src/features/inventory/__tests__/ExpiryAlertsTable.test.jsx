import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExpiryAlertsTable from '../components/ExpiryAlertsTable';
import * as alertApi from '../api/alertApi';

vi.mock('../api/alertApi', () => ({
  getExpiryAlerts: vi.fn()
}));

describe('ExpiryAlertsTable', () => {
  const sampleBatches = [
    {
      batchId: 201,
      itemId: 1,
      itemCode: 'ITM-001',
      itemName: 'Dental Mirror',
      category: 'Diagnostic',
      unit: 'piece',
      batchNumber: 'LOT-EXP-01',
      quantityOnHand: 10,
      expiryDate: '2026-08-01',
      status: 'EXPIRED',
      daysRemaining: -35,
      supplierReference: 'SUPP-EXP'
    },
    {
      batchId: 202,
      itemId: 2,
      itemCode: 'ITM-002',
      itemName: 'Anesthetic',
      category: 'Pharmaceutical',
      unit: 'box',
      batchNumber: null,
      quantityOnHand: 4,
      expiryDate: '2026-09-30',
      status: 'EXPIRING',
      daysRemaining: 15,
      supplierReference: 'SUPP-ANES'
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    alertApi.getExpiryAlerts.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <ExpiryAlertsTable />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading expiry alerts/i);
  });

  it('renders expiry alerts table with status, days remaining, and unbatched stock', async () => {
    alertApi.getExpiryAlerts.mockResolvedValueOnce({
      content: sampleBatches,
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 2,
      first: true,
      last: true,
      empty: false
    });

    render(
      <MemoryRouter>
        <ExpiryAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /expiry inventory alerts/i })).toBeInTheDocument();
    });

    // Batched row
    expect(screen.getByText('LOT-EXP-01')).toBeInTheDocument();
    expect(screen.getByText('Dental Mirror')).toBeInTheDocument();
    expect(screen.getByText('10 piece')).toBeInTheDocument();
    expect(screen.getByText('[EXPIRED] Expired')).toBeInTheDocument();
    expect(screen.getByText('Expired 35 days ago')).toBeInTheDocument();

    // Unbatched row
    expect(screen.getByText('Unbatched Stock')).toBeInTheDocument();
    expect(screen.getByText('Anesthetic')).toBeInTheDocument();
    expect(screen.getByText('4 box')).toBeInTheDocument();
    expect(screen.getByText('[EXPIRING] Expiring Soon')).toBeInTheDocument();
    expect(screen.getByText('15 days remaining')).toBeInTheDocument();
  });

  it('validates cutoff date input client-side and prevents submission if past date', async () => {
    alertApi.getExpiryAlerts.mockResolvedValue({
      content: [],
      number: 0,
      size: 20,
      totalPages: 0,
      totalElements: 0,
      first: true,
      last: true,
      empty: true
    });

    render(
      <MemoryRouter>
        <ExpiryAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/expiry cutoff date/i)).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText(/expiry cutoff date/i);
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } });

    const form = screen.getByRole('form', { name: /expiry horizon selector/i });
    fireEvent.submit(form);

    expect(screen.getByText(/cutoff date must be today or later/i)).toBeInTheDocument();
  });

  it('updates horizon and calls getExpiryAlerts with user-selected through date', async () => {
    alertApi.getExpiryAlerts.mockResolvedValue({
      content: sampleBatches,
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 2,
      first: true,
      last: true,
      empty: false
    });

    render(
      <MemoryRouter>
        <ExpiryAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const dateInput = screen.getByLabelText(/expiry cutoff date/i);
    fireEvent.change(dateInput, { target: { value: '2027-01-01' } });

    const form = screen.getByRole('form', { name: /expiry horizon selector/i });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(alertApi.getExpiryAlerts).toHaveBeenCalledWith(expect.objectContaining({
        through: '2027-01-01',
        page: 0
      }));
    });
  });

  it('renders empty state when no batches are expiring on or before cutoff date', async () => {
    alertApi.getExpiryAlerts.mockResolvedValueOnce({
      content: [],
      number: 0,
      size: 20,
      totalPages: 0,
      totalElements: 0,
      first: true,
      last: true,
      empty: true
    });

    render(
      <MemoryRouter>
        <ExpiryAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/no active batches are expired or expiring on or before/i)
      ).toBeInTheDocument();
    });
  });

  it('renders error state and handles retry action', async () => {
    alertApi.getExpiryAlerts.mockRejectedValueOnce(new Error('Expiry service error'));

    render(
      <MemoryRouter>
        <ExpiryAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Expiry service error/i)).toBeInTheDocument();
    });

    alertApi.getExpiryAlerts.mockResolvedValueOnce({
      content: sampleBatches,
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 2,
      first: true,
      last: true,
      empty: false
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  it('updates horizon when quick preset buttons are clicked', async () => {
    alertApi.getExpiryAlerts.mockResolvedValue({
      content: sampleBatches,
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 2,
      first: true,
      last: true,
      empty: false
    });

    render(
      <MemoryRouter>
        <ExpiryAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const preset7Btn = screen.getByRole('button', { name: /7 days/i });
    fireEvent.click(preset7Btn);

    await waitFor(() => {
      expect(alertApi.getExpiryAlerts).toHaveBeenCalled();
    });

    const preset90Btn = screen.getByRole('button', { name: /90 days/i });
    fireEvent.click(preset90Btn);

    await waitFor(() => {
      expect(alertApi.getExpiryAlerts).toHaveBeenCalled();
    });
  });

  it('renders expiring today badge and text when daysRemaining is 0', async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayBatch = {
      batchId: 205,
      itemId: 5,
      itemCode: 'ITM-005',
      itemName: 'Surgical Gloves M',
      category: 'PPE',
      unit: 'box',
      batchNumber: 'LOT-TODAY-01',
      quantityOnHand: 8,
      expiryDate: todayStr,
      status: 'EXPIRING',
      daysRemaining: 0,
      supplierReference: 'SUPP-GLOVE'
    };

    alertApi.getExpiryAlerts.mockResolvedValueOnce({
      content: [todayBatch],
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 1,
      first: true,
      last: true,
      empty: false
    });

    render(
      <MemoryRouter>
        <ExpiryAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    expect(screen.getByText('[EXPIRING] Expiring Today')).toBeInTheDocument();
    expect(screen.getByText('Expiring today')).toBeInTheDocument();
    expect(screen.getByText('LOT-TODAY-01')).toBeInTheDocument();
  });

  it('renders View Item action links in table rows', async () => {
    alertApi.getExpiryAlerts.mockResolvedValueOnce({
      content: sampleBatches,
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 2,
      first: true,
      last: true,
      empty: false
    });

    render(
      <MemoryRouter>
        <ExpiryAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const viewLinks = screen.getAllByRole('link', { name: /view details for/i });
    expect(viewLinks).toHaveLength(2);
    expect(viewLinks[0]).toHaveAttribute('href', '/inventory/items/1');
    expect(viewLinks[1]).toHaveAttribute('href', '/inventory/items/2');
  });
});
