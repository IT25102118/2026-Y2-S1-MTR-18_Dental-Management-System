import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LowStockAlertsTable from '../components/LowStockAlertsTable';
import * as alertApi from '../api/alertApi';

vi.mock('../api/alertApi', () => ({
  getLowStockAlerts: vi.fn()
}));

describe('LowStockAlertsTable', () => {
  const sampleAlerts = [
    {
      itemId: 101,
      itemCode: 'ITM-01',
      name: 'Dental Mirror #4',
      category: 'Diagnostic',
      unit: 'piece',
      currentQuantity: 3,
      reorderLevel: 10,
      deficit: 7,
      outOfStock: false,
      defaultSupplierReference: 'SUPP-MIRROR'
    },
    {
      itemId: 102,
      itemCode: 'ITM-02',
      name: 'Gauze Swabs 5x5',
      category: 'Consumable',
      unit: 'pack',
      currentQuantity: 0,
      reorderLevel: 5,
      deficit: 5,
      outOfStock: true,
      defaultSupplierReference: 'SUPP-GAUZE'
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    alertApi.getLowStockAlerts.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <LowStockAlertsTable />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading low-stock alerts/i);
  });

  it('renders low stock alerts table with deficit and status badges upon success', async () => {
    alertApi.getLowStockAlerts.mockResolvedValueOnce({
      content: sampleAlerts,
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
        <LowStockAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /low-stock inventory alerts/i })).toBeInTheDocument();
    });

    // Check item names and links
    expect(screen.getByText('Dental Mirror #4')).toBeInTheDocument();
    expect(screen.getByText('Gauze Swabs 5x5')).toBeInTheDocument();

    // Check stock quantities and reorder levels
    expect(screen.getByText('3 piece')).toBeInTheDocument();
    expect(screen.getByText('10 piece')).toBeInTheDocument();
    expect(screen.getByText('+7 needed')).toBeInTheDocument();

    // Check status badges
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();

    // Check supplier references
    expect(screen.getByText('SUPP-MIRROR')).toBeInTheDocument();
  });

  it('submits category filter when user enters category and clicks Filter', async () => {
    alertApi.getLowStockAlerts.mockResolvedValue({
      content: [sampleAlerts[0]],
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
        <LowStockAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const categoryInput = screen.getByLabelText(/filter by category/i);
    fireEvent.change(categoryInput, { target: { value: 'Diagnostic' } });

    const filterBtn = screen.getByRole('button', { name: /^filter$/i });
    fireEvent.click(filterBtn);

    await waitFor(() => {
      expect(alertApi.getLowStockAlerts).toHaveBeenCalledWith(expect.objectContaining({
        category: 'Diagnostic',
        page: 0
      }));
    });
  });

  it('renders empty state when no items trigger low stock alert', async () => {
    alertApi.getLowStockAlerts.mockResolvedValueOnce({
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
        <LowStockAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/all active catalog items currently meet or exceed their reorder thresholds/i)
      ).toBeInTheDocument();
    });
  });

  it('renders error state and handles retry action', async () => {
    alertApi.getLowStockAlerts.mockRejectedValueOnce(new Error('Failed to load alert records'));

    render(
      <MemoryRouter>
        <LowStockAlertsTable />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to load alert records/i)).toBeInTheDocument();
    });

    alertApi.getLowStockAlerts.mockResolvedValueOnce({
      content: sampleAlerts,
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
});
