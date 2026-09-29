import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProceduresTable from '../components/ProceduresTable';

describe('ProceduresTable', () => {
  const sampleProcedures = [
    {
      id: 501,
      sequenceNumber: 1,
      procedureName: 'Root Canal Therapy',
      procedureCode: 'D3330',
      toothNumber: 46,
      quantity: 1,
      estimatedCost: 800.00,
      status: 'PLANNED'
    },
    {
      id: 502,
      sequenceNumber: 2,
      procedureName: 'Full Mouth Scaling',
      procedureCode: 'D4346',
      toothNumber: null,
      quantity: 1,
      estimatedCost: 180.00,
      status: 'IN_PROGRESS'
    },
    {
      id: 503,
      sequenceNumber: 3,
      procedureName: 'Crown Placement',
      procedureCode: 'D2740',
      toothNumber: 46,
      quantity: 1,
      estimatedCost: 650.00,
      status: 'COMPLETED'
    }
  ];

  it('renders empty-state row when procedures array is empty or null', () => {
    const { rerender } = render(<ProceduresTable procedures={[]} onEdit={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText(/no procedures recorded/i)).toBeInTheDocument();

    rerender(<ProceduresTable procedures={null} onEdit={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText(/no procedures recorded/i)).toBeInTheDocument();
  });

  it('renders procedure rows with tooth number or General badge', () => {
    render(<ProceduresTable procedures={sampleProcedures} onEdit={vi.fn()} onComplete={vi.fn()} />);

    const table = screen.getByRole('table', { name: /treatment procedures table/i });
    expect(table).toBeInTheDocument();

    expect(within(table).getByText('Root Canal Therapy')).toBeInTheDocument();
    expect(within(table).getAllByText('46')).toHaveLength(2);
    expect(within(table).getByText('Planned')).toBeInTheDocument();

    expect(within(table).getByText('Full Mouth Scaling')).toBeInTheDocument();
    expect(within(table).getByText('General')).toBeInTheDocument();
    expect(within(table).getByText('In Progress')).toBeInTheDocument();

    expect(within(table).getByText('Crown Placement')).toBeInTheDocument();
    expect(within(table).getByText('Completed')).toBeInTheDocument();
  });

  it('renders Edit and Complete action buttons only for PLANNED and IN_PROGRESS statuses', () => {
    const handleEdit = vi.fn();
    const handleComplete = vi.fn();

    render(
      <ProceduresTable
        procedures={sampleProcedures}
        onEdit={handleEdit}
        onComplete={handleComplete}
      />
    );

    // Procedure 501 (PLANNED): Edit and Complete present
    expect(screen.getByRole('button', { name: /edit procedure 501/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete procedure 501/i })).toBeInTheDocument();

    // Procedure 502 (IN_PROGRESS): Edit and Complete present
    expect(screen.getByRole('button', { name: /edit procedure 502/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete procedure 502/i })).toBeInTheDocument();

    // Procedure 503 (COMPLETED): Neither present
    expect(screen.queryByRole('button', { name: /edit procedure 503/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete procedure 503/i })).not.toBeInTheDocument();

    // Test clicks
    fireEvent.click(screen.getByRole('button', { name: /edit procedure 501/i }));
    expect(handleEdit).toHaveBeenCalledWith(501);

    fireEvent.click(screen.getByRole('button', { name: /complete procedure 502/i }));
    expect(handleComplete).toHaveBeenCalledWith(502);
  });
});
