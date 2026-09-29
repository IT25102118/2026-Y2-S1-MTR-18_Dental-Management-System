import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProcedureForm from '../components/ProcedureForm';

describe('ProcedureForm', () => {
  it('renders add mode inputs and validates required fields', () => {
    const handleSubmit = vi.fn();
    render(<ProcedureForm mode="add" onSubmit={handleSubmit} />);

    expect(screen.getByLabelText(/procedure name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/procedure code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tooth number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sequence number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/estimated cost/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add procedure/i }));

    expect(screen.getByText('Procedure name is required')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits valid procedure in add mode with normalized values', () => {
    const handleSubmit = vi.fn();
    render(<ProcedureForm mode="add" onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/procedure name/i), {
      target: { value: ' Composite Filling ' }
    });
    fireEvent.change(screen.getByLabelText(/procedure code/i), {
      target: { value: ' D2391 ' }
    });
    fireEvent.change(screen.getByLabelText(/tooth number/i), {
      target: { value: '36' }
    });
    fireEvent.change(screen.getByLabelText(/sequence number/i), {
      target: { value: '2' }
    });
    fireEvent.change(screen.getByLabelText(/quantity/i), {
      target: { value: '1' }
    });
    fireEvent.change(screen.getByLabelText(/estimated cost/i), {
      target: { value: '220.00' }
    });
    fireEvent.change(screen.getByLabelText(/clinical progress notes/i), {
      target: { value: 'Occlusal cavity' }
    });

    fireEvent.click(screen.getByRole('button', { name: /add procedure/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      procedureName: 'Composite Filling',
      procedureCode: 'D2391',
      toothNumber: 36,
      sequenceNumber: 2,
      quantity: 1,
      estimatedCost: 220.00,
      unitCost: 220.00,
      clinicalProgressNotes: 'Occlusal cavity'
    });
  });

  it('renders complete mode fields and validates performing dentist ID', () => {
    const handleSubmit = vi.fn();
    render(<ProcedureForm mode="complete" onSubmit={handleSubmit} />);

    expect(screen.getByLabelText(/performing dentist id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/assisting user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/completion date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/actual cost/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /complete procedure/i }));

    expect(screen.getByText('Performing dentist ID is required')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits valid completion in complete mode with normalized values', () => {
    const handleSubmit = vi.fn();
    render(
      <ProcedureForm
        mode="complete"
        initialValues={{ performedByDentistId: 7 }}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/completion date/i), {
      target: { value: '2026-09-14' }
    });
    fireEvent.change(screen.getByLabelText(/actual cost/i), {
      target: { value: '225.50' }
    });
    fireEvent.change(screen.getByLabelText(/clinical progress notes/i), {
      target: { value: 'Procedure completed without complications' }
    });

    fireEvent.click(screen.getByRole('button', { name: /complete procedure/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      performedByDentistId: 7,
      dentistId: 7,
      assistedByUserId: null,
      completionDate: '2026-09-14',
      actualCost: 225.50,
      clinicalProgressNotes: 'Procedure completed without complications',
      notes: 'Procedure completed without complications'
    });
  });
});
