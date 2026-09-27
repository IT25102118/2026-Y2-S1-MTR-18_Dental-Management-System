import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import InventoryPagination from '../components/InventoryPagination';

describe('InventoryPagination', () => {
  it('returns null when totalElements is 0 in unpacked props', () => {
    const { container } = render(
      <InventoryPagination
        page={0}
        totalPages={0}
        totalElements={0}
        onPageChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when totalElements is 0 in pageInfo prop', () => {
    const { container } = render(
      <InventoryPagination
        pageInfo={{
          number: 0,
          totalPages: 0,
          totalElements: 0,
          first: true,
          last: true
        }}
        onPageChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders and handles page changes with unpacked props', () => {
    const onPageChange = vi.fn();
    render(
      <InventoryPagination
        page={0}
        totalPages={3}
        totalElements={45}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText(/Page/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/45 total items/i)).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /previous/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('renders and handles page changes with pageInfo object (regression test)', () => {
    const onPageChange = vi.fn();
    render(
      <InventoryPagination
        pageInfo={{
          number: 1,
          totalPages: 5,
          totalElements: 100,
          first: false,
          last: false
        }}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/100 total items/i)).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /previous/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(prevBtn);
    expect(onPageChange).toHaveBeenCalledWith(0);

    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables next button on last page with pageInfo', () => {
    const onPageChange = vi.fn();
    render(
      <InventoryPagination
        pageInfo={{
          number: 4,
          totalPages: 5,
          totalElements: 100,
          first: false,
          last: true
        }}
        onPageChange={onPageChange}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /previous/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).toBeDisabled();

    fireEvent.click(nextBtn);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('disables all buttons when disabled prop is true', () => {
    const onPageChange = vi.fn();
    render(
      <InventoryPagination
        pageInfo={{
          number: 1,
          totalPages: 3,
          totalElements: 60,
          first: false,
          last: false
        }}
        disabled={true}
        onPageChange={onPageChange}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /previous/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });

  it('handles single page datasets without error and disables both buttons', () => {
    const onPageChange = vi.fn();
    render(
      <InventoryPagination
        pageInfo={{
          number: 0,
          totalPages: 1,
          totalElements: 12,
          first: true,
          last: true
        }}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getByText(/12 total items/i)).toBeInTheDocument();

    const prevBtn = screen.getByRole('button', { name: /previous/i });
    const nextBtn = screen.getByRole('button', { name: /next/i });

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeDisabled();
  });
});
