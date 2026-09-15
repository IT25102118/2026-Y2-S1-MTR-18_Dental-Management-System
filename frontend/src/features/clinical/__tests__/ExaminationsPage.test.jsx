import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExaminationsPage from '../pages/ExaminationsPage';
import * as examinationApi from '../api/examinationApi';
import * as AuthContextModule from '../../auth/context/AuthContext';

vi.mock('../api/examinationApi', () => ({
  listExaminationsByPatient: vi.fn(),
  createExamination: vi.fn(),
  ClinicalApiError: class ClinicalApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 7, role: 'DENTIST' }
  }))
}));

describe('ExaminationsPage', () => {
  const sampleExaminations = [
    {
      id: 1,
      patientId: 10,
      dentistId: 7,
      recordedByUserId: 7,
      examinationDate: '2026-09-10',
      chiefComplaint: 'Toothache on upper right premolar',
      status: 'DRAFT'
    },
    {
      id: 2,
      patientId: 10,
      dentistId: 7,
      recordedByUserId: 7,
      examinationDate: '2026-09-12',
      chiefComplaint: 'Checkup after trauma',
      status: 'COMPLETED'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prompts user to enter patient ID when query parameter is absent', () => {
    render(
      <MemoryRouter initialEntries={['/clinical/examinations']}>
        <ExaminationsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/please enter a patient id above/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter patient id/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
    expect(examinationApi.listExaminationsByPatient).not.toHaveBeenCalled();
  });

  it('loads and renders examinations for patient in URL query parameter', async () => {
    examinationApi.listExaminationsByPatient.mockResolvedValueOnce(sampleExaminations);

    render(
      <MemoryRouter initialEntries={['/clinical/examinations?patientId=10']}>
        <ExaminationsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading examinations/i);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /examinations for patient #10/i })).toBeInTheDocument();
    });

    expect(examinationApi.listExaminationsByPatient).toHaveBeenCalledWith('10');
    expect(screen.getByText('Toothache on upper right premolar')).toBeInTheDocument();
    expect(screen.getByText('Checkup after trauma')).toBeInTheDocument();
  });

  it('renders empty table message when patient has no examinations', async () => {
    examinationApi.listExaminationsByPatient.mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/clinical/examinations?patientId=99']}>
        <ExaminationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no examinations found/i)).toBeInTheDocument();
    });
  });

  it('displays error alert when API call fails', async () => {
    examinationApi.listExaminationsByPatient.mockRejectedValueOnce(
      new Error('Failed to retrieve examinations from server.')
    );

    render(
      <MemoryRouter initialEntries={['/clinical/examinations?patientId=10']}>
        <ExaminationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to retrieve examinations from server.');
    });
  });

  it('allows opening inline form and creating a new examination', async () => {
    examinationApi.listExaminationsByPatient.mockResolvedValue(sampleExaminations);
    examinationApi.createExamination.mockResolvedValueOnce({
      id: 3,
      patientId: 10,
      dentistId: 7,
      status: 'DRAFT'
    });

    render(
      <MemoryRouter initialEntries={['/clinical/examinations?patientId=10']}>
        <ExaminationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create examination/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create examination/i }));

    expect(screen.getByRole('heading', { name: /record new clinical examination/i })).toBeInTheDocument();

    // Fill form fields
    fireEvent.change(screen.getByLabelText(/examination date/i), {
      target: { value: '2026-09-14' }
    });
    fireEvent.change(screen.getByLabelText(/chief complaint/i), {
      target: { value: 'Pain during chewing' }
    });

    // Submit form
    const formSubmitBtn = within(screen.getByTestId('examinations-page-placeholder'))
      .getByRole('button', { name: /create examination/i });
    fireEvent.click(formSubmitBtn);

    await waitFor(() => {
      expect(examinationApi.createExamination).toHaveBeenCalled();
      expect(screen.getByText(/examination created successfully/i)).toBeInTheDocument();
    });
  });
});
