import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ToothFindingForm from '../components/ToothFindingForm';

describe('ToothFindingForm', () => {
  it('renders form inputs correctly', () => {
    render(<ToothFindingForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/general oral condition/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tooth number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/condition name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/clinical notes/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recorded by user id/i)).toBeInTheDocument();
  });

  it('toggles isGeneral checkbox disabling toothNumber input', () => {
    render(<ToothFindingForm onSubmit={vi.fn()} />);

    const toothInput = screen.getByLabelText(/tooth number/i);
    const generalCheckbox = screen.getByLabelText(/general oral condition/i);

    expect(toothInput).not.toBeDisabled();

    fireEvent.click(generalCheckbox);
    expect(toothInput).toBeDisabled();

    fireEvent.click(generalCheckbox);
    expect(toothInput).not.toBeDisabled();
  });

  it('triggers required-field feedback on empty submission', () => {
    const handleSubmit = vi.fn();
    render(<ToothFindingForm onSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /save finding/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/tooth number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/condition name is required/i)).toBeInTheDocument();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('allows general condition submission without tooth number', () => {
    const handleSubmit = vi.fn();
    render(<ToothFindingForm onSubmit={handleSubmit} />);

    fireEvent.click(screen.getByLabelText(/general oral condition/i));
    fireEvent.change(screen.getByLabelText(/condition name/i), {
      target: { value: 'Halitosis' }
    });
    fireEvent.change(screen.getByLabelText(/clinical notes/i), {
      target: { value: 'Patient reports persistent morning odor' }
    });
    fireEvent.change(screen.getByLabelText(/recorded by user id/i), {
      target: { value: '3' }
    });

    fireEvent.click(screen.getByRole('button', { name: /save finding/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      toothNumber: null,
      isGeneral: true,
      conditionName: 'Halitosis',
      notes: 'Patient reports persistent morning odor',
      recordedByUserId: 3
    });
  });

  it('submits tooth-specific finding with normalized values', () => {
    const handleSubmit = vi.fn();
    render(<ToothFindingForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/tooth number/i), {
      target: { value: '26' }
    });
    fireEvent.change(screen.getByLabelText(/condition name/i), {
      target: { value: ' Secondary Caries ' }
    });
    fireEvent.change(screen.getByLabelText(/recorded by user id/i), {
      target: { value: '5' }
    });

    fireEvent.click(screen.getByRole('button', { name: /save finding/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      toothNumber: 26,
      isGeneral: false,
      conditionName: 'Secondary Caries',
      notes: null,
      recordedByUserId: 5
    });
  });
});
