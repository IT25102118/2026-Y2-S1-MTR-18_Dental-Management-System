import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryItemDetailPage from '../pages/InventoryItemDetailPage';
import * as inventoryApi from '../api/inventoryApi';
import * as movementApi from '../api/movementApi';
import { useAuth } from '../../auth/context/AuthContext';

vi.mock('../api/inventoryApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getItemById: vi.fn(),
    updateItemStatus: vi.fn()
  };
});

vi.mock('../api/movementApi', () => ({
  getItemMovements: vi.fn().mockResolvedValue({
    content: [],
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    empty: true
  }),
  recordStockMovement: vi.fn(),
  reverseStockMovement: vi.fn()
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('InventoryItemDetailPage', () => {
  const sampleItem = {
    id: 1,
    itemCode: 'ITM-001',
    name: 'Dental Mirror #4',
    category: 'Diagnostic',
    unit: 'piece',
    currentQuantity: 25,
    reorderLevel: 10,
    active: true,
    lowStock: false,
    defaultSupplierReference: 'SUPP-MIRROR',
    createdAt: '2026-09-01T10:00:00',
    updatedAt: '2026-09-02T12:30:00'
  };

  beforeEach(() => {
    vi.resetAllMocks();
    useAuth.mockReturnValue({
      user: null,
      isAuthenticated: false
    });
    movementApi.getItemMovements.mockResolvedValue({
      content: [],
      number: 0,
      size: 20,
      totalPages: 0,
      totalElements: 0,
      first: true,
      last: true,
      empty: true
    });
  });

  it('renders loading state initially', () => {
    inventoryApi.getItemById.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/inventory/items/1']}>
        <Routes>
          <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading item details/i);
  });

  it('renders 404 state when item does not exist', async () => {
    inventoryApi.getItemById.mockRejectedValueOnce(
      new inventoryApi.InventoryApiError(404, 'Item not found', {}, 'Not Found')
    );

    render(
      <MemoryRouter initialEntries={['/inventory/items/999']}>
        <Routes>
          <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Item Not Found')).toBeInTheDocument();
    });
  });

  it('renders master data and quantity specifications cleanly', async () => {
    inventoryApi.getItemById.mockResolvedValueOnce(sampleItem);

    render(
      <MemoryRouter initialEntries={['/inventory/items/1']}>
        <Routes>
          <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dental Mirror #4');
    });

    expect(screen.getAllByText('ITM-001').length).toBeGreaterThan(0);
    expect(screen.getByText('Diagnostic')).toBeInTheDocument();
    expect(screen.getByText('piece')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('SUPP-MIRROR')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    const editLink = screen.getByRole('link', { name: /edit item/i });
    expect(editLink).toHaveAttribute('href', '/inventory/items/1/edit');
  });

  it('handles deactivation confirmation flow', async () => {
    inventoryApi.getItemById.mockResolvedValueOnce(sampleItem);
    inventoryApi.updateItemStatus.mockResolvedValueOnce({
      ...sampleItem,
      active: false
    });

    render(
      <MemoryRouter initialEntries={['/inventory/items/1']}>
        <Routes>
          <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dental Mirror #4');
    });

    // Click "Deactivate Item"
    const deactivateBtn = screen.getByRole('button', { name: /deactivate item/i });
    fireEvent.click(deactivateBtn);

    // Confirmation region should now be visible
    expect(screen.getByRole('region', { name: /confirm deactivation/i })).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to deactivate/i)).toBeInTheDocument();

    // Click "Cancel" first to verify cancellation
    const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('region', { name: /confirm deactivation/i })).not.toBeInTheDocument();
    expect(inventoryApi.updateItemStatus).not.toHaveBeenCalled();

    // Click "Deactivate Item" again and confirm
    fireEvent.click(screen.getByRole('button', { name: /deactivate item/i }));
    const confirmBtn = screen.getByRole('button', { name: /confirm deactivation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(inventoryApi.updateItemStatus).toHaveBeenCalledWith('1', false);
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('handles activation directly when item is inactive', async () => {
    const inactiveItem = { ...sampleItem, active: false };
    inventoryApi.getItemById.mockResolvedValueOnce(inactiveItem);
    inventoryApi.updateItemStatus.mockResolvedValueOnce({
      ...inactiveItem,
      active: true
    });

    render(
      <MemoryRouter initialEntries={['/inventory/items/1']}>
        <Routes>
          <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dental Mirror #4');
    });

    const activateBtn = screen.getByRole('button', { name: /activate item/i });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(inventoryApi.updateItemStatus).toHaveBeenCalledWith('1', true);
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('surfaces status update failure without corrupting current item state', async () => {
    inventoryApi.getItemById.mockResolvedValueOnce(sampleItem);
    inventoryApi.updateItemStatus.mockRejectedValueOnce(
      new Error('Status toggle failed on server')
    );

    render(
      <MemoryRouter initialEntries={['/inventory/items/1']}>
        <Routes>
          <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dental Mirror #4');
    });

    fireEvent.click(screen.getByRole('button', { name: /deactivate item/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirm deactivation/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Status toggle failed on server/i);
    });

    // Original state is preserved
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  describe('Staff Stock Movement Workflow', () => {
    it('hides "+ Record Stock Movement" button for unauthenticated users', async () => {
      inventoryApi.getItemById.mockResolvedValueOnce(sampleItem);
      useAuth.mockReturnValue({
        user: null,
        isAuthenticated: false
      });

      render(
        <MemoryRouter initialEntries={['/inventory/items/1']}>
          <Routes>
            <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dental Mirror #4');
      });

      expect(screen.queryByRole('button', { name: /\+ record stock movement/i })).not.toBeInTheDocument();
    });

    it('displays "+ Record Stock Movement" toggle button for staff and toggles form open and closed', async () => {
      inventoryApi.getItemById.mockResolvedValueOnce(sampleItem);
      useAuth.mockReturnValue({
        user: { id: 5, role: 'RECEPTIONIST', email: 'receptionist@dentcare.com' },
        isAuthenticated: true
      });

      render(
        <MemoryRouter initialEntries={['/inventory/items/1']}>
          <Routes>
            <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dental Mirror #4');
      });

      // Toggle button should be visible
      const toggleBtn = screen.getByTestId('toggle-movement-form-button');
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveTextContent(/\+ record stock movement/i);

      // Click to open movement form
      fireEvent.click(toggleBtn);

      expect(screen.getByRole('heading', { name: /record stock movement/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide movement form/i })).toBeInTheDocument();

      // Click again to close form
      fireEvent.click(screen.getByRole('button', { name: /hide movement form/i }));
      expect(screen.queryByRole('heading', { name: /record stock movement/i })).not.toBeInTheDocument();
    });

    it('refreshes item details and updates currentQuantity when movement is successfully recorded', async () => {
      inventoryApi.getItemById.mockResolvedValueOnce(sampleItem);
      useAuth.mockReturnValue({
        user: { id: 5, role: 'ADMINISTRATOR', email: 'admin@dentcare.com' },
        isAuthenticated: true
      });

      movementApi.recordStockMovement.mockResolvedValueOnce({
        id: 101,
        inventoryItemId: 1,
        itemCode: 'ITM-001',
        itemName: 'Dental Mirror #4',
        movementType: 'RECEIVED',
        quantity: 15,
        quantityDelta: 15,
        resultingQuantity: 40,
        occurredAt: '2026-09-15T10:00:00',
        responsibleUserId: 5
      });

      // Second getItemById call after movement success
      const updatedItem = { ...sampleItem, currentQuantity: 40 };
      inventoryApi.getItemById.mockResolvedValueOnce(updatedItem);

      render(
        <MemoryRouter initialEntries={['/inventory/items/1']}>
          <Routes>
            <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument();
      });

      // Open movement form
      fireEvent.click(screen.getByRole('button', { name: /\+ record stock movement/i }));

      // Fill in quantity
      const qtyInput = screen.getByLabelText(/quantity \*/i);
      fireEvent.change(qtyInput, { target: { value: '15' } });

      // Submit movement form
      const submitBtn = screen.getByTestId('submit-movement-button');
      fireEvent.click(submitBtn);

      // Verify recordStockMovement was called
      await waitFor(() => {
        expect(movementApi.recordStockMovement).toHaveBeenCalledWith('1', expect.objectContaining({
          movementType: 'RECEIVED',
          quantity: 15
        }));
      });

      // Verify getItemById called to refresh quantity, and updated quantity is displayed
      await waitFor(() => {
        expect(inventoryApi.getItemById).toHaveBeenCalledTimes(2);
        expect(screen.getByText('40')).toBeInTheDocument();
      });
    });
  });
});
