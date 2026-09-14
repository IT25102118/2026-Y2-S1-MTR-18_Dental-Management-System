import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TreatmentPlanDetailPage from '../pages/TreatmentPlanDetailPage';
import * as treatmentPlanApi from '../api/treatmentPlanApi';
import * as treatmentProcedureApi from '../api/treatmentProcedureApi';
import * as AuthContextModule from '../../auth/context/AuthContext';

vi.mock('../api/treatmentPlanApi', () => ({
  getTreatmentPlanById: vi.fn(),
  approveTreatmentPlan: vi.fn(),
  startTreatmentPlan: vi.fn(),
  completeTreatmentPlan: vi.fn(),
  cancelTreatmentPlan: vi.fn(),
  setFollowUpDate: vi.fn(),
  ClinicalApiError: class ClinicalApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  }
}));

vi.mock('../api/treatmentProcedureApi', () => ({
  listProceduresByPlan: vi.fn(),
  addTreatmentProcedure: vi.fn(),
  updateTreatmentProcedure: vi.fn(),
  completeTreatmentProcedure: vi.fn(),
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

describe('TreatmentPlanDetailPage', () => {
  const samplePlan = {
    id: 101,
    patientId: 10,
    dentistId: 7,
    createdByUserId: 7,
    planName: 'Comprehensive Restoration',
    totalEstimatedCost: 1200.0,
    totalActualCost: null,
    status: 'PROPOSED',
    clinicalNotes: 'Initial restorative plan for caries',
    examinationId: 42,
    approvedByDentistId: null,
    approvedAt: null,
    cancellationReason: null
  };

  const sampleProcedures = [
    {
      id: 201,
      treatmentPlanId: 101,
      sequenceNumber: 1,
      toothNumber: 36,
      procedureName: 'Amalgam restoration - two surfaces',
      procedureCode: 'D2150',
      estimatedCost: 200.0,
      actualCost: null,
      status: 'PLANNED',
      performedByDentistId: null,
      clinicalProgressNotes: 'Occlusal-mesial'
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  const renderComponent = (id = '101') => {
    return render(
      <MemoryRouter initialEntries={[`/clinical/treatment-plans/${id}`]}>
        <Routes>
          <Route path="/clinical/treatment-plans/:id" element={<TreatmentPlanDetailPage />} />
          <Route path="/clinical/treatment-plans" element={<div>Treatment Plans List Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders treatment plan specifications and associated procedures', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    treatmentPlanApi.getTreatmentPlanById.mockResolvedValueOnce(samplePlan);
    treatmentProcedureApi.listProceduresByPlan.mockResolvedValueOnce(sampleProcedures);

    renderComponent('101');

    expect(screen.getByRole('status')).toHaveTextContent(/loading treatment plan #101/i);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /treatment plan #101/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Comprehensive Restoration')).toBeInTheDocument();
    expect(screen.getByText('Initial restorative plan for caries')).toBeInTheDocument();
    expect(screen.getByText('$1200.00')).toBeInTheDocument();
    expect(screen.getByText('Examination #42')).toBeInTheDocument();

    // Procedure in table
    expect(screen.getByText('Amalgam restoration - two surfaces')).toBeInTheDocument();
    expect(screen.getByText(/D2150/)).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
  });

  it('renders Dentist Actions section when user is a DENTIST and handles Approve action', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    treatmentPlanApi.getTreatmentPlanById.mockResolvedValueOnce(samplePlan);
    treatmentProcedureApi.listProceduresByPlan.mockResolvedValueOnce(sampleProcedures);
    treatmentPlanApi.approveTreatmentPlan.mockResolvedValueOnce({
      ...samplePlan,
      status: 'APPROVED',
      approvedByDentistId: 7,
      approvedAt: '2026-09-14T10:00:00Z'
    });

    renderComponent('101');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dentist actions/i })).toBeInTheDocument();
    });

    const approveBtn = screen.getByRole('button', { name: /approve plan/i });
    expect(approveBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(treatmentPlanApi.approveTreatmentPlan).toHaveBeenCalledWith('101', {
        dentistId: 7
      });
      expect(screen.getByText(/treatment plan approved successfully/i)).toBeInTheDocument();
    });
  });

  it('completely omits Dentist Actions section when user is not a DENTIST', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 12, role: 'RECEPTIONIST' }
    });
    treatmentPlanApi.getTreatmentPlanById.mockResolvedValueOnce(samplePlan);
    treatmentProcedureApi.listProceduresByPlan.mockResolvedValueOnce(sampleProcedures);

    renderComponent('101');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /treatment plan #101/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('heading', { name: /dentist actions/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /set follow-up/i })).not.toBeInTheDocument();
  });

  it('handles cancelling a treatment plan with justification', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    treatmentPlanApi.getTreatmentPlanById.mockResolvedValueOnce(samplePlan);
    treatmentProcedureApi.listProceduresByPlan.mockResolvedValueOnce(sampleProcedures);
    treatmentPlanApi.cancelTreatmentPlan.mockResolvedValueOnce({
      ...samplePlan,
      status: 'CANCELLED',
      cancellationReason: 'Patient relocated out of state'
    });

    renderComponent('101');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel plan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel plan/i }));

    expect(screen.getByRole('heading', { name: /cancel treatment plan/i })).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/provide medical or patient justification/i);
    fireEvent.change(textarea, {
      target: { value: 'Patient relocated out of state' }
    });

    fireEvent.click(screen.getByRole('button', { name: /confirm cancellation/i }));

    await waitFor(() => {
      expect(treatmentPlanApi.cancelTreatmentPlan).toHaveBeenCalledWith('101', {
        dentistId: 7,
        cancellationReason: 'Patient relocated out of state'
      });
      expect(screen.getByText(/treatment plan cancelled/i)).toBeInTheDocument();
    });
  });

  it('handles setting follow-up date and notes', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    treatmentPlanApi.getTreatmentPlanById.mockResolvedValue(samplePlan);
    treatmentProcedureApi.listProceduresByPlan.mockResolvedValue(sampleProcedures);
    treatmentPlanApi.setFollowUpDate.mockResolvedValueOnce({ success: true });

    renderComponent('101');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set follow-up/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /set follow-up/i }));

    expect(screen.getByRole('heading', { name: /schedule plan follow-up/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/follow-up date/i), {
      target: { value: '2026-10-15' }
    });
    fireEvent.change(screen.getByLabelText(/follow-up notes/i), {
      target: { value: 'Post-op restoration review' }
    });

    fireEvent.click(screen.getByRole('button', { name: /save follow-up/i }));

    await waitFor(() => {
      expect(treatmentPlanApi.setFollowUpDate).toHaveBeenCalledWith(
        '101',
        expect.objectContaining({
          followUpDate: '2026-10-15',
          dentistId: 7,
          clinicalNotes: 'Post-op restoration review'
        })
      );
      expect(screen.getByText(/follow-up scheduled successfully/i)).toBeInTheDocument();
    });
  });

  it('allows adding a new procedure calling addTreatmentProcedure', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    treatmentPlanApi.getTreatmentPlanById.mockResolvedValue(samplePlan);
    treatmentProcedureApi.listProceduresByPlan
      .mockResolvedValueOnce(sampleProcedures)
      .mockResolvedValueOnce([
        ...sampleProcedures,
        {
          id: 202,
          treatmentPlanId: 101,
          sequenceNumber: 2,
          toothNumber: 14,
          procedureName: 'Periodic oral evaluation',
          procedureCode: 'D0120',
          estimatedCost: 50.0,
          status: 'PLANNED'
        }
      ]);
    treatmentProcedureApi.addTreatmentProcedure.mockResolvedValueOnce({ id: 202 });

    renderComponent('101');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add procedure/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add procedure/i }));

    expect(screen.getByRole('heading', { name: /add treatment procedure/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/procedure name/i), {
      target: { value: 'Periodic oral evaluation' }
    });
    fireEvent.change(screen.getByLabelText(/procedure code/i), {
      target: { value: 'D0120' }
    });
    fireEvent.change(screen.getByLabelText(/estimated cost/i), {
      target: { value: '50.00' }
    });

    const addForm = screen.getByRole('form', { name: /procedure form/i });
    const submitBtn = within(addForm).getByRole('button', { name: /add procedure/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(treatmentProcedureApi.addTreatmentProcedure).toHaveBeenCalledWith(
        '101',
        expect.objectContaining({
          procedureName: 'Periodic oral evaluation',
          procedureCode: 'D0120',
          estimatedCost: 50
        })
      );
      expect(screen.getByText(/procedure added successfully/i)).toBeInTheDocument();
    });
  });

  it('allows completing an in-progress procedure', async () => {
    const inProgressProcedure = {
      id: 205,
      treatmentPlanId: 101,
      sequenceNumber: 1,
      toothNumber: 46,
      procedureName: 'Crown - porcelain/ceramic substrate',
      procedureCode: 'D2740',
      estimatedCost: 800.0,
      actualCost: null,
      status: 'IN_PROGRESS',
      performedByDentistId: 7
    };

    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    treatmentPlanApi.getTreatmentPlanById.mockResolvedValue(samplePlan);
    treatmentProcedureApi.listProceduresByPlan.mockResolvedValue([inProgressProcedure]);
    treatmentProcedureApi.completeTreatmentProcedure.mockResolvedValueOnce({
      ...inProgressProcedure,
      status: 'COMPLETED',
      actualCost: 850.0
    });

    renderComponent('101');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete procedure 205/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /complete procedure 205/i }));

    expect(screen.getByRole('heading', { name: /complete procedure #205/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/performing dentist id/i), {
      target: { value: '7' }
    });
    fireEvent.change(screen.getByLabelText(/actual cost/i), {
      target: { value: '850.00' }
    });
    fireEvent.change(screen.getByLabelText(/completion date/i), {
      target: { value: '2026-09-14' }
    });
    fireEvent.change(screen.getByLabelText(/progress notes/i), {
      target: { value: 'Crown cemented with resin cement' }
    });

    const completeForm = screen.getByRole('form', { name: /procedure form/i });
    const completeSubmitBtn = within(completeForm).getByRole('button', { name: /complete procedure/i });
    fireEvent.click(completeSubmitBtn);

    await waitFor(() => {
      expect(treatmentProcedureApi.completeTreatmentProcedure).toHaveBeenCalledWith(
        205,
        expect.objectContaining({
          performedByDentistId: 7,
          actualCost: 850,
          completionDate: '2026-09-14',
          clinicalProgressNotes: 'Crown cemented with resin cement'
        })
      );
      expect(screen.getByText(/procedure completed successfully/i)).toBeInTheDocument();
    });
  });

  it('displays 404 state when treatment plan does not exist', async () => {
    AuthContextModule.useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST' }
    });
    const notFoundError = new Error('Treatment plan not found');
    notFoundError.status = 404;
    treatmentPlanApi.getTreatmentPlanById.mockRejectedValueOnce(notFoundError);
    treatmentProcedureApi.listProceduresByPlan.mockResolvedValueOnce([]);

    renderComponent('999');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/treatment plan not found/i);
    });
  });
});
