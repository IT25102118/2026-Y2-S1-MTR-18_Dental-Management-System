import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TreatmentPlanStatusBadge from '../components/TreatmentPlanStatusBadge';

describe('TreatmentPlanStatusBadge', () => {
  it('renders Proposed badge for PROPOSED status', () => {
    render(<TreatmentPlanStatusBadge status="PROPOSED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Proposed');
    expect(badge).toHaveClass('badge', 'badge-proposed');
  });

  it('renders Approved badge for APPROVED status', () => {
    render(<TreatmentPlanStatusBadge status="APPROVED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Approved');
    expect(badge).toHaveClass('badge', 'badge-approved');
  });

  it('renders In Progress badge for IN_PROGRESS status', () => {
    render(<TreatmentPlanStatusBadge status="IN_PROGRESS" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('In Progress');
    expect(badge).toHaveClass('badge', 'badge-in-progress');
  });

  it('renders Completed badge for COMPLETED status', () => {
    render(<TreatmentPlanStatusBadge status="COMPLETED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Completed');
    expect(badge).toHaveClass('badge', 'badge-completed');
  });

  it('renders Cancelled badge for CANCELLED status', () => {
    render(<TreatmentPlanStatusBadge status="CANCELLED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Cancelled');
    expect(badge).toHaveClass('badge', 'badge-cancelled');
  });

  it('renders default Proposed badge when status prop is omitted', () => {
    render(<TreatmentPlanStatusBadge />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Proposed');
    expect(badge).toHaveClass('badge', 'badge-proposed');
  });

  it('renders neutral badge-unknown for unrecognized status without throwing', () => {
    render(<TreatmentPlanStatusBadge status="CUSTOM_VAL" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('CUSTOM_VAL');
    expect(badge).toHaveClass('badge', 'badge-unknown');
  });
});
