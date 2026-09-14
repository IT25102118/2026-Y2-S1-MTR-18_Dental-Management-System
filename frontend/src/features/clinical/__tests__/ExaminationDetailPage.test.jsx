import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExaminationDetailPage from '../pages/ExaminationDetailPage';
import * as examinationApi from '../api/examinationApi';
import * as toothFindingApi from '../api/toothFindingApi';
import * as AuthContextModule from '../../auth/context/AuthContext';

vi.mock('../api/examinationApi', () => ({
  getExaminationById: vi.fn(),
  confirmDiagnosis: vi.fn(),
  ClinicalApiError: class ClinicalApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
}));

vi.mock('../api/toothFindingApi', () => ({
  listToothFindingsByExamination: vi.fn(),
  addToothFinding: vi.fn(),
  updateToothFinding: vi.fn(),
  ClinicalApiError: class ClinicalApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
}));

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('ExaminationDetailPage', () => {
  const sampleExam = {
    id: 42,
    patientId: 10,
    dentistId: 7,
    recordedByUserId: 7,
    examinationDate: '2026-09-12',
    chiefComplaint: 'Sharp pain in lower left molar',
    clinicalObservations: 'Deep pit on tooth 36 with plaque accumulation',
    provisionalDiagnosis: 'Reversible pulpitis',
    confirmedDiagnosis: null,
    isDiagnosisConfirmed: false,
    status: 'DRAFT'
  };

  const sampleFindings = [
    {
      id: 101,
      examinationId: 42,
      toothNumber: 36,
      isGeneral: false,
      conditionName: 'Dental Caries',
      notes: 'Occlusal cavity',
      recordedByUserId: 7
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (id = '42') => {
    return render(
      <MemoryRouter initialEntries={[`/clinical/examinations/${id}`]}>
        <Routes>
          <Route path="/clinical/examinations/:id" element={<ExaminationDetailPage />} />
          <Route path="/clinical/examinations" element={<div>Examinations List Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders examination details and tooth findings', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    examinationApi.getExaminationById.mockResolvedValueOnce(sampleExam);
    toothFindingApi.listToothFindingsByExamination.mockResolvedValueOnce(sampleFindings);

    renderComponent('42');

    expect(screen.getByRole('status')).toHaveTextContent(/loading examination #42/i);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /examination #42/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Sharp pain in lower left molar')).toBeInTheDocument();
    expect(screen.getByText('Deep pit on tooth 36 with plaque accumulation')).toBeInTheDocument();
    expect(screen.getByText('Reversible pulpitis')).toBeInTheDocument();

    // Tooth finding in table
    expect(screen.getByText('Dental Caries')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
  });

  it('renders Confirm Diagnosis section when user is a DENTIST', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    examinationApi.getExaminationById.mockResolvedValueOnce(sampleExam);
    toothFindingApi.listToothFindingsByExamination.mockResolvedValueOnce(sampleFindings);
    examinationApi.confirmDiagnosis.mockResolvedValueOnce({
      ...sampleExam,
      status: 'COMPLETED',
      confirmedDiagnosis: 'Acute reversible pulpitis in tooth 36',
      isDiagnosisConfirmed: true,
      confirmedByDentistId: 7
    });

    renderComponent('42');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /confirm diagnosis \(licensed dentist only\)/i })).toBeInTheDocument();
    });

    const diagnosisTextarea = screen.getByLabelText(/confirmed diagnosis/i);
    expect(diagnosisTextarea).toBeInTheDocument();

    fireEvent.change(diagnosisTextarea, {
      target: { value: 'Acute reversible pulpitis in tooth 36' }
    });

    fireEvent.click(screen.getByRole('button', { name: /confirm diagnosis/i }));

    await waitFor(() => {
      expect(examinationApi.confirmDiagnosis).toHaveBeenCalledWith('42', {
        dentistId: 7,
        confirmedDiagnosis: 'Acute reversible pulpitis in tooth 36'
      });
      expect(screen.getByText(/clinical diagnosis confirmed successfully/i)).toBeInTheDocument();
    });
  });

  it('completely omits Confirm Diagnosis section when user is not a DENTIST', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 12, role: 'RECEPTIONIST' }
    });
    examinationApi.getExaminationById.mockResolvedValueOnce(sampleExam);
    toothFindingApi.listToothFindingsByExamination.mockResolvedValueOnce(sampleFindings);

    renderComponent('42');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /examination #42/i })).toBeInTheDocument();
    });

    // Verify Confirm Diagnosis section is completely NOT rendered in DOM
    expect(screen.queryByRole('heading', { name: /confirm diagnosis/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/confirmed diagnosis/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm diagnosis/i })).not.toBeInTheDocument();
  });

  it('allows adding a new tooth finding calling addToothFinding', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    examinationApi.getExaminationById.mockResolvedValueOnce(sampleExam);
    toothFindingApi.listToothFindingsByExamination
      .mockResolvedValueOnce(sampleFindings)
      .mockResolvedValueOnce([
        ...sampleFindings,
        {
          id: 102,
          examinationId: 42,
          toothNumber: null,
          isGeneral: true,
          conditionName: 'Marginal gingivitis',
          notes: 'Localized to lower incisors',
          recordedByUserId: 7
        }
      ]);
    toothFindingApi.addToothFinding.mockResolvedValueOnce({ id: 102 });

    renderComponent('42');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add tooth finding/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add tooth finding/i }));

    expect(screen.getByRole('heading', { name: /record tooth \/ general oral finding/i })).toBeInTheDocument();

    // Check general oral condition
    fireEvent.click(screen.getByLabelText(/general oral condition/i));
    fireEvent.change(screen.getByLabelText(/condition name/i), {
      target: { value: 'Marginal gingivitis' }
    });
    fireEvent.change(screen.getByLabelText(/clinical notes/i), {
      target: { value: 'Localized to lower incisors' }
    });

    fireEvent.click(screen.getByRole('button', { name: /save finding/i }));

    await waitFor(() => {
      expect(toothFindingApi.addToothFinding).toHaveBeenCalledWith('42', {
        toothNumber: null,
        isGeneral: true,
        conditionName: 'Marginal gingivitis',
        notes: 'Localized to lower incisors',
        recordedByUserId: 7
      });
      expect(screen.getByText(/tooth finding recorded successfully/i)).toBeInTheDocument();
    });
  });

  it('displays 404 state when examination does not exist', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    const notFoundError = new Error('Examination not found');
    notFoundError.status = 404;
    examinationApi.getExaminationById.mockRejectedValueOnce(notFoundError);
    toothFindingApi.listToothFindingsByExamination.mockResolvedValueOnce([]);

    renderComponent('999');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/examination not found/i);
    });
  });
});
