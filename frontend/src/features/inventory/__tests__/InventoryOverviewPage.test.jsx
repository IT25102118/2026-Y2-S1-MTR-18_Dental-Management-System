import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InventoryOverviewPage from '../pages/InventoryOverviewPage';
import * as inventoryApi from '../api/inventoryApi';
import * as movementApi from '../api/movementApi';
import * as alertApi from '../api/alertApi';

vi.mock('../api/inventoryApi', () => ({
  getItems: vi.fn()
}));

vi.mock('../api/movementApi', () => ({
  searchBatches: vi.fn()
}));

vi.mock('../api/alertApi', () => ({
  getLowStockAlerts: vi.fn()
}));

describe('InventoryOverviewPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calls exact backend APIs with page: 0, size: 1 and displays totalElements', async () => {
    inventoryApi.getItems.mockResolvedValueOnce({
      content: [{ id: 1 }],
      totalElements: 42,
      totalPages: 42,
      number: 0,
      size: 1
    });

    movementApi.searchBatches.mockResolvedValueOnce({
      content: [{ id: 101 }],
      totalElements: 18,
      totalPages: 18,
      number: 0,
      size: 1
    });

    alertApi.getLowStockAlerts.mockResolvedValueOnce({
      content: [{ id: 1 }],
      totalElements: 5,
      totalPages: 5,
      number: 0,
      size: 1
    });

    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <InventoryOverviewPage />
      </MemoryRouter>
    );

    expect(inventoryApi.getItems).toHaveBeenCalledWith({ page: 0, size: 1 });
    expect(movementApi.searchBatches).toHaveBeenCalledWith({ page: 0, size: 1 });
    expect(alertApi.getLowStockAlerts).toHaveBeenCalledWith({ page: 0, size: 1 });

    await waitFor(() => {
      expect(screen.getByTestId('overview-card-items')).toHaveTextContent('42');
      expect(screen.getByTestId('overview-card-batches')).toHaveTextContent('18');
      expect(screen.getByTestId('overview-card-low-stock')).toHaveTextContent('5');
    });

    // Expiry monitoring card shows Date Horizon without hardcoded 30-day metric
    const expiryCard = screen.getByTestId('overview-card-expiry');
    expect(expiryCard).toHaveTextContent(/Date Horizon/i);
    expect(expiryCard).toHaveTextContent(/Inspect Expiry Alerts/i);
    expect(expiryCard).not.toHaveTextContent(/30 days/i);

    // Attention banner renders when low stock > 0
    expect(screen.getByRole('region', { name: /low-stock attention required/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 4, name: /attention required: low-stock threshold reached/i })).toBeInTheDocument();
    expect(screen.getByText(/supply items are currently at or below minimum reorder levels/i)).toBeInTheDocument();

    // Quick navigation renders with valid routes
    expect(screen.getByRole('heading', { level: 2, name: /quick operational navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register catalog item/i })).toHaveAttribute('href', '/inventory/items/new');
    expect(screen.getByRole('link', { name: /browse & filter catalog/i })).toHaveAttribute('href', '/inventory/items');
    expect(screen.getByRole('link', { name: /batch & lot search/i })).toHaveAttribute('href', '/inventory/batches');
    expect(screen.getByRole('link', { name: /operational alerts center/i })).toHaveAttribute('href', '/inventory/alerts');
  });

  it('renders consistent MF-06 navigation with Overview active', async () => {
    inventoryApi.getItems.mockResolvedValueOnce({ totalElements: 0 });
    movementApi.searchBatches.mockResolvedValueOnce({ totalElements: 0 });
    alertApi.getLowStockAlerts.mockResolvedValueOnce({ totalElements: 0 });

    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <InventoryOverviewPage />
      </MemoryRouter>
    );

    const nav = screen.getByRole('navigation', { name: /inventory module navigation/i });
    expect(nav).toBeInTheDocument();

    const overviewLink = screen.getByRole('link', { name: /^Overview$/i });
    const itemsLink = screen.getByRole('link', { name: /^Items$/i });
    const batchesLink = screen.getByRole('link', { name: /^Batches$/i });
    const alertsLink = screen.getByRole('link', { name: /^Alerts$/i });

    expect(overviewLink).toHaveAttribute('aria-current', 'page');
    expect(overviewLink).toHaveAttribute('href', '/inventory');

    expect(itemsLink).not.toHaveAttribute('aria-current');
    expect(itemsLink).toHaveAttribute('href', '/inventory/items');

    expect(batchesLink).not.toHaveAttribute('aria-current');
    expect(batchesLink).toHaveAttribute('href', '/inventory/batches');

    expect(alertsLink).not.toHaveAttribute('aria-current');
    expect(alertsLink).toHaveAttribute('href', '/inventory/alerts');

    await waitFor(() => {
      expect(screen.getByTestId('overview-card-items')).toHaveTextContent('0');
      expect(screen.getByRole('region', { name: /stock status healthy/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: /stock levels healthy/i })).toBeInTheDocument();
    });
  });

  it('displays operational guidelines referencing shared authentication/current-user integration', async () => {
    inventoryApi.getItems.mockResolvedValueOnce({ totalElements: 0 });
    movementApi.searchBatches.mockResolvedValueOnce({ totalElements: 0 });
    alertApi.getLowStockAlerts.mockResolvedValueOnce({ totalElements: 0 });

    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <InventoryOverviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('overview-card-items')).toHaveTextContent('0');
    });

    expect(
      screen.getByText(/shared authentication\/current-user integration/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/MF-01/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/responsibleUserId/i)).not.toBeInTheDocument();
  });

  it('handles service errors gracefully and supports retrying', async () => {
    inventoryApi.getItems.mockRejectedValueOnce(new Error('Network error'));
    movementApi.searchBatches.mockRejectedValueOnce(new Error('Network error'));
    alertApi.getLowStockAlerts.mockRejectedValueOnce(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <InventoryOverviewPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/unable to load overview metrics from the inventory service/i)
    ).toBeInTheDocument();

    inventoryApi.getItems.mockResolvedValueOnce({ totalElements: 10 });
    movementApi.searchBatches.mockResolvedValueOnce({ totalElements: 8 });
    alertApi.getLowStockAlerts.mockResolvedValueOnce({ totalElements: 1 });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId('overview-card-items')).toHaveTextContent('10');
    });
  });
});
