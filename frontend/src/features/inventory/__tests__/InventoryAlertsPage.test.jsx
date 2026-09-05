import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import InventoryAlertsPage from '../pages/InventoryAlertsPage';

vi.mock('../components/LowStockAlertsTable', () => ({
  default: () => <div data-testid="mock-low-stock-table">Mock Low Stock Table</div>
}));

vi.mock('../components/ExpiryAlertsTable', () => ({
  default: () => <div data-testid="mock-expiry-table">Mock Expiry Table</div>
}));

describe('InventoryAlertsPage', () => {
  it('renders page header, breadcrumbs, and default low-stock tab', () => {
    render(
      <MemoryRouter>
        <InventoryAlertsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /inventory alerts/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to inventory items/i })).toHaveAttribute(
      'href',
      '/inventory/items'
    );

    const lowStockTab = screen.getByRole('tab', { name: /low stock alerts/i });
    const expiryTab = screen.getByRole('tab', { name: /expiry alerts/i });

    expect(lowStockTab).toHaveAttribute('aria-selected', 'true');
    expect(expiryTab).toHaveAttribute('aria-selected', 'false');

    expect(screen.getByTestId('mock-low-stock-table')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-expiry-table')).not.toBeInTheDocument();
  });

  it('switches to expiry tab when clicked', () => {
    render(
      <MemoryRouter>
        <InventoryAlertsPage />
      </MemoryRouter>
    );

    const expiryTab = screen.getByRole('tab', { name: /expiry alerts/i });
    fireEvent.click(expiryTab);

    expect(expiryTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /low stock alerts/i })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    expect(screen.getByTestId('mock-expiry-table')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-low-stock-table')).not.toBeInTheDocument();
  });
});
