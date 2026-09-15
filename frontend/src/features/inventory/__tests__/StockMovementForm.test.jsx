import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StockMovementForm from '../components/StockMovementForm';
import * as movementApi from '../api/movementApi';
import * as inventoryApi from '../api/inventoryApi';
import { useAuth } from '../../auth/context/AuthContext';

vi.mock('../api/movementApi', () => ({
  recordStockMovement: vi.fn()
}));

vi.mock('../api/inventoryApi', () => ({
  getItems: vi.fn(),
  InventoryApiError: class extends Error {
    constructor(status, message, fieldErrors = {}, error = null) {
      super(message);
      this.status = status;
      this.fieldErrors = fieldErrors;
      this.error = error;
    }
  }
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('StockMovementForm', () => {
  const staffUser = {
    id: 12,
    firstName: 'Sara',
    lastName: 'Connor',
    role: 'DENTAL_ASSISTANT'
  };

  const sampleItem = {
    id: 10,
    itemCode: 'ITM-010',
    name: 'Latex Gloves Medium',
    currentQuantity: 40,
    unit: 'box',
    active: true
  };

  beforeEach(() => {
    vi.resetAllMocks();
    useAuth.mockReturnValue({
      user: staffUser,
      isAuthenticated: true
    });
  });

  it('renders item context and acting user badge for authenticated staff', () => {
    render(<StockMovementForm item={sampleItem} />);

    expect(screen.getByTestId('acting-user-badge')).toHaveTextContent(/Sara Connor \(DENTAL_ASSISTANT\)/i);
    expect(screen.getByTestId('movement-item-context')).toBeInTheDocument();
    expect(screen.getByText('ITM-010')).toBeInTheDocument();
    expect(screen.getByText('Latex Gloves Medium')).toBeInTheDocument();
    expect(screen.getByTestId('movement-current-quantity')).toHaveTextContent('40 box');
  });

  it('validates quantity field and rejects 0 or negative numbers', async () => {
    render(<StockMovementForm item={sampleItem} />);

    const qtyInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(qtyInput, { target: { value: '0' } });

    const submitBtn = screen.getByTestId('submit-movement-button');
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('quantity-error')).toHaveTextContent(/strictly greater than zero/i);
    expect(movementApi.recordStockMovement).not.toHaveBeenCalled();
  });

  it('requires adjustment direction and reason when movementType is ADJUSTED', async () => {
    render(<StockMovementForm item={sampleItem} />);

    const typeSelect = screen.getByLabelText(/movement type/i);
    fireEvent.change(typeSelect, { target: { value: 'ADJUSTED' } });

    expect(screen.getByTestId('adjustment-direction-group')).toBeInTheDocument();

    const qtyInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(qtyInput, { target: { value: '5' } });

    // Submit with empty reason
    const submitBtn = screen.getByTestId('submit-movement-button');
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('reason-error')).toHaveTextContent(/detailed reason is required/i);
    expect(movementApi.recordStockMovement).not.toHaveBeenCalled();
  });

  it('submits valid stock movement without sending client responsibleUserId', async () => {
    const onSuccess = vi.fn();
    movementApi.recordStockMovement.mockResolvedValueOnce({
      id: 99,
      inventoryItemId: 10,
      movementType: 'RECEIVED',
      quantity: 15,
      resultingQuantity: 55
    });

    render(<StockMovementForm item={sampleItem} onSuccess={onSuccess} />);

    const qtyInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(qtyInput, { target: { value: '15' } });

    const reasonInput = screen.getByLabelText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Monthly restock delivery' } });

    const submitBtn = screen.getByTestId('submit-movement-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(movementApi.recordStockMovement).toHaveBeenCalledWith(
        '10',
        expect.objectContaining({
          movementType: 'RECEIVED',
          quantity: 15,
          reason: 'Monthly restock delivery'
        })
      );
    });

    // Verify client payload does NOT contain responsibleUserId
    const sentPayload = movementApi.recordStockMovement.mock.calls[0][1];
    expect(sentPayload.responsibleUserId).toBeUndefined();

    // Verify success state
    expect(await screen.findByTestId('movement-success-message')).toHaveTextContent(/Updated stock balance: 55/i);
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: 99, resultingQuantity: 55 }));
  });

  it('displays backend error message upon failure', async () => {
    movementApi.recordStockMovement.mockRejectedValueOnce(
      new inventoryApi.InventoryApiError(409, 'Insufficient stock: requested 50, available 40')
    );

    render(<StockMovementForm item={sampleItem} />);

    const typeSelect = screen.getByLabelText(/movement type/i);
    fireEvent.change(typeSelect, { target: { value: 'USED' } });

    const qtyInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(qtyInput, { target: { value: '50' } });

    const submitBtn = screen.getByTestId('submit-movement-button');
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('movement-backend-error')).toHaveTextContent(
      'Insufficient stock: requested 50, available 40'
    );
  });

  it('restricts unauthenticated users with informative message', () => {
    useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false
    });

    render(<StockMovementForm item={sampleItem} />);

    expect(screen.getByTestId('movement-form-restricted')).toHaveTextContent(
      /sign in with a clinic staff account/i
    );
    expect(screen.queryByTestId('submit-movement-button')).not.toBeInTheDocument();
  });

  it('restricts PATIENT users with informative message', () => {
    useAuth.mockReturnValue({
      user: { id: 99, role: 'PATIENT' },
      isAuthenticated: true
    });

    render(<StockMovementForm item={sampleItem} />);

    expect(screen.getByTestId('movement-form-restricted')).toHaveTextContent(
      /patient accounts are not authorized/i
    );
    expect(screen.queryByTestId('submit-movement-button')).not.toBeInTheDocument();
  });
});
