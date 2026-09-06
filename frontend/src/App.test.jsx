import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

vi.mock('./features/inventory/api/inventoryApi', () => ({
  getItems: vi.fn().mockResolvedValue({
    content: [],
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 12,
    first: true,
    last: true,
    empty: false
  })
}));

vi.mock('./features/inventory/api/movementApi', () => ({
  searchBatches: vi.fn().mockResolvedValue({
    content: [],
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 5,
    first: true,
    last: true,
    empty: false
  })
}));

vi.mock('./features/inventory/api/alertApi', () => ({
  getLowStockAlerts: vi.fn().mockResolvedValue({
    content: [],
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 2,
    first: true,
    last: true,
    empty: false
  })
}));

describe('Frontend Runtime Smoke Tests', () => {
  it('renders root page with application title and Inventory link', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /DentCare/i, level: 1 })).toBeInTheDocument();
    const inventoryLink = screen.getByRole('link', { name: /Inventory Management/i });
    expect(inventoryLink).toBeInTheDocument();
    expect(inventoryLink).toHaveAttribute('href', '/inventory');

    const registerLink = screen.getByRole('link', { name: /Patient Registration/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('routes /register to the patient registration page', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /patient registration/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register patient account/i })).toBeInTheDocument();
  });

  it('routes /inventory to the inventory overview landing page', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Inventory Management/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /inventory module navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Overview$/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /^Items$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Batches$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Alerts$/i })).toBeInTheDocument();

    expect(screen.getByTestId('overview-card-items')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card-batches')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card-low-stock')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card-expiry')).toBeInTheDocument();
  });

  it('routes /inventory/items to the inventory catalog items page', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory/items']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Inventory Items/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Items$/i })).toHaveAttribute('aria-current', 'page');
  });

  it('contains zero fake auth or user identity context in rendered output', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: /Inventory Management/i, level: 1 });

    expect(screen.queryByText(/fake user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dental assistant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/responsibleUserId/i)).not.toBeInTheDocument();
    expect(screen.getByText(/shared authentication\/current-user integration/i)).toBeInTheDocument();
  });
});
