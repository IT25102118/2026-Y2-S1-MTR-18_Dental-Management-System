import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StockMovementHistoryTable from '../components/StockMovementHistoryTable';
import * as movementApi from '../api/movementApi';

vi.mock('../api/movementApi', () => ({
  getItemMovements: vi.fn()
}));

describe('StockMovementHistoryTable', () => {
  const sampleMovements = [
    {
      id: 1,
      inventoryItemId: 42,
      itemCode: 'ITM-042',
      itemName: 'Surgical Gloves',
      movementType: 'RECEIVED',
      adjustmentDirection: null,
      quantity: 50,
      quantityDelta: 50,
      resultingQuantity: 50,
      occurredAt: '2026-09-01T09:30:00',
      reason: 'Monthly delivery',
      responsibleUserId: 12,
      reversalOfMovementId: null,
      treatmentProcedureId: null,
      batchNumber: 'BATCH-G-01',
      expiryDate: '2028-06-30'
    },
    {
      id: 2,
      inventoryItemId: 42,
      itemCode: 'ITM-042',
      itemName: 'Surgical Gloves',
      movementType: 'USED',
      adjustmentDirection: null,
      quantity: 5,
      quantityDelta: -5,
      resultingQuantity: 45,
      occurredAt: '2026-09-02T14:15:00',
      reason: 'Root canal procedure',
      responsibleUserId: 14,
      reversalOfMovementId: null,
      treatmentProcedureId: 88,
      batchNumber: null,
      expiryDate: null
    },
    {
      id: 3,
      inventoryItemId: 42,
      itemCode: 'ITM-042',
      itemName: 'Surgical Gloves',
      movementType: 'ADJUSTED',
      adjustmentDirection: 'INCREASE',
      quantity: 2,
      quantityDelta: 2,
      resultingQuantity: 47,
      occurredAt: '2026-09-03T11:00:00',
      reason: 'Stock count reconciliation',
      responsibleUserId: 12,
      reversalOfMovementId: 2,
      treatmentProcedureId: null,
      batchNumber: 'BATCH-G-01',
      expiryDate: '2028-06-30'
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    movementApi.getItemMovements.mockReturnValue(new Promise(() => {}));

    render(<StockMovementHistoryTable itemId={42} />);

    expect(screen.getByRole('status')).toHaveTextContent(/loading movement history/i);
  });

  it('renders movement history table with all response fields upon success', async () => {
    movementApi.getItemMovements.mockResolvedValueOnce({
      content: sampleMovements,
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 3,
      first: true,
      last: true,
      empty: false
    });

    render(<StockMovementHistoryTable itemId={42} />);

    const table = await screen.findByRole('table', { name: /stock movement history/i });
    expect(table).toBeInTheDocument();

    // Check movement types rendered in table
    expect(within(table).getByText('Received')).toBeInTheDocument();
    expect(within(table).getByText('Used')).toBeInTheDocument();
    expect(within(table).getByText('Adjusted')).toBeInTheDocument();

    // Check quantities and deltas
    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
    expect(screen.getByText('(Bal: 50)')).toBeInTheDocument();
    expect(screen.getByText('(Bal: 45)')).toBeInTheDocument();

    // Check adjustment direction
    expect(screen.getByText('↑ Increase')).toBeInTheDocument();

    // Check responsible user
    expect(screen.getAllByText('User #12').length).toBeGreaterThan(0);
    expect(screen.getByText('User #14')).toBeInTheDocument();

    // Check batched vs unbatched
    expect(screen.getAllByText('BATCH-G-01').length).toBeGreaterThan(0);
    expect(screen.getByText('Unbatched Stock')).toBeInTheDocument();

    // Check clinical procedure and reversal references
    expect(screen.getByText('Proc #88')).toBeInTheDocument();
    expect(screen.getByText('Reversal of #2')).toBeInTheDocument();

    // Verify NO movement POST or creation form exists
    expect(screen.queryByRole('button', { name: /record movement/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/responsible user id/i)).not.toBeInTheDocument();
  });

  it('filters movements by movementType when dropdown selection changes', async () => {
    movementApi.getItemMovements.mockResolvedValue({
      content: [sampleMovements[0]],
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 1,
      first: true,
      last: true,
      empty: false
    });

    render(<StockMovementHistoryTable itemId={42} />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const filterSelect = screen.getByLabelText(/filter by movement type/i);
    fireEvent.change(filterSelect, { target: { value: 'RECEIVED' } });

    await waitFor(() => {
      expect(movementApi.getItemMovements).toHaveBeenCalledWith(42, expect.objectContaining({
        movementType: 'RECEIVED',
        page: 0
      }));
    });
  });

  it('renders empty state when no movements are found', async () => {
    movementApi.getItemMovements.mockResolvedValueOnce({
      content: [],
      number: 0,
      size: 20,
      totalPages: 0,
      totalElements: 0,
      first: true,
      last: true,
      empty: true
    });

    render(<StockMovementHistoryTable itemId={42} />);

    await waitFor(() => {
      expect(screen.getByText(/no stock movements recorded for this item yet/i)).toBeInTheDocument();
    });
  });

  it('renders error state and handles retry', async () => {
    movementApi.getItemMovements.mockRejectedValueOnce(new Error('Network failure'));

    render(<StockMovementHistoryTable itemId={42} />);

    await waitFor(() => {
      expect(screen.getByText(/Network failure/i)).toBeInTheDocument();
    });

    movementApi.getItemMovements.mockResolvedValueOnce({
      content: sampleMovements,
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 3,
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
