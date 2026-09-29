import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ToothFindingsTable from '../components/ToothFindingsTable';

describe('ToothFindingsTable', () => {
  const sampleFindings = [
    {
      id: 201,
      examinationId: 101,
      toothNumber: 16,
      isGeneral: false,
      conditionName: 'Deep occlusal caries',
      notes: 'Sensitive to percussion and cold stimuli',
      recordedByUserId: 5
    },
    {
      id: 202,
      examinationId: 101,
      toothNumber: null,
      isGeneral: true,
      conditionName: 'Generalized mild gingivitis',
      notes: 'Bleeding on probing in lower anterior sector',
      recordedByUserId: 5
    },
    {
      id: 203,
      examinationId: 101,
      toothNumber: 21,
      isGeneral: false,
      conditionName: 'Enamel micro-fracture',
      notes: null,
      recordedByUserId: 7
    }
  ];

  it('renders empty-state row when findings array is empty or null', () => {
    const { rerender } = render(<ToothFindingsTable findings={[]} onEdit={vi.fn()} />);
    expect(screen.getByText(/no tooth findings recorded/i)).toBeInTheDocument();

    rerender(<ToothFindingsTable findings={null} onEdit={vi.fn()} />);
    expect(screen.getByText(/no tooth findings recorded/i)).toBeInTheDocument();
  });

  it('renders rows with FDI tooth number and General label for general conditions', () => {
    render(<ToothFindingsTable findings={sampleFindings} onEdit={vi.fn()} />);

    const table = screen.getByRole('table', { name: /tooth and oral findings table/i });
    expect(table).toBeInTheDocument();

    // FDI Tooth Number checks
    expect(within(table).getByText('16')).toBeInTheDocument();
    expect(within(table).getByText('21')).toBeInTheDocument();

    // General condition badge
    expect(within(table).getByText('General')).toBeInTheDocument();

    // Conditions
    expect(within(table).getByText('Deep occlusal caries')).toBeInTheDocument();
    expect(within(table).getByText('Generalized mild gingivitis')).toBeInTheDocument();
    expect(within(table).getByText('Enamel micro-fracture')).toBeInTheDocument();

    // Notes
    expect(within(table).getByText('Sensitive to percussion and cold stimuli')).toBeInTheDocument();
    expect(within(table).getByText('Bleeding on probing in lower anterior sector')).toBeInTheDocument();
  });

  it('triggers onEdit callback with finding ID when Edit is clicked', () => {
    const handleEdit = vi.fn();
    render(<ToothFindingsTable findings={sampleFindings} onEdit={handleEdit} />);

    const editButtons = screen.getAllByRole('button', { name: /edit finding/i });
    expect(editButtons).toHaveLength(3);

    fireEvent.click(editButtons[0]);
    expect(handleEdit).toHaveBeenCalledWith(201);

    fireEvent.click(editButtons[1]);
    expect(handleEdit).toHaveBeenCalledWith(202);
  });
});
