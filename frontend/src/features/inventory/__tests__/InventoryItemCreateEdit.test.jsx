import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryItemCreatePage from '../pages/InventoryItemCreatePage';
import InventoryItemEditPage from '../pages/InventoryItemEditPage';
import * as inventoryApi from '../api/inventoryApi';

vi.mock('../api/inventoryApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createItem: vi.fn(),
    getItemById: vi.fn(),
    updateItem: vi.fn()
  };
});

describe('InventoryItemCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required create fields and does not render a quantity input', () => {
    render(
      <MemoryRouter>
        <InventoryItemCreatePage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/item code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/item name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unit of measurement/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reorder level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/default supplier reference/i)).toBeInTheDocument();

    // Verify quantity input is NOT rendered
    expect(screen.queryByLabelText(/current quantity/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/initial quantity/i)).not.toBeInTheDocument();

    // Verify informational note
    expect(screen.getByRole('note')).toHaveTextContent(/initial stock is 0/i);
  });

  it('validates required fields client-side before submit', async () => {
    render(
      <MemoryRouter>
        <InventoryItemCreatePage />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /register item/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Item code is required')).toBeInTheDocument();
    expect(screen.getByText('Item name is required')).toBeInTheDocument();
    expect(screen.getByText('Category is required')).toBeInTheDocument();
    expect(screen.getByText('Unit is required')).toBeInTheDocument();

    expect(inventoryApi.createItem).not.toHaveBeenCalled();
  });

  it('rejects negative reorder level client-side', async () => {
    render(
      <MemoryRouter>
        <InventoryItemCreatePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/item code/i), { target: { value: 'ITM-010' } });
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Dental Probe' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Diagnostic' } });
    fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value: 'piece' } });
    fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '-5' } });

    fireEvent.click(screen.getByRole('button', { name: /register item/i }));

    expect(screen.getByText(/reorder level must be greater than or equal to zero/i)).toBeInTheDocument();
    expect(inventoryApi.createItem).not.toHaveBeenCalled();
  });

  it('submits valid form with exact allowed fields and navigates on success', async () => {
    inventoryApi.createItem.mockResolvedValueOnce({
      id: 55,
      itemCode: 'ITM-055',
      name: 'Composite Resin',
      category: 'Restorative',
      unit: 'syringe',
      reorderLevel: 5,
      currentQuantity: 0,
      active: true
    });

    render(
      <MemoryRouter initialEntries={['/inventory/items/new']}>
        <Routes>
          <Route path="/inventory/items/new" element={<InventoryItemCreatePage />} />
          <Route path="/inventory/items/:id" element={<div>Detail Page for 55</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/item code/i), { target: { value: 'ITM-055' } });
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Composite Resin' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Restorative' } });
    fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value: 'syringe' } });
    fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/default supplier reference/i), { target: { value: 'SUPP-RESIN' } });

    fireEvent.click(screen.getByRole('button', { name: /register item/i }));

    await waitFor(() => {
      expect(inventoryApi.createItem).toHaveBeenCalledWith({
        itemCode: 'ITM-055',
        name: 'Composite Resin',
        category: 'Restorative',
        unit: 'syringe',
        reorderLevel: 5,
        defaultSupplierReference: 'SUPP-RESIN'
      });
      expect(screen.getByText('Detail Page for 55')).toBeInTheDocument();
    });
  });

  it('surfaces 409 duplicate itemCode error on itemCode input', async () => {
    inventoryApi.createItem.mockRejectedValueOnce(
      new inventoryApi.InventoryApiError(
        409,
        "An inventory item with code 'ITM-DUP' already exists",
        {},
        'Conflict'
      )
    );

    render(
      <MemoryRouter>
        <InventoryItemCreatePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/item code/i), { target: { value: 'ITM-DUP' } });
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Duplicate Tool' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Tools' } });
    fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value: 'piece' } });
    fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /register item/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/already exists/i).length).toBeGreaterThan(0);
    });
  });

  it('navigates back to /inventory/items on cancel button click in create page', () => {
    render(
      <MemoryRouter initialEntries={['/inventory/items/new']}>
        <Routes>
          <Route path="/inventory/items/new" element={<InventoryItemCreatePage />} />
          <Route path="/inventory/items" element={<div>Items List Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByText('Items List Page')).toBeInTheDocument();
  });

  it('accepts reorderLevel of zero as valid and submits successfully', async () => {
    inventoryApi.createItem.mockResolvedValueOnce({
      id: 99,
      itemCode: 'ITM-099',
      name: 'Zero Reorder Tool',
      category: 'Diagnostic',
      unit: 'piece',
      reorderLevel: 0,
      currentQuantity: 0,
      active: true
    });

    render(
      <MemoryRouter initialEntries={['/inventory/items/new']}>
        <Routes>
          <Route path="/inventory/items/new" element={<InventoryItemCreatePage />} />
          <Route path="/inventory/items/:id" element={<div>Detail Page for 99</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/item code/i), { target: { value: 'ITM-099' } });
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Zero Reorder Tool' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Diagnostic' } });
    fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value: 'piece' } });
    fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '0' } });

    fireEvent.click(screen.getByRole('button', { name: /register item/i }));

    await waitFor(() => {
      expect(inventoryApi.createItem).toHaveBeenCalledWith(
        expect.objectContaining({ reorderLevel: 0 })
      );
      expect(screen.getByText('Detail Page for 99')).toBeInTheDocument();
    });
  });
});

describe('InventoryItemEditPage', () => {
  const existingItem = {
    id: 10,
    itemCode: 'ITM-010',
    name: 'Surgical Mask Box',
    category: 'Consumable',
    unit: 'box',
    reorderLevel: 20,
    currentQuantity: 15,
    active: true,
    defaultSupplierReference: 'SUP-MASKS'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads item, displays itemCode as read-only, and prevents quantity editing', async () => {
    inventoryApi.getItemById.mockResolvedValueOnce(existingItem);

    render(
      <MemoryRouter initialEntries={['/inventory/items/10/edit']}>
        <Routes>
          <Route path="/inventory/items/:id/edit" element={<InventoryItemEditPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Surgical Mask Box')).toBeInTheDocument();
    });

    const codeInput = screen.getByLabelText(/item code/i);
    expect(codeInput).toHaveValue('ITM-010');
    expect(codeInput).toHaveAttribute('readonly');

    // Confirm currentQuantity is NOT an editable input
    expect(screen.queryByLabelText(/current quantity/i)).not.toBeInTheDocument();
  });

  it('submits update with strictly UpdateInventoryItemRequest fields and navigates back', async () => {
    inventoryApi.getItemById.mockResolvedValueOnce(existingItem);
    inventoryApi.updateItem.mockResolvedValueOnce({
      ...existingItem,
      name: 'Surgical Mask Box (50pk)'
    });

    render(
      <MemoryRouter initialEntries={['/inventory/items/10/edit']}>
        <Routes>
          <Route path="/inventory/items/:id/edit" element={<InventoryItemEditPage />} />
          <Route path="/inventory/items/:id" element={<div>Detail Page for 10</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Surgical Mask Box')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/item name/i);
    fireEvent.change(nameInput, { target: { value: 'Surgical Mask Box (50pk)' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(inventoryApi.updateItem).toHaveBeenCalledWith(
        '10',
        {
          name: 'Surgical Mask Box (50pk)',
          category: 'Consumable',
          unit: 'box',
          reorderLevel: 20,
          defaultSupplierReference: 'SUP-MASKS'
        }
      );
      expect(screen.getByText('Detail Page for 10')).toBeInTheDocument();
    });
  });

  it('navigates back to item detail on cancel button click in edit page', async () => {
    inventoryApi.getItemById.mockResolvedValueOnce(existingItem);

    render(
      <MemoryRouter initialEntries={['/inventory/items/10/edit']}>
        <Routes>
          <Route path="/inventory/items/:id/edit" element={<InventoryItemEditPage />} />
          <Route path="/inventory/items/:id" element={<div>Detail Page for 10</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Surgical Mask Box')).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(screen.getByText('Detail Page for 10')).toBeInTheDocument();
  });

  it('renders not-found state when editing non-existent item', async () => {
    inventoryApi.getItemById.mockRejectedValueOnce(
      new inventoryApi.InventoryApiError(404, 'Item not found', {}, 'Not Found')
    );

    render(
      <MemoryRouter initialEntries={['/inventory/items/999/edit']}>
        <Routes>
          <Route path="/inventory/items/:id/edit" element={<InventoryItemEditPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Item Not Found')).toBeInTheDocument();
    });
  });
});
