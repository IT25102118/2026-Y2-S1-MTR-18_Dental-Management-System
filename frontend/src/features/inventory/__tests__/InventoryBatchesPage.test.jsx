import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryBatchesPage from '../pages/InventoryBatchesPage';
import * as movementApi from '../api/movementApi';

vi.mock('../api/movementApi', () => ({
  searchBatches: vi.fn()
}));

describe('InventoryBatchesPage', () => {
  const sampleBatches = [
    {
      id: 101,
      inventoryItemId: 1,
      itemCode: 'ITM-001',
      itemName: 'Dental Mirror #4',
      batchNumber: 'LOT-DM-01',
      expiryDate: '2028-01-01',
      quantityOnHand: 40,
      receivedDate: '2026-08-10',
      supplierReference: 'SUPP-MIRROR'
    },
    {
      id: 102,
      inventoryItemId: 2,
      itemCode: 'ITM-002',
      itemName: 'Cotton Rolls',
      batchNumber: null,
      expiryDate: null,
      quantityOnHand: 100,
      receivedDate: '2026-07-20',
      supplierReference: 'SUPP-COTTON'
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    movementApi.searchBatches.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <InventoryBatchesPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading inventory batches/i);
  });

  it('renders batches table with item links and unbatched badges', async () => {
    movementApi.searchBatches.mockResolvedValueOnce({
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
        <InventoryBatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /inventory batches/i, level: 1 })).toBeInTheDocument();
    });

    expect(screen.getByText('LOT-DM-01')).toBeInTheDocument();
    expect(screen.getByText('Dental Mirror #4 (ITM-001)')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('2028-01-01')).toBeInTheDocument();

    // Verify unbatched stock row
    expect(screen.getByText('Unbatched Stock')).toBeInTheDocument();
    expect(screen.getByText('Cotton Rolls (ITM-002)')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('submits search filters to searchBatches API', async () => {
    movementApi.searchBatches.mockResolvedValue({
      content: [sampleBatches[0]],
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
        <InventoryBatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    const batchInput = screen.getByLabelText(/batch number/i);
    const expiryFromInput = screen.getByLabelText(/expiry from/i);
    const expiryToInput = screen.getByLabelText(/expiry to/i);
    const inStockCheckbox = screen.getByLabelText(/in-stock batches only/i);

    fireEvent.change(batchInput, { target: { value: 'LOT-DM' } });
    fireEvent.change(expiryFromInput, { target: { value: '2028-01-01' } });
    fireEvent.change(expiryToInput, { target: { value: '2028-12-31' } });
    fireEvent.click(inStockCheckbox);

    const applyBtn = screen.getByRole('button', { name: /apply filters/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(movementApi.searchBatches).toHaveBeenCalledWith(expect.objectContaining({
        batchNumber: 'LOT-DM',
        expiryFrom: '2028-01-01',
        expiryTo: '2028-12-31',
        positiveStockOnly: true,
        page: 0
      }));
    });
  });

  it('resets search filters when Reset button is clicked', async () => {
    movementApi.searchBatches.mockResolvedValue({
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
        <InventoryBatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    const batchInput = screen.getByLabelText(/batch number/i);
    fireEvent.change(batchInput, { target: { value: 'TEMP' } });
    fireEvent.click(screen.getByRole('button', { name: /apply filters/i }));

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(movementApi.searchBatches).toHaveBeenCalledWith(expect.objectContaining({
        batchNumber: '',
        expiryFrom: undefined,
        expiryTo: undefined,
        positiveStockOnly: false
      }));
    });
  });

  it('renders error state and allows retry', async () => {
    movementApi.searchBatches.mockRejectedValueOnce(new Error('Batch service unavailable'));

    render(
      <MemoryRouter>
        <InventoryBatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Batch service unavailable/i)).toBeInTheDocument();
    });

    movementApi.searchBatches.mockResolvedValueOnce({
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
      expect(screen.getByText('LOT-DM-01')).toBeInTheDocument();
    });
  });

  it('renders status badges in batches table', async () => {
    movementApi.searchBatches.mockResolvedValueOnce({
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
        <InventoryBatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('batch-status-101')).toHaveTextContent('Valid');
      expect(screen.getByTestId('batch-status-102')).toHaveTextContent('Valid');
    });
  });
});

