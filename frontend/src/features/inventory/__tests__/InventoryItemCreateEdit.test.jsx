import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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
      unit: 'bottle',
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
    fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value: 'bottle' } });
    fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/default supplier reference/i), { target: { value: 'SUPP-RESIN' } });

    fireEvent.click(screen.getByRole('button', { name: /register item/i }));

    await waitFor(() => {
      expect(inventoryApi.createItem).toHaveBeenCalledWith({
        itemCode: 'ITM-055',
        name: 'Composite Resin',
        category: 'Restorative',
        unit: 'bottle',
        reorderLevel: 5,
        defaultSupplierReference: 'SUPP-RESIN'
      });
      expect(screen.getByText('Detail Page for 55')).toBeInTheDocument();
    });
  });

  it('renders Unit of Measurement as a dropdown select with Select unit placeholder and four unit options', () => {
    render(
      <MemoryRouter>
        <InventoryItemCreatePage />
      </MemoryRouter>
    );

    const unitSelect = screen.getByLabelText(/unit of measurement/i);
    expect(unitSelect.tagName).toBe('SELECT');
    expect(unitSelect).toHaveValue('');
    expect(unitSelect).toBeRequired();

    const options = unitSelect.querySelectorAll('option');
    expect(options).toHaveLength(5);
    expect(options[0]).toHaveTextContent('Select unit');
    expect(options[0]).toHaveValue('');
    expect(options[1]).toHaveTextContent('Piece');
    expect(options[1]).toHaveValue('piece');
    expect(options[2]).toHaveTextContent('Box');
    expect(options[2]).toHaveValue('box');
    expect(options[3]).toHaveTextContent('Bottle');
    expect(options[3]).toHaveValue('bottle');
    expect(options[4]).toHaveTextContent('Pack');
    expect(options[4]).toHaveValue('pack');
  });

  it('submits correctly for each permitted unit option: piece, box, bottle, pack', async () => {
    const units = [
      { label: 'Piece', value: 'piece' },
      { label: 'Box', value: 'box' },
      { label: 'Bottle', value: 'bottle' },
      { label: 'Pack', value: 'pack' }
    ];

    for (const { value } of units) {
      vi.clearAllMocks();
      inventoryApi.createItem.mockResolvedValueOnce({
        id: 101,
        itemCode: `ITM-${value}`,
        name: `Test ${value}`,
        category: 'Supplies',
        unit: value,
        reorderLevel: 1,
        currentQuantity: 0,
        active: true
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/inventory/items/new']}>
          <Routes>
            <Route path="/inventory/items/new" element={<InventoryItemCreatePage />} />
            <Route path="/inventory/items/:id" element={<div>Detail Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/item code/i), { target: { value: `ITM-${value}` } });
      fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: `Test ${value}` } });
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Supplies' } });
      fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value } });
      fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '1' } });

      fireEvent.click(screen.getByRole('button', { name: /register item/i }));

      await waitFor(() => {
        expect(inventoryApi.createItem).toHaveBeenCalledWith(
          expect.objectContaining({ unit: value })
        );
      });

      unmount();
    }
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

  it('triggers "Item registered successfully." upon confirmed API success and passes it to destination page', async () => {
    inventoryApi.createItem.mockResolvedValueOnce({
      id: 88,
      itemCode: 'ITM-088',
      name: 'Sterilization Pouch',
      category: 'Sterilization',
      unit: 'box',
      reorderLevel: 10,
      currentQuantity: 0,
      active: true
    });

    function LocationStateConsumer() {
      const location = useLocation();
      return (
        <div>
          <div data-testid="destination-id">Detail Page for 88</div>
          {location.state?.successMessage && (
            <div data-testid="destination-success-message">{location.state.successMessage}</div>
          )}
        </div>
      );
    }

    render(
      <MemoryRouter initialEntries={['/inventory/items/new']}>
        <Routes>
          <Route path="/inventory/items/new" element={<InventoryItemCreatePage />} />
          <Route path="/inventory/items/:id" element={<LocationStateConsumer />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/item code/i), { target: { value: 'ITM-088' } });
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Sterilization Pouch' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Sterilization' } });
    fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value: 'box' } });
    fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: /register item/i }));

    await waitFor(() => {
      expect(screen.getByTestId('destination-success-message')).toHaveTextContent('Item registered successfully.');
    });
  });

  it('does not display success message while request is pending or before backend success', async () => {
    let resolvePromise;
    inventoryApi.createItem.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(
      <MemoryRouter initialEntries={['/inventory/items/new']}>
        <InventoryItemCreatePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/item code/i), { target: { value: 'ITM-089' } });
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Gloves Large' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'PPE' } });
    fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value: 'box' } });
    fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: /register item/i }));

    // While pending, submit button is disabled and no success message appears
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
    expect(screen.queryByText(/item registered successfully/i)).not.toBeInTheDocument();

    // Now resolve
    resolvePromise({
      id: 89,
      itemCode: 'ITM-089',
      name: 'Gloves Large'
    });

    await waitFor(() => {
      expect(screen.getByText('Item registered successfully.')).toBeInTheDocument();
    });
  });

  it('does not display success message when API call fails and retains form data', async () => {
    inventoryApi.createItem.mockRejectedValueOnce(
      new inventoryApi.InventoryApiError(409, 'Conflict: An item with this code already exists.', {
        itemCode: 'An inventory item with this code already exists'
      })
    );

    render(
      <MemoryRouter initialEntries={['/inventory/items/new']}>
        <InventoryItemCreatePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/item code/i), { target: { value: 'ITM-DUP' } });
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Duplicate Gauze' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Consumables' } });
    fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value: 'pack' } });
    fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /register item/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/conflict: an item with this code already exists/i).length).toBeGreaterThan(0);
    });

    // Success message must NOT be displayed
    expect(screen.queryByText(/item registered successfully/i)).not.toBeInTheDocument();

    // Form data must remain preserved
    expect(screen.getByLabelText(/item code/i)).toHaveValue('ITM-DUP');
    expect(screen.getByLabelText(/item name/i)).toHaveValue('Duplicate Gauze');
  });

  it('prevents duplicate submissions while request is in flight', async () => {
    let resolvePromise;
    inventoryApi.createItem.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(
      <MemoryRouter initialEntries={['/inventory/items/new']}>
        <InventoryItemCreatePage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/item code/i), { target: { value: 'ITM-LOCK' } });
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Cotton Rolls' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Consumables' } });
    fireEvent.change(screen.getByLabelText(/unit of measurement/i), { target: { value: 'pack' } });
    fireEvent.change(screen.getByLabelText(/reorder level/i), { target: { value: '10' } });

    const submitBtn = screen.getByRole('button', { name: /register item/i });
    fireEvent.click(submitBtn);

    // Second click while in flight
    fireEvent.click(submitBtn);

    expect(inventoryApi.createItem).toHaveBeenCalledTimes(1);

    resolvePromise({ id: 91, itemCode: 'ITM-LOCK' });
    await waitFor(() => {
      expect(screen.getByText('Item registered successfully.')).toBeInTheDocument();
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

  it('pre-selects existing standard unit in edit mode', async () => {
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

    const unitSelect = screen.getByLabelText(/unit of measurement/i);
    expect(unitSelect).toHaveValue('box');
  });

  it('safely preserves legacy unit in edit mode and allows updating or keeping it without data corruption', async () => {
    const legacyItem = {
      ...existingItem,
      id: 33,
      itemCode: 'SGWEEFS',
      name: 'Special Tool',
      unit: 'WERFW'
    };
    inventoryApi.getItemById.mockResolvedValueOnce(legacyItem);
    inventoryApi.updateItem.mockResolvedValueOnce({
      ...legacyItem,
      name: 'Special Tool Updated'
    });

    render(
      <MemoryRouter initialEntries={['/inventory/items/33/edit']}>
        <Routes>
          <Route path="/inventory/items/:id/edit" element={<InventoryItemEditPage />} />
          <Route path="/inventory/items/:id" element={<div>Detail Page for 33</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Special Tool')).toBeInTheDocument();
    });

    const unitSelect = screen.getByLabelText(/unit of measurement/i);
    expect(unitSelect).toHaveValue('WERFW');

    // Updating name without touching unit preserves 'WERFW'
    fireEvent.change(screen.getByLabelText(/item name/i), { target: { value: 'Special Tool Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(inventoryApi.updateItem).toHaveBeenCalledWith(
        '33',
        expect.objectContaining({ unit: 'WERFW', name: 'Special Tool Updated' })
      );
    });
  });
});

