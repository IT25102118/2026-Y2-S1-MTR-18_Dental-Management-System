import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StockMovementForm from '../components/StockMovementForm';
import * as movementApi from '../api/movementApi';
import * as inventoryApi from '../api/inventoryApi';
import { useAuth } from '../../auth/context/AuthContext';

vi.mock('../api/movementApi', () => ({
  recordStockMovement: vi.fn(),
  getItemBatches: vi.fn().mockResolvedValue({ content: [] })
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

  it('renders batch selector and enforces batch selection when multiple positive batches exist for stock-out', async () => {
    const multiBatches = [
      { id: 101, batchNumber: 'LOT-A', quantityOnHand: 20, expiryDate: '2028-05-01' },
      { id: 102, batchNumber: 'LOT-B', quantityOnHand: 15, expiryDate: '2028-06-01' }
    ];
    movementApi.getItemBatches.mockResolvedValueOnce({ content: multiBatches });

    render(<StockMovementForm item={sampleItem} />);

    // Switch to USED (stock out)
    const typeSelect = screen.getByLabelText(/movement type/i);
    fireEvent.change(typeSelect, { target: { value: 'USED' } });

    await waitFor(() => {
      expect(screen.getByTestId('movement-batch-select')).toBeInTheDocument();
    });

    const qtyInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(qtyInput, { target: { value: '5' } });

    // Submit without selecting batch
    const submitBtn = screen.getByTestId('submit-movement-button');
    fireEvent.click(submitBtn);

    expect(await screen.findByTestId('batch-error')).toHaveTextContent(/batch selection is required/i);
    expect(movementApi.recordStockMovement).not.toHaveBeenCalled();

    // Now select LOT-A
    const batchSelect = screen.getByTestId('movement-batch-select');
    fireEvent.change(batchSelect, { target: { value: '101' } });

    movementApi.recordStockMovement.mockResolvedValueOnce({
      id: 55,
      inventoryItemId: 10,
      movementType: 'USED',
      quantity: 5,
      resultingQuantity: 35
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(movementApi.recordStockMovement).toHaveBeenCalledWith(
        '10',
        expect.objectContaining({
          movementType: 'USED',
          quantity: 5,
          batchId: 101,
          batchNumber: 'LOT-A'
        })
      );
    });
  });

  it('disables expired batches in batch selector when movement type is USED', async () => {
    const expiredBatch = { id: 103, batchNumber: 'LOT-EXPIRED', quantityOnHand: 10, expiryDate: '2020-01-01' };
    const validBatch = { id: 104, batchNumber: 'LOT-VALID', quantityOnHand: 25, expiryDate: '2029-01-01' };
    movementApi.getItemBatches.mockResolvedValueOnce({ content: [expiredBatch, validBatch] });

    render(<StockMovementForm item={sampleItem} />);

    const typeSelect = screen.getByLabelText(/movement type/i);
    fireEvent.change(typeSelect, { target: { value: 'USED' } });

    await waitFor(() => {
      expect(screen.getByTestId('movement-batch-select')).toBeInTheDocument();
    });

    const options = screen.getAllByRole('option');
    const expiredOption = options.find((opt) => opt.value === '103');
    expect(expiredOption).toBeDisabled();
    expect(expiredOption).toHaveTextContent(/expired - cannot use/i);

    const validOption = options.find((opt) => opt.value === '104');
    expect(validOption).not.toBeDisabled();
  });

  it('renders direction indicator banner dynamically reflecting inbound vs outbound movements', () => {
    render(<StockMovementForm item={sampleItem} />);

    // Default is RECEIVED (Inbound)
    const banner = screen.getByTestId('movement-direction-banner');
    expect(banner).toHaveClass('direction-in');
    expect(banner).toHaveTextContent(/inbound stock movement/i);

    // Change to USED (Outbound)
    const typeSelect = screen.getByLabelText(/movement type/i);
    fireEvent.change(typeSelect, { target: { value: 'USED' } });

    expect(banner).toHaveClass('direction-out');
    expect(banner).toHaveTextContent(/outbound stock movement/i);
  });

  it('renders projected balance calculation and warns upon negative balance', () => {
    render(<StockMovementForm item={sampleItem} />);

    // Inbound: 40 + 10 = 50
    const qtyInput = screen.getByLabelText(/quantity/i);
    fireEvent.change(qtyInput, { target: { value: '10' } });

    const balanceCard = screen.getByTestId('projected-balance-card');
    expect(balanceCard).toBeInTheDocument();
    expect(balanceCard).toHaveTextContent(/40 box/i);
    expect(balanceCard).toHaveTextContent(/\+10 box/i);
    expect(balanceCard).toHaveTextContent(/50 box/i);

    // Switch to USED: 40 - 50 = -10 (negative deficit)
    const typeSelect = screen.getByLabelText(/movement type/i);
    fireEvent.change(typeSelect, { target: { value: 'USED' } });
    fireEvent.change(qtyInput, { target: { value: '50' } });

    expect(balanceCard).toHaveTextContent(/40 box/i);
    expect(balanceCard).toHaveTextContent(/-50 box/i);
    expect(balanceCard).toHaveTextContent(/-10 box/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/projected stock balance is negative/i);
  });

  it('renders interactive batch cards and displays earliest-expiry recommendation on earliest valid batch', async () => {
    const batches = [
      { id: 201, batchNumber: 'LOT-EARLY', quantityOnHand: 15, expiryDate: '2027-02-15' },
      { id: 202, batchNumber: 'LOT-LATER', quantityOnHand: 25, expiryDate: '2028-11-20' }
    ];
    movementApi.getItemBatches.mockResolvedValueOnce({ content: batches });

    render(<StockMovementForm item={sampleItem} />);

    const typeSelect = screen.getByLabelText(/movement type/i);
    fireEvent.change(typeSelect, { target: { value: 'USED' } });

    await waitFor(() => {
      expect(screen.getByTestId('batch-selection-grid')).toBeInTheDocument();
    });

    // Card 201 has earlier expiry: should have the recommended pill
    const cardEarly = screen.getByTestId('batch-card-201');
    const cardLater = screen.getByTestId('batch-card-202');
    expect(cardEarly).toHaveTextContent(/recommended — earliest expiry/i);
    expect(cardLater).not.toHaveTextContent(/recommended — earliest expiry/i);

    // Clicking cardEarly selects it and syncs with batch select element
    fireEvent.click(cardEarly);
    expect(cardEarly).toHaveClass('selected');
    expect(screen.getByTestId('movement-batch-select')).toHaveValue('201');

    // Clicking cardLater selects it instead
    fireEvent.click(cardLater);
    expect(cardEarly).not.toHaveClass('selected');
    expect(cardLater).toHaveClass('selected');
    expect(screen.getByTestId('movement-batch-select')).toHaveValue('202');
  });

  it('dynamically updates direction banner when ADJUSTED direction is toggled between INCREASE and DECREASE', () => {
    render(<StockMovementForm item={sampleItem} />);

    const typeSelect = screen.getByLabelText(/movement type/i);
    fireEvent.change(typeSelect, { target: { value: 'ADJUSTED' } });

    const banner = screen.getByTestId('movement-direction-banner');
    // Default adjustment direction is INCREASE
    expect(banner).toHaveClass('direction-in');
    expect(banner).toHaveTextContent(/increases inventory balance/i);

    // Switch adjustment direction to DECREASE
    const decreaseRadio = screen.getByLabelText(/decrease stock/i);
    fireEvent.click(decreaseRadio);

    expect(banner).toHaveClass('direction-out');
    expect(banner).toHaveTextContent(/deducts inventory balance/i);
  });

  it('permits selection of expired batches for EXPIRED disposal write-off movements', async () => {
    const expiredBatch = { id: 301, batchNumber: 'LOT-OLD-DISPOSAL', quantityOnHand: 8, expiryDate: '2020-01-01' };
    movementApi.getItemBatches.mockResolvedValueOnce({ content: [expiredBatch] });

    render(<StockMovementForm item={sampleItem} />);

    const typeSelect = screen.getByLabelText(/movement type/i);
    fireEvent.change(typeSelect, { target: { value: 'EXPIRED' } });

    await waitFor(() => {
      expect(screen.getByTestId('batch-selection-grid')).toBeInTheDocument();
    });

    const card = screen.getByTestId('batch-card-301');
    expect(card).not.toHaveClass('disabled');
    expect(card).toHaveAttribute('aria-disabled', 'false');

    // Click to select the expired batch for disposal
    fireEvent.click(card);
    expect(card).toHaveClass('selected');
    expect(screen.getByTestId('movement-batch-select')).toHaveValue('301');
  });

  describe('Prompt 35: Expiry date past date prevention', () => {
    function getLocalDateString(offsetDays = 0) {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    it('sets dynamic min attribute on expiry date input equal to today in local calendar format', () => {
      render(<StockMovementForm item={sampleItem} />);

      const expiryInput = screen.getByLabelText(/expiry date/i);
      const todayStr = getLocalDateString(0);
      expect(expiryInput).toHaveAttribute('min', todayStr);
    });

    it('rejects past expiry date on submit with validation error message', async () => {
      render(<StockMovementForm item={sampleItem} />);

      const qtyInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(qtyInput, { target: { value: '10' } });

      const expiryInput = screen.getByLabelText(/expiry date/i);
      const pastDate = getLocalDateString(-1);
      fireEvent.change(expiryInput, { target: { value: pastDate } });

      const submitBtn = screen.getByTestId('submit-movement-button');
      fireEvent.click(submitBtn);

      const errorMsg = await screen.findByTestId('movement-expiry-date-error');
      expect(errorMsg).toHaveTextContent('Expiry date cannot be earlier than today.');
      expect(movementApi.recordStockMovement).not.toHaveBeenCalled();
    });

    it('accepts today as expiry date on submit', async () => {
      movementApi.recordStockMovement.mockResolvedValueOnce({
        id: 101,
        inventoryItemId: 10,
        movementType: 'RECEIVED',
        quantity: 10,
        resultingQuantity: 50
      });

      render(<StockMovementForm item={sampleItem} />);

      const qtyInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(qtyInput, { target: { value: '10' } });

      const todayStr = getLocalDateString(0);
      const expiryInput = screen.getByLabelText(/expiry date/i);
      fireEvent.change(expiryInput, { target: { value: todayStr } });

      const submitBtn = screen.getByTestId('submit-movement-button');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(movementApi.recordStockMovement).toHaveBeenCalledWith(
          '10',
          expect.objectContaining({
            movementType: 'RECEIVED',
            quantity: 10,
            expiryDate: todayStr
          })
        );
      });
      expect(screen.queryByTestId('movement-expiry-date-error')).not.toBeInTheDocument();
    });

    it('accepts future date as expiry date on submit', async () => {
      movementApi.recordStockMovement.mockResolvedValueOnce({
        id: 102,
        inventoryItemId: 10,
        movementType: 'RECEIVED',
        quantity: 20,
        resultingQuantity: 60
      });

      render(<StockMovementForm item={sampleItem} />);

      const qtyInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(qtyInput, { target: { value: '20' } });

      const futureDate = getLocalDateString(30);
      const expiryInput = screen.getByLabelText(/expiry date/i);
      fireEvent.change(expiryInput, { target: { value: futureDate } });

      const submitBtn = screen.getByTestId('submit-movement-button');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(movementApi.recordStockMovement).toHaveBeenCalledWith(
          '10',
          expect.objectContaining({
            movementType: 'RECEIVED',
            quantity: 20,
            expiryDate: futureDate
          })
        );
      });
      expect(screen.queryByTestId('movement-expiry-date-error')).not.toBeInTheDocument();
    });

    it('accepts empty expiry date since it is optional', async () => {
      movementApi.recordStockMovement.mockResolvedValueOnce({
        id: 103,
        inventoryItemId: 10,
        movementType: 'RECEIVED',
        quantity: 5,
        resultingQuantity: 45
      });

      render(<StockMovementForm item={sampleItem} />);

      const qtyInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(qtyInput, { target: { value: '5' } });

      const submitBtn = screen.getByTestId('submit-movement-button');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(movementApi.recordStockMovement).toHaveBeenCalledWith(
          '10',
          expect.objectContaining({
            movementType: 'RECEIVED',
            quantity: 5
          })
        );
      });
      expect(screen.queryByTestId('movement-expiry-date-error')).not.toBeInTheDocument();
    });

    it('displays server-side expiryDate field validation error when backend rejects bypass', async () => {
      movementApi.recordStockMovement.mockRejectedValueOnce(
        new inventoryApi.InventoryApiError(
          400,
          'Validation failed',
          { expiryDate: 'Expiry date cannot be earlier than today' }
        )
      );

      render(<StockMovementForm item={sampleItem} />);

      const qtyInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(qtyInput, { target: { value: '10' } });

      const submitBtn = screen.getByTestId('submit-movement-button');
      fireEvent.click(submitBtn);

      const errorMsg = await screen.findByTestId('movement-expiry-date-error');
      expect(errorMsg).toHaveTextContent('Expiry date cannot be earlier than today');
    });
  });
});


