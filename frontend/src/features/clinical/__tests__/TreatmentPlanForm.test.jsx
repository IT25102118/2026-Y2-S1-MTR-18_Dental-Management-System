import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TreatmentPlanForm from '../components/TreatmentPlanForm';

describe('TreatmentPlanForm', () => {
  it('renders all required form inputs and client-side validation markers', () => {
    render(<TreatmentPlanForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/patient id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dentist id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/created by user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/examination id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plan title \/ name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total estimated cost/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clinical notes/i)).toBeInTheDocument();
  });

  it('triggers required-field feedback when submitting empty form', () => {
    const handleSubmit = vi.fn();
    render(<TreatmentPlanForm onSubmit={handleSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /save treatment plan/i }));

    expect(screen.getByText('Patient ID is required')).toBeInTheDocument();
    expect(screen.getByText('Dentist ID is required')).toBeInTheDocument();
    expect(screen.getByText('Created-by user ID is required')).toBeInTheDocument();
    expect(screen.getByText('Plan name is required')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('validates positive numeric IDs client-side', () => {
    const handleSubmit = vi.fn();
    render(<TreatmentPlanForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '-2' } });
    fireEvent.change(screen.getByLabelText(/dentist id/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/created by user id/i), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: /save treatment plan/i }));

    expect(screen.getByText('Patient ID must be a positive integer')).toBeInTheDocument();
    expect(screen.getByText('Dentist ID must be a positive integer')).toBeInTheDocument();
    expect(screen.getByText('Created-by user ID must be a positive integer')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits populated form calling onSubmit with normalized values', () => {
    const handleSubmit = vi.fn();
    render(
      <TreatmentPlanForm
        initialValues={{
          patientId: 10,
          dentistId: 4,
          createdByUserId: 4
        }}
        onSubmit={handleSubmit}
        submitLabel="Propose Plan"
      />
    );

    fireEvent.change(screen.getByLabelText(/plan title \/ name/i), {
      target: { value: ' Quadrant Scaling & Curettage ' }
    });
    fireEvent.change(screen.getByLabelText(/total estimated cost/i), {
      target: { value: '350.75' }
    });
    fireEvent.change(screen.getByLabelText(/clinical notes/i), {
      target: { value: ' Treat lower left quadrant first ' }
    });

    fireEvent.click(screen.getByRole('button', { name: /propose plan/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      patientId: 10,
      dentistId: 4,
      examinationId: null,
      createdByUserId: 4,
      planName: 'Quadrant Scaling & Curettage',
      title: 'Quadrant Scaling & Curettage',
      totalEstimatedCost: 350.75,
      estimatedCost: 350.75,
      clinicalNotes: 'Treat lower left quadrant first',
      notes: 'Treat lower left quadrant first'
    });
  });

  it('displays serverError alert when provided', () => {
    render(
      <TreatmentPlanForm
        serverError="Active treatment plan already exists for this patient."
        onSubmit={vi.fn()}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Active treatment plan already exists for this patient.');
  });
});
