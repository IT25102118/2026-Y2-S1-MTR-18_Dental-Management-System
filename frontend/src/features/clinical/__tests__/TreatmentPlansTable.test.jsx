import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TreatmentPlansTable from '../components/TreatmentPlansTable';

describe('TreatmentPlansTable', () => {
  const samplePlans = [
    {
      id: 10,
      patientId: 25,
      dentistId: 3,
      planName: 'Molar Endo & Crown Plan',
      status: 'PROPOSED',
      totalEstimatedCost: 1250.00
    },
    {
      id: 11,
      patientId: 25,
      dentistId: 3,
      planName: 'Periodontal Maintenance Plan',
      status: 'IN_PROGRESS',
      totalEstimatedCost: 450.50
    },
    {
      id: 12,
      patientId: 25,
      dentistId: 5,
      planName: 'Arch Reconstruction',
      status: 'CANCELLED',
      totalEstimatedCost: 3200.00
    }
  ];

  it('renders empty-state row when plans array is empty or undefined', () => {
    const { rerender } = render(<TreatmentPlansTable plans={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/no treatment plans found/i)).toBeInTheDocument();

    rerender(<TreatmentPlansTable plans={undefined} onSelect={vi.fn()} />);
    expect(screen.getByText(/no treatment plans found/i)).toBeInTheDocument();
  });

  it('renders table headers and rows from fixture data', () => {
    render(<TreatmentPlansTable plans={samplePlans} onSelect={vi.fn()} />);

    const table = screen.getByRole('table', { name: /treatment plans table/i });
    expect(table).toBeInTheDocument();

    // Headers
    expect(within(table).getByText('Title')).toBeInTheDocument();
    expect(within(table).getByText('Patient ID')).toBeInTheDocument();
    expect(within(table).getByText('Dentist ID')).toBeInTheDocument();
    expect(within(table).getByText('Status')).toBeInTheDocument();
    expect(within(table).getByText('Estimated Cost')).toBeInTheDocument();
    expect(within(table).getByText('Actions')).toBeInTheDocument();

    // Rows
    expect(within(table).getByText('Molar Endo & Crown Plan')).toBeInTheDocument();
    expect(within(table).getByText('Proposed')).toBeInTheDocument();
    expect(within(table).getByText('$1250.00')).toBeInTheDocument();

    expect(within(table).getByText('Periodontal Maintenance Plan')).toBeInTheDocument();
    expect(within(table).getByText('In Progress')).toBeInTheDocument();
    expect(within(table).getByText('$450.50')).toBeInTheDocument();

    expect(within(table).getByText('Arch Reconstruction')).toBeInTheDocument();
    expect(within(table).getByText('Cancelled')).toBeInTheDocument();
  });

  it('triggers onSelect with correct plan ID when View is clicked', () => {
    const handleSelect = vi.fn();
    render(<TreatmentPlansTable plans={samplePlans} onSelect={handleSelect} />);

    const viewButtons = screen.getAllByRole('button', { name: /view treatment plan/i });
    expect(viewButtons).toHaveLength(3);

    fireEvent.click(viewButtons[0]);
    expect(handleSelect).toHaveBeenCalledWith(10);

    fireEvent.click(viewButtons[1]);
    expect(handleSelect).toHaveBeenCalledWith(11);
  });
});
