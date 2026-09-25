import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InventoryFilters from '../components/InventoryFilters';

describe('InventoryFilters', () => {
  it('renders all filter form fields with proper labels and accessible names', () => {
    render(<InventoryFilters filters={{}} onApply={vi.fn()} onReset={vi.fn()} />);

    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/active status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stock level/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reset$/i })).toBeInTheDocument();
  });

  it('submits trimmed values and parsed booleans on form submission', () => {
    const handleApply = vi.fn();
    render(<InventoryFilters filters={{}} onApply={handleApply} onReset={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/search/i), { target: { value: '  composite  ' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: '  Restorative  ' } });
    fireEvent.change(screen.getByLabelText(/active status/i), { target: { value: 'true' } });
    fireEvent.change(screen.getByLabelText(/stock level/i), { target: { value: 'LOW_STOCK' } });

    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    expect(handleApply).toHaveBeenCalledWith({
      search: 'composite',
      category: 'Restorative',
      active: true,
      stockStatus: 'LOW_STOCK'
    });
  });

  it('calls onReset when reset button is clicked', () => {
    const handleReset = vi.fn();
    render(
      <InventoryFilters
        filters={{ search: 'mirror', category: 'Diag', active: false, stockStatus: 'OUT_OF_STOCK' }}
        onApply={vi.fn()}
        onReset={handleReset}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('displays active filter chips and allows removing an individual filter', () => {
    const handleRemoveFilter = vi.fn();
    render(
      <InventoryFilters
        filters={{ search: 'mirror', category: 'Diagnostic', active: true, stockStatus: 'LOW_STOCK' }}
        onApply={vi.fn()}
        onReset={vi.fn()}
        onRemoveFilter={handleRemoveFilter}
      />
    );

    expect(screen.getByTestId('active-filters-bar')).toBeInTheDocument();
    expect(screen.getByText('Search: "mirror"')).toBeInTheDocument();
    expect(screen.getByText('Category: "Diagnostic"')).toBeInTheDocument();
    expect(screen.getByText('Status: Active')).toBeInTheDocument();
    expect(screen.getByText('Stock: Low Stock')).toBeInTheDocument();

    // Click remove search filter button
    const removeSearchBtn = screen.getByRole('button', { name: /remove search filter/i });
    fireEvent.click(removeSearchBtn);

    expect(handleRemoveFilter).toHaveBeenCalledWith('search');
  });

  it('calls onReset when Clear all button in active filters bar is clicked', () => {
    const handleReset = vi.fn();
    render(
      <InventoryFilters
        filters={{ search: 'gauze' }}
        onApply={vi.fn()}
        onReset={handleReset}
      />
    );

    const clearAllBtn = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllBtn);

    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  it('disables form inputs and buttons when disabled prop is true', () => {
    render(<InventoryFilters filters={{}} onApply={vi.fn()} onReset={vi.fn()} disabled={true} />);

    expect(screen.getByLabelText(/search/i)).toBeDisabled();
    expect(screen.getByLabelText(/category/i)).toBeDisabled();
    expect(screen.getByLabelText(/active status/i)).toBeDisabled();
    expect(screen.getByLabelText(/stock level/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /^search$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^reset$/i })).toBeDisabled();
  });
});
