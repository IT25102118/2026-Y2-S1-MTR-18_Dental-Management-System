import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TreatmentPlansPage from '../pages/TreatmentPlansPage';
import * as treatmentPlanApi from '../api/treatmentPlanApi';
import * as AuthContextModule from '../../auth/context/AuthContext';

vi.mock('../api/treatmentPlanApi', () => ({
  listTreatmentPlansByPatient: vi.fn(),
  createTreatmentPlan: vi.fn(),
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

describe('TreatmentPlansPage', () => {
  const samplePlans = [
    {
      id: 101,
      patientId: 10,
      dentistId: 7,
      createdByUserId: 7,
      planName: 'Comprehensive Restoration',
      totalEstimatedCost: 1200.0,
      totalActualCost: 1200.0,
      status: 'APPROVED'
    },
    {
      id: 102,
      patientId: 10,
      dentistId: 7,
      createdByUserId: 7,
      planName: 'Root Canal Therapy',
      totalEstimatedCost: 850.0,
      totalActualCost: null,
      status: 'PROPOSED'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prompts user to enter patient ID when query parameter is absent', () => {
    render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans']}>
        <TreatmentPlansPage />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/please enter a patient id above and click load to view treatment plans/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter patient id/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /load/i })).toBeInTheDocument();
    expect(treatmentPlanApi.listTreatmentPlansByPatient).not.toHaveBeenCalled();
  });

  it('loads and renders treatment plans for patient in URL query parameter', async () => {
    treatmentPlanApi.listTreatmentPlansByPatient.mockResolvedValueOnce(samplePlans);

    render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans?patientId=10']}>
        <TreatmentPlansPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent(/loading treatment plans/i);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /treatment plans for patient #10/i })
      ).toBeInTheDocument();
    });

    expect(treatmentPlanApi.listTreatmentPlansByPatient).toHaveBeenCalledWith('10');
    expect(screen.getByText('Comprehensive Restoration')).toBeInTheDocument();
    expect(screen.getByText('Root Canal Therapy')).toBeInTheDocument();
  });

  it('renders empty table message when patient has no treatment plans', async () => {
    treatmentPlanApi.listTreatmentPlansByPatient.mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans?patientId=99']}>
        <TreatmentPlansPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no treatment plans found/i)).toBeInTheDocument();
    });
  });

  it('displays error alert when API call fails', async () => {
    treatmentPlanApi.listTreatmentPlansByPatient.mockRejectedValueOnce(
      new Error('Failed to retrieve plans from server.')
    );

    render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans?patientId=10']}>
        <TreatmentPlansPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to retrieve plans from server.');
    });
  });

  it('allows opening inline form and creating a new treatment plan', async () => {
    treatmentPlanApi.listTreatmentPlansByPatient.mockResolvedValue(samplePlans);
    treatmentPlanApi.createTreatmentPlan.mockResolvedValueOnce({
      id: 103,
      patientId: 10,
      planName: 'Invisalign Alignment',
      status: 'PROPOSED'
    });

    render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans?patientId=10']}>
        <TreatmentPlansPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create treatment plan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /create treatment plan/i }));

    expect(
      screen.getByRole('heading', { name: /propose new treatment plan/i })
    ).toBeInTheDocument();

    // Fill form fields
    fireEvent.change(screen.getByLabelText(/plan title/i), {
      target: { value: 'Invisalign Alignment' }
    });
    fireEvent.change(screen.getByLabelText(/total estimated cost/i), {
      target: { value: '1500.00' }
    });
    fireEvent.change(screen.getByLabelText(/clinical notes/i), {
      target: { value: 'Full orthodontic correction' }
    });

    // Submit form
    const formSubmitBtn = within(screen.getByTestId('treatment-plans-page-placeholder'))
      .getByRole('button', { name: /propose plan/i });
    fireEvent.click(formSubmitBtn);

    await waitFor(() => {
      expect(treatmentPlanApi.createTreatmentPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 10,
          dentistId: 7,
          planName: 'Invisalign Alignment',
          totalEstimatedCost: 1500,
          clinicalNotes: 'Full orthodontic correction'
        })
      );
      expect(screen.getByText(/treatment plan proposed successfully/i)).toBeInTheDocument();
    });
  });
});
