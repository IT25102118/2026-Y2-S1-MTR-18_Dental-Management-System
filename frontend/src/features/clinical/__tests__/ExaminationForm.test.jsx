import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExaminationForm from '../components/ExaminationForm';

describe('ExaminationForm', () => {
  it('renders all required form inputs and client-side validation markers', () => {
    render(<ExaminationForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/patient id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dentist id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recorded by user id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/appointment id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/examination date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/chief complaint/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clinical observations/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/provisional diagnosis/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clinical notes/i)).toBeInTheDocument();
  });

  it('triggers required-field feedback when submitting empty form', () => {
    const handleSubmit = vi.fn();
    render(<ExaminationForm onSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /save examination/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Patient ID is required')).toBeInTheDocument();
    expect(screen.getByText('Dentist ID is required')).toBeInTheDocument();
    expect(screen.getByText('Recorded-by user ID is required')).toBeInTheDocument();
    expect(screen.getByText('Examination date is required')).toBeInTheDocument();
    expect(screen.getByText('Chief complaint is required')).toBeInTheDocument();

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('validates positive numeric IDs client-side', () => {
    const handleSubmit = vi.fn();
    render(<ExaminationForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/patient id/i), { target: { value: '-5' } });
    fireEvent.change(screen.getByLabelText(/dentist id/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/recorded by user id/i), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: /save examination/i }));

    expect(screen.getByText('Patient ID must be a positive integer')).toBeInTheDocument();
    expect(screen.getByText('Dentist ID must be a positive integer')).toBeInTheDocument();
    expect(screen.getByText('Recorded-by user ID must be a positive integer')).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits populated form calling onSubmit with normalized values', () => {
    const handleSubmit = vi.fn();
    render(
      <ExaminationForm
        initialValues={{
          patientId: 10,
          dentistId: 4,
          recordedByUserId: 4,
          examinationDate: '2026-09-14'
        }}
        onSubmit={handleSubmit}
        submitLabel="Register Examination"
      />
    );

    fireEvent.change(screen.getByLabelText(/chief complaint/i), {
      target: { value: ' Tooth sensitivity to cold ' }
    });
    fireEvent.change(screen.getByLabelText(/clinical observations/i), {
      target: { value: ' Enamel wear on premolars ' }
    });
    fireEvent.change(screen.getByLabelText(/provisional diagnosis/i), {
      target: { value: ' Cervical abrasion ' }
    });
    fireEvent.change(screen.getByLabelText(/clinical notes/i), {
      target: { value: ' Recommend desensitizing toothpaste ' }
    });

    const submitBtn = screen.getByRole('button', { name: /register examination/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledWith({
      patientId: 10,
      dentistId: 4,
      appointmentId: null,
      recordedByUserId: 4,
      examinationDate: '2026-09-14',
      chiefComplaint: 'Tooth sensitivity to cold',
      clinicalObservations: 'Enamel wear on premolars',
      provisionalDiagnosis: 'Cervical abrasion',
      clinicalNotes: 'Recommend desensitizing toothpaste',
      followUpNotes: 'Recommend desensitizing toothpaste'
    });
  });

  it('displays serverError alert when provided', () => {
    render(
      <ExaminationForm
        serverError="Patient #999 was not found in the system."
        onSubmit={vi.fn()}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Patient #999 was not found in the system.');
  });
});
