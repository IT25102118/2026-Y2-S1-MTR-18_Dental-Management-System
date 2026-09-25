import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StockStatusBadge, ActiveStatusBadge, MovementTypeBadge } from '../components/InventoryStatusBadge';

describe('InventoryStatusBadge', () => {
  describe('StockStatusBadge', () => {
    it('renders "Out of Stock" when currentQuantity is 0', () => {
      render(<StockStatusBadge currentQuantity={0} lowStock={true} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('badge-out-of-stock');
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('renders "Low Stock" when lowStock is true and currentQuantity > 0', () => {
      render(<StockStatusBadge currentQuantity={5} lowStock={true} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('badge-low-stock');
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });

    it('renders "In Stock" when currentQuantity > 0 and lowStock is false', () => {
      render(<StockStatusBadge currentQuantity={25} lowStock={false} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('badge-in-stock');
      expect(screen.getByText('In Stock')).toBeInTheDocument();
    });
  });

  describe('ActiveStatusBadge', () => {
    it('renders "Active" when active is true', () => {
      render(<ActiveStatusBadge active={true} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('badge-active');
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('renders "Inactive" when active is false', () => {
      render(<ActiveStatusBadge active={false} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('badge-inactive');
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  describe('MovementTypeBadge', () => {
    it('renders RECEIVED with positive flow iconography', () => {
      render(<MovementTypeBadge type="RECEIVED" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('badge-received');
      expect(screen.getByText('Received')).toBeInTheDocument();
    });

    it('renders USED with departure flow iconography', () => {
      render(<MovementTypeBadge type="USED" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('badge-used');
      expect(screen.getByText('Used')).toBeInTheDocument();
    });

    it('renders ADJUSTED label', () => {
      render(<MovementTypeBadge type="ADJUSTED" />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('badge-adjusted');
      expect(screen.getByText('Adjusted')).toBeInTheDocument();
    });
  });
});
