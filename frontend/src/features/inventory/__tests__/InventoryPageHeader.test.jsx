import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import InventoryPageHeader from '../components/InventoryPageHeader';

describe('InventoryPageHeader', () => {
  it('renders title, subtitle, breadcrumb, and navigation bar by default', () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <InventoryPageHeader
          title="Inventory Overview"
          subtitle="Practice inventory catalog and monitoring."
          breadcrumb={{ to: '/', label: '← Back to Home' }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Inventory Overview' })).toBeInTheDocument();
    expect(screen.getByText('Practice inventory catalog and monitoring.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('navigation', { name: /inventory module navigation/i })).toBeInTheDocument();
  });

  it('renders custom actions in the header', () => {
    render(
      <MemoryRouter initialEntries={['/inventory/items']}>
        <InventoryPageHeader
          title="Inventory Items"
          actions={<button type="button">Register New Item</button>}
          showNav={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Register New Item' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /inventory module navigation/i })).not.toBeInTheDocument();
  });

  it('can suppress breadcrumb when breadcrumb is null', () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <InventoryPageHeader
          title="Standalone Page"
          breadcrumb={null}
          showNav={false}
        />
      </MemoryRouter>
    );

    expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Standalone Page' })).toBeInTheDocument();
  });
});
