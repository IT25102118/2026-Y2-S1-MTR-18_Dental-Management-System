import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ExaminationsPage from '../pages/ExaminationsPage';
import ExaminationDetailPage from '../pages/ExaminationDetailPage';
import TreatmentPlansPage from '../pages/TreatmentPlansPage';
import TreatmentPlanDetailPage from '../pages/TreatmentPlanDetailPage';

vi.mock('../../auth/context/AuthContext', () => ({
  useAuth: vi.fn()
}));

import { useAuth } from '../../auth/context/AuthContext';
import { clearCsrfToken } from '../../auth/api/authApi';

function mockJsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 201 ? 'Created' : status === 409 ? 'Conflict' : 'Error',
    headers: {
      get: (header) => (header.toLowerCase() === 'content-type' ? 'application/json' : null)
    },
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
}

function TestNavigator() {
  const navigate = useNavigate();
  return (
    <button
      data-testid="test-nav-to-plans"
      type="button"
      style={{ display: 'none' }}
      onClick={() => navigate('/clinical/treatment-plans?patientId=10')}
    >
      Nav to Plans
    </button>
  );
}

function renderWorkflowApp(initialRoute = '/clinical/examinations?patientId=10') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <TestNavigator />
      <Routes>
        <Route path="/clinical/examinations" element={<ExaminationsPage />} />
        <Route path="/clinical/examinations/:id" element={<ExaminationDetailPage />} />
        <Route path="/clinical/treatment-plans" element={<TreatmentPlansPage />} />
        <Route path="/clinical/treatment-plans/:id" element={<TreatmentPlanDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Clinical workflow integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    clearCsrfToken();
    useAuth.mockReturnValue({
      user: { id: 7, role: 'DENTIST', firstName: 'Sarah', lastName: 'Connor' },
      isAuthenticated: true,
      isLoading: false,
      isError: false,
      error: null
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('completes the full examination → plan → completion journey', async () => {
    let examState = {
      id: 42,
      patientId: 10,
      dentistId: 7,
      recordedByUserId: 7,
      examinationDate: '2026-09-14',
      chiefComplaint: 'Severe toothache on tooth 36',
      clinicalObservations: 'Deep pit on occlusal surface of 36',
      provisionalDiagnosis: 'Pulpitis',
      confirmedDiagnosis: null,
      isDiagnosisConfirmed: false,
      status: 'DRAFT'
    };

    let findingsList = [];

    let plansList = [];

    let planState = {
      id: 201,
      patientId: 10,
      dentistId: 7,
      createdByUserId: 7,
      planName: 'Root Canal and Crown Therapy',
      totalEstimatedCost: 1200.0,
      totalActualCost: null,
      status: 'PROPOSED',
      clinicalNotes: 'Complete endodontic therapy and porcelain crown',
      examinationId: 42,
      approvedByDentistId: null,
      approvedAt: null,
      cancellationReason: null
    };

    let proceduresList = [];

    global.fetch = vi.fn(async (url, options = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      const urlString = String(url);
      const [path] = urlString.split('?');

      // 0. CSRF token endpoint
      if (path === '/api/auth/csrf' && method === 'GET') {
        return mockJsonResponse({
          token: 'workflow-csrf-token',
          headerName: 'X-XSRF-TOKEN',
          parameterName: '_csrf'
        });
      }

      // 1. Examinations listing
      if (path === '/api/clinical/examinations' && method === 'GET') {
        return mockJsonResponse([examState]);
      }

      // 2. Examination detail
      if (path === '/api/clinical/examinations/42' && method === 'GET') {
        return mockJsonResponse(examState);
      }

      // 3. Tooth findings list
      if (path === '/api/clinical/examinations/42/tooth-findings' && method === 'GET') {
        return mockJsonResponse(findingsList);
      }

      // 4. Add tooth finding
      if (path === '/api/clinical/examinations/42/tooth-findings' && method === 'POST') {
        const payload = JSON.parse(options.body);
        const newFinding = {
          id: 101,
          examinationId: 42,
          toothNumber: payload.toothNumber,
          isGeneral: payload.isGeneral,
          conditionName: payload.conditionName,
          notes: payload.notes,
          recordedByUserId: payload.recordedByUserId || 7
        };
        findingsList = [...findingsList, newFinding];
        return mockJsonResponse(newFinding, 201);
      }

      // 5. Confirm diagnosis
      if (path === '/api/clinical/examinations/42/confirm-diagnosis' && method === 'POST') {
        const payload = JSON.parse(options.body);
        examState = {
          ...examState,
          confirmedDiagnosis: payload.confirmedDiagnosis,
          confirmedByDentistId: payload.dentistId,
          isDiagnosisConfirmed: true,
          status: 'COMPLETED'
        };
        return mockJsonResponse(examState, 200);
      }

      // 6. Treatment plans listing
      if (path === '/api/clinical/treatment-plans' && method === 'GET') {
        return mockJsonResponse(plansList);
      }

      // 7. Create treatment plan
      if (path === '/api/clinical/treatment-plans' && method === 'POST') {
        const payload = JSON.parse(options.body);
        const newPlan = {
          id: 201,
          patientId: payload.patientId,
          dentistId: payload.dentistId,
          createdByUserId: payload.createdByUserId || 7,
          planName: payload.planName || payload.title,
          totalEstimatedCost: Number(payload.totalEstimatedCost || payload.estimatedCost || 0),
          totalActualCost: null,
          status: 'PROPOSED',
          clinicalNotes: payload.clinicalNotes || payload.notes || ''
        };
        plansList = [...plansList, newPlan];
        planState = newPlan;
        return mockJsonResponse(newPlan, 201);
      }

      // 8. Treatment plan detail
      if (path === '/api/clinical/treatment-plans/201' && method === 'GET') {
        return mockJsonResponse(planState);
      }

      // 9. Procedures list
      if (path === '/api/clinical/treatment-plans/201/procedures' && method === 'GET') {
        return mockJsonResponse(proceduresList);
      }

      // 10. Add procedure
      if (path === '/api/clinical/treatment-plans/201/procedures' && method === 'POST') {
        const payload = JSON.parse(options.body);
        const newProc = {
          id: 301,
          treatmentPlanId: 201,
          sequenceNumber: payload.sequenceNumber || 1,
          toothNumber: payload.toothNumber,
          procedureName: payload.procedureName || payload.description,
          procedureCode: payload.procedureCode,
          quantity: payload.quantity || 1,
          estimatedCost: Number(payload.estimatedCost || 0),
          actualCost: null,
          status: 'PLANNED',
          performedByDentistId: null
        };
        proceduresList = [...proceduresList, newProc];
        return mockJsonResponse(newProc, 201);
      }

      // 11. Approve treatment plan
      if (path === '/api/clinical/treatment-plans/201/approve' && method === 'POST') {
        const payload = JSON.parse(options.body);
        planState = {
          ...planState,
          status: 'APPROVED',
          approvedByDentistId: payload.dentistId,
          approvedAt: '2026-09-14T11:00:00Z'
        };
        return mockJsonResponse(planState, 200);
      }

      // 12. Start treatment plan
      if (path === '/api/clinical/treatment-plans/201/start' && method === 'POST') {
        planState = {
          ...planState,
          status: 'IN_PROGRESS'
        };
        return mockJsonResponse(planState, 200);
      }

      // 13. Complete procedure
      if (path === '/api/clinical/treatment-procedures/301/complete' && method === 'POST') {
        const payload = JSON.parse(options.body);
        const updatedProc = {
          ...proceduresList[0],
          status: 'COMPLETED',
          performedByDentistId: payload.performedByDentistId,
          actualCost: Number(payload.actualCost || 0),
          completionDate: payload.completionDate,
          clinicalProgressNotes: payload.clinicalProgressNotes
        };
        proceduresList = [updatedProc];
        return mockJsonResponse(updatedProc, 200);
      }

      // 14. Complete treatment plan
      if (path === '/api/clinical/treatment-plans/201/complete' && method === 'POST') {
        planState = {
          ...planState,
          status: 'COMPLETED',
          totalActualCost: 800.0
        };
        return mockJsonResponse(planState, 200);
      }

      return mockJsonResponse({ message: `Unhandled test route: ${method} ${urlString}` }, 404);
    });

    // Step 1: Render /clinical/examinations?patientId=10
    renderWorkflowApp('/clinical/examinations?patientId=10');

    // Step 2: Assert examinations table renders with loaded data
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /examinations for patient #10/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Severe toothache on tooth 36')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();

    // Step 3: Click View action for examination #42
    const viewExamBtn = screen.getByLabelText('View examination 42');
    fireEvent.click(viewExamBtn);

    // Step 4: Assert examination detail renders
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /examination #42/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Severe toothache on tooth 36')).toBeInTheDocument();
    expect(screen.getByText('Pulpitis')).toBeInTheDocument();
    expect(screen.getByText(/no tooth findings recorded/i)).toBeInTheDocument();

    // Step 5: Click Add Tooth Finding, fill form, submit, assert finding appears
    fireEvent.click(screen.getByRole('button', { name: /add tooth finding/i }));
    await screen.findByRole('heading', { name: /record tooth \/ general oral finding/i });

    fireEvent.change(screen.getByLabelText(/tooth number/i), {
      target: { value: '36' }
    });
    fireEvent.change(screen.getByLabelText(/condition name/i), {
      target: { value: 'Dental Caries' }
    });
    fireEvent.change(screen.getByLabelText(/clinical notes/i), {
      target: { value: 'Deep pit on occlusal surface' }
    });

    fireEvent.click(screen.getByRole('button', { name: /save finding/i }));

    await waitFor(() => {
      expect(screen.getByText(/tooth finding recorded successfully/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Dental Caries')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();

    // Verify finding POST fetch call
    const findingPostCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/api/clinical/examinations/42/tooth-findings') && opts?.method === 'POST'
    );
    expect(findingPostCall).toBeDefined();
    expect(findingPostCall[0]).toBe('/api/clinical/examinations/42/tooth-findings');
    expect(findingPostCall[1].headers['X-XSRF-TOKEN']).toBe('workflow-csrf-token');
    expect(findingPostCall[1].credentials).toBe('same-origin');
    expect(JSON.parse(findingPostCall[1].body)).toEqual(
      expect.objectContaining({
        toothNumber: 36,
        isGeneral: false,
        conditionName: 'Dental Caries',
        notes: 'Deep pit on occlusal surface',
        recordedByUserId: 7
      })
    );

    // Step 6: Confirm Diagnosis as licensed DENTIST
    expect(screen.getByRole('heading', { name: /confirm diagnosis/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/confirmed diagnosis/i), {
      target: { value: 'Acute irreversible pulpitis tooth 36' }
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm diagnosis/i }));

    await waitFor(() => {
      expect(screen.getByText(/clinical diagnosis confirmed successfully/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);

    // Verify confirm diagnosis POST fetch call
    const confirmPostCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/api/clinical/examinations/42/confirm-diagnosis') && opts?.method === 'POST'
    );
    expect(confirmPostCall).toBeDefined();
    expect(confirmPostCall[0]).toBe('/api/clinical/examinations/42/confirm-diagnosis');
    expect(JSON.parse(confirmPostCall[1].body)).toEqual({
      dentistId: 7,
      confirmedDiagnosis: 'Acute irreversible pulpitis tooth 36'
    });

    // Step 7: Navigate to /clinical/treatment-plans?patientId=10
    fireEvent.click(screen.getByTestId('test-nav-to-plans'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /treatment plans for patient #10/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/no treatment plans found/i)).toBeInTheDocument();

    // Step 8: Propose new treatment plan inline
    fireEvent.click(screen.getByRole('button', { name: /create treatment plan/i }));
    await screen.findByRole('heading', { name: /propose new treatment plan/i });

    fireEvent.change(screen.getByLabelText(/plan title/i), {
      target: { value: 'Root Canal and Crown Therapy' }
    });
    fireEvent.change(screen.getByLabelText(/total estimated cost/i), {
      target: { value: '1200.00' }
    });
    fireEvent.change(screen.getByLabelText(/clinical notes/i), {
      target: { value: 'Complete endodontic therapy and porcelain crown' }
    });

    const planSubmitBtn = within(screen.getByTestId('treatment-plans-page-placeholder'))
      .getByRole('button', { name: /propose plan/i });
    fireEvent.click(planSubmitBtn);

    await waitFor(() => {
      expect(screen.getByText(/treatment plan proposed successfully/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Root Canal and Crown Therapy')).toBeInTheDocument();
    expect(screen.getByText('Proposed')).toBeInTheDocument();

    // Verify plan POST fetch call
    const planPostCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/api/clinical/treatment-plans') && opts?.method === 'POST' && !url.includes('approve') && !url.includes('start') && !url.includes('complete')
    );
    expect(planPostCall).toBeDefined();
    expect(planPostCall[0]).toBe('/api/clinical/treatment-plans');
    expect(JSON.parse(planPostCall[1].body)).toEqual(
      expect.objectContaining({
        patientId: 10,
        dentistId: 7,
        planName: 'Root Canal and Crown Therapy',
        totalEstimatedCost: 1200,
        clinicalNotes: 'Complete endodontic therapy and porcelain crown'
      })
    );

    // Step 9 & 10: Click View on plan -> TreatmentPlanDetailPage
    const viewPlanBtn = screen.getByLabelText('View treatment plan 201');
    fireEvent.click(viewPlanBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /treatment plan #201/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Root Canal and Crown Therapy')).toBeInTheDocument();
    expect(screen.getByText(/no procedures recorded/i)).toBeInTheDocument();

    // Step 11: Add procedure
    fireEvent.click(screen.getByRole('button', { name: /add procedure/i }));
    await screen.findByRole('heading', { name: /add treatment procedure/i });

    fireEvent.change(screen.getByLabelText(/procedure name/i), {
      target: { value: 'Molar Endodontics' }
    });
    fireEvent.change(screen.getByLabelText(/procedure code/i), {
      target: { value: 'D3330' }
    });
    fireEvent.change(screen.getByLabelText(/tooth number/i), {
      target: { value: '36' }
    });
    fireEvent.change(screen.getByLabelText(/estimated cost/i), {
      target: { value: '800.00' }
    });

    const addProcForm = screen.getByRole('form', { name: /procedure form/i });
    fireEvent.click(within(addProcForm).getByRole('button', { name: /add procedure/i }));

    await waitFor(() => {
      expect(screen.getByText(/procedure added successfully/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Molar Endodontics')).toBeInTheDocument();
    expect(screen.getByText(/D3330/)).toBeInTheDocument();
    expect(screen.getByText('Planned')).toBeInTheDocument();

    // Verify procedure POST fetch call
    const procPostCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/api/clinical/treatment-plans/201/procedures') && opts?.method === 'POST'
    );
    expect(procPostCall).toBeDefined();
    expect(procPostCall[0]).toBe('/api/clinical/treatment-plans/201/procedures');
    expect(JSON.parse(procPostCall[1].body)).toEqual(
      expect.objectContaining({
        procedureName: 'Molar Endodontics',
        procedureCode: 'D3330',
        toothNumber: 36,
        estimatedCost: 800
      })
    );

    // Step 12: Click Approve Plan
    const approveBtn = screen.getByRole('button', { name: /approve plan/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByText(/treatment plan approved successfully/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Approved').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: /approve plan/i })).not.toBeInTheDocument();

    // Verify plan approval POST call
    const approveCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/api/clinical/treatment-plans/201/approve') && opts?.method === 'POST'
    );
    expect(approveCall).toBeDefined();
    expect(approveCall[0]).toBe('/api/clinical/treatment-plans/201/approve');
    expect(JSON.parse(approveCall[1].body)).toEqual({ dentistId: 7 });

    // Step 13: Click Start Plan
    const startBtn = screen.getByRole('button', { name: /start plan/i });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(screen.getByText(/treatment plan marked as in progress/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /complete plan/i })).toBeInTheDocument();

    // Verify plan start POST call
    const startCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/api/clinical/treatment-plans/201/start') && opts?.method === 'POST'
    );
    expect(startCall).toBeDefined();
    expect(startCall[0]).toBe('/api/clinical/treatment-plans/201/start?dentistId=7');

    // Step 14: Complete procedure
    const completeProcBtn = screen.getByLabelText('Complete procedure 301');
    fireEvent.click(completeProcBtn);
    await screen.findByRole('heading', { name: /complete procedure #301/i });

    fireEvent.change(screen.getByLabelText(/performing dentist id/i), {
      target: { value: '7' }
    });
    fireEvent.change(screen.getByLabelText(/actual cost/i), {
      target: { value: '800.00' }
    });
    fireEvent.change(screen.getByLabelText(/completion date/i), {
      target: { value: '2026-09-14' }
    });
    fireEvent.change(screen.getByLabelText(/progress notes/i), {
      target: { value: 'Canals obturated, patient tolerated well' }
    });

    const completeProcForm = screen.getByRole('form', { name: /procedure form/i });
    fireEvent.click(within(completeProcForm).getByRole('button', { name: /complete procedure/i }));

    await waitFor(() => {
      expect(screen.getByText(/procedure completed successfully/i)).toBeInTheDocument();
    });
    const procTable = screen.getByRole('table', { name: /treatment procedures table/i });
    expect(within(procTable).getByText('Completed')).toBeInTheDocument();

    // Verify procedure complete POST call
    const completeProcCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/api/clinical/treatment-procedures/301/complete') && opts?.method === 'POST'
    );
    expect(completeProcCall).toBeDefined();
    expect(completeProcCall[0]).toBe('/api/clinical/treatment-procedures/301/complete');
    expect(JSON.parse(completeProcCall[1].body)).toEqual(
      expect.objectContaining({
        performedByDentistId: 7,
        actualCost: 800,
        completionDate: '2026-09-14',
        clinicalProgressNotes: 'Canals obturated, patient tolerated well'
      })
    );

    // Step 15: Click Complete Plan
    const completePlanBtn = screen.getByRole('button', { name: /complete plan/i });
    fireEvent.click(completePlanBtn);

    await waitFor(() => {
      expect(screen.getByText(/treatment plan completed successfully/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText('Completed').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole('button', { name: /complete plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start plan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel plan/i })).not.toBeInTheDocument();

    // Verify complete plan POST call
    const completePlanCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/api/clinical/treatment-plans/201/complete') && opts?.method === 'POST'
    );
    expect(completePlanCall).toBeDefined();
    expect(completePlanCall[0]).toBe('/api/clinical/treatment-plans/201/complete?dentistId=7');
  });

  it('surfaces a 409 conflict on plan approval without changing status', async () => {
    const proposedPlan = {
      id: 201,
      patientId: 10,
      dentistId: 7,
      createdByUserId: 7,
      planName: 'Root Canal and Crown Therapy',
      totalEstimatedCost: 1200.0,
      totalActualCost: null,
      status: 'PROPOSED',
      clinicalNotes: 'Initial proposed plan'
    };

    global.fetch = vi.fn(async (url, options = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      const urlString = String(url);
      const [path] = urlString.split('?');

      if (path === '/api/auth/csrf' && method === 'GET') {
        return mockJsonResponse({
          token: 'workflow-csrf-token',
          headerName: 'X-XSRF-TOKEN',
          parameterName: '_csrf'
        });
      }

      if (path === '/api/clinical/treatment-plans/201' && method === 'GET') {
        return mockJsonResponse(proposedPlan);
      }

      if (path === '/api/clinical/treatment-plans/201/procedures' && method === 'GET') {
        return mockJsonResponse([]);
      }

      if (path === '/api/clinical/treatment-plans/201/approve' && method === 'POST') {
        return mockJsonResponse(
          {
            status: 409,
            error: 'Conflict',
            message: 'Cannot approve treatment plan: active pre-requisite treatment plan exists for patient.'
          },
          409
        );
      }

      return mockJsonResponse({ message: 'Not found' }, 404);
    });

    renderWorkflowApp('/clinical/treatment-plans/201');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /treatment plan #201/i })).toBeInTheDocument();
    });

    expect(screen.getAllByText('Proposed').length).toBeGreaterThanOrEqual(1);

    const approveBtn = screen.getByRole('button', { name: /approve plan/i });
    expect(approveBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Cannot approve treatment plan: active pre-requisite treatment plan exists for patient.'
      );
    });

    // Plan status must remain PROPOSED and Approve button must remain available
    expect(screen.getAllByText('Proposed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /approve plan/i })).toBeInTheDocument();

    // Verify fetch call made
    const approveAttemptCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes('/api/clinical/treatment-plans/201/approve') && opts?.method === 'POST'
    );
    expect(approveAttemptCall).toBeDefined();
    expect(approveAttemptCall[0]).toBe('/api/clinical/treatment-plans/201/approve');
    expect(approveAttemptCall[1].headers['X-XSRF-TOKEN']).toBe('workflow-csrf-token');
    expect(approveAttemptCall[1].credentials).toBe('same-origin');
    expect(JSON.parse(approveAttemptCall[1].body)).toEqual({ dentistId: 7 });
  });
});
