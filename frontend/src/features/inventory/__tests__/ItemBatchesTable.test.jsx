import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ItemBatchesTable from '../components/ItemBatchesTable';
import * as movementApi from '../api/movementApi';

vi.mock('../api/movementApi', () => ({
  getItemBatches: vi.fn()
}));

describe('ItemBatchesTable', () => {
  const sampleBatches = [
    {
      id: 1,
      inventoryItemId: 7,
      itemCode: 'ITM-007',
      itemName: 'Composite Resin A2',
      batchNumber: 'LOT-2026-X',
      expiryDate: '2027-10-31',
      quantityOnHand: 15,
      receivedDate: '2026-08-01',
      supplierReference: 'SUPP-DENTSPLY'
    },
    {
      id: 2,
      inventoryItemId: 7,
      itemCode: 'ITM-007',
      itemName: 'Composite Resin A2',
      batchNumber: null,
      expiryDate: null,
      quantityOnHand: 0,
      receivedDate: null,
      supplierReference: null
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    movementApi.getItemBatches.mockReturnValue(new Promise(() => {}));

    render(<ItemBatchesTable itemId={7} />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading batches/i);
  });

  it('renders batch list with batch number, expiry date, and unbatched stock', async () => {
    movementApi.getItemBatches.mockResolvedValueOnce({
      content: sampleBatches,
      number: 0,
      size: 50,
      totalPages: 1,
      totalElements: 2,
      first: true,
      last: true,
      empty: false
    });

    render(<ItemBatchesTable itemId={7} />);

    await waitFor(() => {
      expect(screen.getByRole('table', { name: /item batches table/i })).toBeInTheDocument();
    });

    expect(screen.getByText('LOT-2026-X')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('2027-10-31')).toBeInTheDocument();
    expect(screen.getByText('2026-08-01')).toBeInTheDocument();
    expect(screen.getByText('SUPP-DENTSPLY')).toBeInTheDocument();

    // Verify unbatched stock label is displayed
    expect(screen.getByText('Unbatched Stock')).toBeInTheDocument();
    expect(screen.getByText('No expiry')).toBeInTheDocument();
  });

  it('toggles positiveStockOnly filter when checkbox is clicked', async () => {
    movementApi.getItemBatches.mockResolvedValue({
      content: [sampleBatches[0]],
      number: 0,
      size: 50,
      totalPages: 1,
      totalElements: 1,
      first: true,
      last: true,
      empty: false
    });

    render(<ItemBatchesTable itemId={7} />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const checkbox = screen.getByLabelText(/show positive stock only/i);
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(movementApi.getItemBatches).toHaveBeenCalledWith(7, expect.objectContaining({
        positiveStockOnly: true
      }));
    });
  });

  it('renders empty state when no batches are returned', async () => {
    movementApi.getItemBatches.mockResolvedValueOnce({
      content: [],
      number: 0,
      size: 50,
      totalPages: 0,
      totalElements: 0,
      first: true,
      last: true,
      empty: true
    });

    render(<ItemBatchesTable itemId={7} />);

    await waitFor(() => {
      expect(screen.getByText(/no inventory batches registered for this item/i)).toBeInTheDocument();
    });
  });

  it('renders error state and handles retry', async () => {
    movementApi.getItemBatches.mockRejectedValueOnce(new Error('Server error loading batches'));

    render(<ItemBatchesTable itemId={7} />);

    await waitFor(() => {
      expect(screen.getByText(/Server error loading batches/i)).toBeInTheDocument();
    });

    movementApi.getItemBatches.mockResolvedValueOnce({
      content: sampleBatches,
      number: 0,
      size: 50,
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
