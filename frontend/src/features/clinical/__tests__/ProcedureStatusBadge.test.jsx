import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProcedureStatusBadge from '../components/ProcedureStatusBadge';

describe('ProcedureStatusBadge', () => {
  it('renders Planned badge for PLANNED status', () => {
    render(<ProcedureStatusBadge status="PLANNED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Planned');
    expect(badge).toHaveClass('badge', 'badge-planned');
  });

  it('renders In Progress badge for IN_PROGRESS status', () => {
    render(<ProcedureStatusBadge status="IN_PROGRESS" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('In Progress');
    expect(badge).toHaveClass('badge', 'badge-in-progress');
  });

  it('renders Completed badge for COMPLETED status', () => {
    render(<ProcedureStatusBadge status="COMPLETED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Completed');
    expect(badge).toHaveClass('badge', 'badge-completed');
  });

  it('renders Cancelled badge for CANCELLED status', () => {
    render(<ProcedureStatusBadge status="CANCELLED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Cancelled');
    expect(badge).toHaveClass('badge', 'badge-cancelled');
  });

  it('renders default Planned badge when status prop is omitted', () => {
    render(<ProcedureStatusBadge />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Planned');
    expect(badge).toHaveClass('badge', 'badge-planned');
  });

  it('renders neutral badge-unknown for unrecognized status without throwing', () => {
    render(<ProcedureStatusBadge status="UNKNOWN_STAT" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('UNKNOWN_STAT');
    expect(badge).toHaveClass('badge', 'badge-unknown');
  });
});
