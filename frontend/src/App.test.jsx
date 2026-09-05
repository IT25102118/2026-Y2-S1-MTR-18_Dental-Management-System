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
    totalElements: 0,
    first: true,
    last: true,
    empty: true
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
  });

  it('routes /inventory to the inventory catalog items page', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Inventory Items/i, level: 1 })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Register New Item/i }).length).toBeGreaterThan(0);
  });

  it('contains zero fake auth or user identity context in rendered output', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: /Inventory Items/i, level: 1 });

    expect(screen.queryByText(/user id/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/responsible user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dental assistant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/101/)).not.toBeInTheDocument();
  });
});
