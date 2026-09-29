import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExaminationsTable from '../components/ExaminationsTable';

describe('ExaminationsTable', () => {
  const sampleExaminations = [
    {
      id: 101,
      patientId: 42,
      dentistId: 7,
      recordedByUserId: 7,
      examinationDate: '2026-09-10',
      chiefComplaint: 'Severe toothache on upper right molar',
      status: 'DRAFT'
    },
    {
      id: 102,
      patientId: 42,
      dentistId: 7,
      recordedByUserId: 7,
      examinationDate: '2026-09-12',
      chiefComplaint: 'Routine 6-month checkup and cleaning',
      status: 'COMPLETED'
    },
    {
      id: 103,
      patientId: 42,
      dentistId: 9,
      recordedByUserId: 9,
      examinationDate: '2026-09-13',
      chiefComplaint: 'Broken front tooth filling from accident',
      status: 'CANCELLED'
    }
  ];

  it('renders empty-state row when array is empty or undefined', () => {
    const { rerender } = render(<ExaminationsTable examinations={[]} onSelect={vi.fn()} />);
    expect(screen.getByText(/no examinations found/i)).toBeInTheDocument();

    rerender(<ExaminationsTable examinations={undefined} onSelect={vi.fn()} />);
    expect(screen.getByText(/no examinations found/i)).toBeInTheDocument();
  });

  it('renders table headers and N rows from fixture array', () => {
    render(<ExaminationsTable examinations={sampleExaminations} onSelect={vi.fn()} />);

    const table = screen.getByRole('table', { name: /clinical examinations table/i });
    expect(table).toBeInTheDocument();

    // Check headers
    expect(within(table).getByText('Date')).toBeInTheDocument();
    expect(within(table).getByText('Patient ID')).toBeInTheDocument();
    expect(within(table).getByText('Dentist ID')).toBeInTheDocument();
    expect(within(table).getByText('Chief Complaint')).toBeInTheDocument();
    expect(within(table).getByText('Status')).toBeInTheDocument();
    expect(within(table).getByText('Actions')).toBeInTheDocument();

    // Check row data
    expect(within(table).getByText('2026-09-10')).toBeInTheDocument();
    expect(within(table).getByText('Severe toothache on upper right molar')).toBeInTheDocument();
    expect(within(table).getByText('Draft')).toBeInTheDocument();

    expect(within(table).getByText('2026-09-12')).toBeInTheDocument();
    expect(within(table).getByText('Routine 6-month checkup and cleaning')).toBeInTheDocument();
    expect(within(table).getByText('Completed')).toBeInTheDocument();

    expect(within(table).getByText('2026-09-13')).toBeInTheDocument();
    expect(within(table).getByText('Cancelled')).toBeInTheDocument();
  });

  it('triggers onSelect with the correct examination ID when View is clicked', () => {
    const handleSelect = vi.fn();
    render(<ExaminationsTable examinations={sampleExaminations} onSelect={handleSelect} />);

    const viewButtons = screen.getAllByRole('button', { name: /view examination/i });
    expect(viewButtons).toHaveLength(3);

    fireEvent.click(viewButtons[0]);
    expect(handleSelect).toHaveBeenCalledWith(101);

    fireEvent.click(viewButtons[1]);
    expect(handleSelect).toHaveBeenCalledWith(102);
  });
});
