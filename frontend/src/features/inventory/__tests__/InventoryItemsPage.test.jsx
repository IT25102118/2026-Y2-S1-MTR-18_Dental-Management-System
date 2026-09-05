import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryItemsPage from '../pages/InventoryItemsPage';
import * as inventoryApi from '../api/inventoryApi';

vi.mock('../api/inventoryApi', () => ({
  getItems: vi.fn()
}));

describe('InventoryItemsPage', () => {
  const sampleItems = [
    {
      id: 1,
      itemCode: 'ITM-001',
      name: 'Dental Mirror #4',
      category: 'Diagnostic',
      unit: 'piece',
      currentQuantity: 25,
      reorderLevel: 10,
      active: true,
      lowStock: false
    },
    {
      id: 2,
      itemCode: 'ITM-002',
      name: 'Latex Gloves Medium',
      category: 'Consumable',
      unit: 'box',
      currentQuantity: 3,
      reorderLevel: 5,
      active: true,
      lowStock: true
    },
    {
      id: 3,
      itemCode: 'ITM-003',
      name: 'Old Composite Syringe',
      category: 'Restorative',
      unit: 'piece',
      currentQuantity: 0,
      reorderLevel: 2,
      active: false,
      lowStock: true
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    inventoryApi.getItems.mockReturnValue(new Promise(() => {})); // Never resolves

    render(
      <MemoryRouter>
        <InventoryItemsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading inventory items/i);
  });

  it('renders table with items and badges upon successful fetch', async () => {
    inventoryApi.getItems.mockResolvedValueOnce({
      content: sampleItems,
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 3,
      first: true,
      last: true,
      empty: false
    });

    render(
      <MemoryRouter>
        <InventoryItemsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ITM-001')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    expect(within(table).getByText('Dental Mirror #4')).toBeInTheDocument();
    expect(within(table).getByText('Latex Gloves Medium')).toBeInTheDocument();
    expect(within(table).getByText('Old Composite Syringe')).toBeInTheDocument();

    // Verify badges inside table rows
    const statusBadges = within(table).getAllByRole('status');
    const badgeTexts = statusBadges.map((b) => b.textContent.trim());
    expect(badgeTexts).toContain('In Stock');
    expect(badgeTexts).toContain('Low Stock');
    expect(badgeTexts).toContain('Out of Stock');
    expect(badgeTexts).toContain('Active');
    expect(badgeTexts).toContain('Inactive');
  });

  it('renders empty state when no items exist in catalog', async () => {
    inventoryApi.getItems.mockResolvedValueOnce({
      content: [],
      number: 0,
      size: 20,
      totalPages: 0,
      totalElements: 0,
      first: true,
      last: true,
      empty: true
    });

    render(
      <MemoryRouter>
        <InventoryItemsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no inventory items have been registered yet/i)).toBeInTheDocument();
    });
  });

  it('applies text search and submits query to getItems', async () => {
    inventoryApi.getItems.mockResolvedValue({
      content: [sampleItems[0]],
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
        <InventoryItemsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ITM-001')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'mirror' } });

    const searchBtn = screen.getByRole('button', { name: /^search$/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(inventoryApi.getItems).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'mirror',
          page: 0
        })
      );
    });
  });

  it('applies category, active, and stockStatus filters', async () => {
    inventoryApi.getItems.mockResolvedValue({
      content: [],
      number: 0,
      size: 20,
      totalPages: 0,
      totalElements: 0,
      first: true,
      last: true,
      empty: true
    });

    render(
      <MemoryRouter>
        <InventoryItemsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(inventoryApi.getItems).toHaveBeenCalledTimes(1);
    });

    // Fill category filter
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'Diagnostic' } });

    // Select Inactive
    fireEvent.change(screen.getByLabelText(/active status/i), { target: { value: 'false' } });

    // Select Low Stock
    fireEvent.change(screen.getByLabelText(/stock level/i), { target: { value: 'LOW_STOCK' } });

    // Click Search
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      expect(inventoryApi.getItems).toHaveBeenLastCalledWith(
        expect.objectContaining({
          category: 'Diagnostic',
          active: false,
          stockStatus: 'LOW_STOCK',
          page: 0
        })
      );
    });
  });

  it('handles page navigation next and previous', async () => {
    inventoryApi.getItems
      .mockResolvedValueOnce({
        content: [sampleItems[0]],
        number: 0,
        size: 1,
        totalPages: 2,
        totalElements: 2,
        first: true,
        last: false,
        empty: false
      })
      .mockResolvedValueOnce({
        content: [sampleItems[1]],
        number: 1,
        size: 1,
        totalPages: 2,
        totalElements: 2,
        first: false,
        last: true,
        empty: false
      });

    render(
      <MemoryRouter>
        <InventoryItemsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /go to next page/i })).toBeEnabled();
    });

    const nextBtn = screen.getByRole('button', { name: /go to next page/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(inventoryApi.getItems).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  it('renders error state and retries on Retry button click', async () => {
    inventoryApi.getItems
      .mockRejectedValueOnce(new Error('Backend connection timeout'))
      .mockResolvedValueOnce({
        content: [sampleItems[0]],
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
        <InventoryItemsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Backend connection timeout/i);
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('ITM-001')).toBeInTheDocument();
    });
  });
});
