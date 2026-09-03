import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import App from './App';

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

  it('renders Inventory placeholder at /inventory route', () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Inventory Management/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Inventory management runtime initialized/i)).toBeInTheDocument();
  });

  it('contains zero fake auth or user identity context in rendered output', () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.queryByText(/user id/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/responsible user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dental assistant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/101/)).not.toBeInTheDocument();
  });
});
