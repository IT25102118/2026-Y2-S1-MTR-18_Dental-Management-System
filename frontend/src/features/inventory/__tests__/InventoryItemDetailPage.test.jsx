import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryItemDetailPage from '../pages/InventoryItemDetailPage';
import * as inventoryApi from '../api/inventoryApi';

vi.mock('../api/inventoryApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getItemById: vi.fn(),
    updateItemStatus: vi.fn()
  };
});

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
});
