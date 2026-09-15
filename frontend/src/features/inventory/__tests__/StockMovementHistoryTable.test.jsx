import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StockMovementHistoryTable from '../components/StockMovementHistoryTable';
import * as movementApi from '../api/movementApi';
import { InventoryApiError } from '../api/inventoryApi';
import { useAuth } from '../../auth/context/AuthContext';

vi.mock('../api/movementApi', () => ({
  getItemMovements: vi.fn(),
  reverseStockMovement: vi.fn()
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: vi.fn()
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
    useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false
    });
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

  describe('Staff Reversal Workflow', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        user: { id: 12, name: 'Dr. Test', role: 'DENTIST', email: 'dentist@dentcare.com' },
        isAuthenticated: true
      });
    });

    it('renders reversal action buttons and badges according to eligibility when user is staff', async () => {
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

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Movement 1 is normal and not reversed: should have "Reverse Movement" button
      const reverseBtn = screen.getByTestId('reverse-movement-btn-1');
      expect(reverseBtn).toBeInTheDocument();
      expect(reverseBtn).toHaveTextContent(/reverse movement/i);

      // Movement 2 was reversed by Movement 3: should have "Reversed" badge
      const reversedBadge = screen.getByTestId('badge-reversed-2');
      expect(reversedBadge).toBeInTheDocument();
      expect(reversedBadge).toHaveTextContent(/reversed/i);
      expect(screen.queryByTestId('reverse-movement-btn-2')).not.toBeInTheDocument();

      // Movement 3 is itself a compensating reversal: should have "Compensating Reversal" badge
      const reversalBadge = screen.getByTestId('badge-reversal-3');
      expect(reversalBadge).toBeInTheDocument();
      expect(reversalBadge).toHaveTextContent(/compensating reversal/i);
      expect(screen.queryByTestId('reverse-movement-btn-3')).not.toBeInTheDocument();
    });

    it('opens reversal confirmation modal, validates mandatory reason, and allows cancel', async () => {
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

      await waitFor(() => {
        expect(screen.getByTestId('reverse-movement-btn-1')).toBeInTheDocument();
      });

      // Open reversal modal
      fireEvent.click(screen.getByTestId('reverse-movement-btn-1'));

      const modal = screen.getByTestId('reversal-modal');
      expect(modal).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /confirm movement reversal/i })).toBeInTheDocument();
      expect(within(modal).getByText(/Target Movement:/i)).toBeInTheDocument();
      expect(within(modal).getByText(/#1/i)).toBeInTheDocument();

      // Check confirm button is initially disabled because reason is empty
      const confirmBtn = screen.getByTestId('confirm-reversal-button');
      expect(confirmBtn).toBeDisabled();

      // Click Cancel
      const cancelBtn = screen.getByTestId('cancel-reversal-button');
      fireEvent.click(cancelBtn);

      expect(screen.queryByTestId('reversal-modal')).not.toBeInTheDocument();
    });

    it('successfully submits reversal with reason, shows success message, calls onReversalSuccess, and refreshes list', async () => {
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

      const onReversalSuccess = vi.fn();
      render(<StockMovementHistoryTable itemId={42} onReversalSuccess={onReversalSuccess} />);

      await waitFor(() => {
        expect(screen.getByTestId('reverse-movement-btn-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('reverse-movement-btn-1'));

      const reasonInput = screen.getByTestId('reversal-reason-input');
      fireEvent.change(reasonInput, { target: { value: 'Supplier recalled damaged shipment' } });

      const confirmBtn = screen.getByTestId('confirm-reversal-button');
      expect(confirmBtn).not.toBeDisabled();

      movementApi.reverseStockMovement.mockResolvedValueOnce({
        id: 99,
        inventoryItemId: 42,
        itemCode: 'ITM-042',
        itemName: 'Surgical Gloves',
        movementType: 'ADJUSTED',
        quantity: 50,
        quantityDelta: -50,
        resultingQuantity: 0,
        reversalOfMovementId: 1,
        reason: 'REVERSAL of Movement #1: Supplier recalled damaged shipment',
        occurredAt: '2026-09-15T12:00:00'
      });

      // Reload call after reversal
      movementApi.getItemMovements.mockResolvedValueOnce({
        content: [
          ...sampleMovements,
          {
            id: 99,
            inventoryItemId: 42,
            itemCode: 'ITM-042',
            movementType: 'ADJUSTED',
            quantity: 50,
            quantityDelta: -50,
            resultingQuantity: 0,
            reversalOfMovementId: 1,
            occurredAt: '2026-09-15T12:00:00'
          }
        ],
        number: 0,
        size: 20,
        totalPages: 1,
        totalElements: 4,
        first: true,
        last: true,
        empty: false
      });

      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(movementApi.reverseStockMovement).toHaveBeenCalledWith(42, 1, {
          reason: 'Supplier recalled damaged shipment'
        });
      });

      await waitFor(() => {
        expect(onReversalSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 99 }));
      });

      // Modal is closed, success message shown
      expect(screen.queryByTestId('reversal-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('movement-table-success')).toBeInTheDocument();
      expect(screen.getByText(/successfully reversed/i)).toBeInTheDocument();
    });

    it('surfaces reversal API errors in modal without closing it', async () => {
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

      await waitFor(() => {
        expect(screen.getByTestId('reverse-movement-btn-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('reverse-movement-btn-1'));

      const reasonInput = screen.getByTestId('reversal-reason-input');
      fireEvent.change(reasonInput, { target: { value: 'Already reversed by another staff' } });

      movementApi.reverseStockMovement.mockRejectedValueOnce(
        new InventoryApiError(409, 'Movement #1 has already been reversed by movement #99.')
      );

      const confirmBtn = screen.getByTestId('confirm-reversal-button');
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(screen.getByTestId('reversal-error-alert')).toBeInTheDocument();
      });

      expect(screen.getByText(/already been reversed/i)).toBeInTheDocument();
      // Modal remains open
      expect(screen.getByTestId('reversal-modal')).toBeInTheDocument();
    });
  });
});
