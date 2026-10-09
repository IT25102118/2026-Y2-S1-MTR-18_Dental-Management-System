import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PatientAppointmentsPage from '../pages/PatientAppointmentsPage';
import * as AuthContextModule from '../context/AuthContext';
import * as patientPortalApi from '../../patient/api/patientPortalApi';

vi.mock('../../patient/api/patientPortalApi', () => ({
  getPatientAppointments: vi.fn(),
  createAppointmentRequest: vi.fn(),
  getPatientAppointmentById: vi.fn(),
  cancelAppointmentRequest: vi.fn()
}));

describe('PatientAppointmentsPage', () => {
  const mockUser = {
    id: 42,
    firstName: 'Eleanor',
    lastName: 'Vance',
    email: 'eleanor@example.com',
    role: 'PATIENT'
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 5);
  const futureYear = futureDate.getFullYear();
  const futureMonth = String(futureDate.getMonth() + 1).padStart(2, '0');
  const futureDay = String(futureDate.getDate()).padStart(2, '0');
  const futureDateStr = `${futureYear}-${futureMonth}-${futureDay}`;

  const pastDateStr = '2020-01-01';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false
    });
    patientPortalApi.getPatientAppointments.mockResolvedValue([]);
  });

  it('renders page header, title, and link back to Patient Dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientAppointmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /my appointments/i, level: 1 })).toBeInTheDocument();
    });

    expect(screen.getByText(/request a dental visit and review your appointment requests/i)).toBeInTheDocument();
    expect(screen.getByTestId('back-to-dashboard-btn')).toHaveAttribute('href', '/patient/dashboard');
  });

  it('renders booking form with required fields and date input min constraint', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientAppointmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('appointment-form-card')).toBeInTheDocument();
    });

    const dateInput = screen.getByTestId('input-appointment-date');
    const timeInput = screen.getByTestId('input-preferred-time');
    const reasonInput = screen.getByTestId('input-appointment-reason');
    const notesInput = screen.getByTestId('input-appointment-notes');
    const submitBtn = screen.getByTestId('submit-appointment-request-btn');

    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute('type', 'date');
    expect(dateInput).toHaveAttribute('min', todayStr);

    expect(timeInput).toBeInTheDocument();
    expect(reasonInput).toBeInTheDocument();
    expect(notesInput).toBeInTheDocument();
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveTextContent(/submit appointment request/i);
  });

  it('renders honest empty state when patient has no appointment requests', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientAppointmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('appointments-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText(/you do not have any appointment requests yet\./i)).toBeInTheDocument();
    expect(screen.getByText(/submit a request using the form to schedule a dental checkup/i)).toBeInTheDocument();
  });

  it('renders patient own appointment requests with honest status and dentist attribution', async () => {
    const mockAppointmentsList = [
      {
        id: 701,
        appointmentDate: futureDateStr,
        preferredTime: '10:00',
        reason: 'Tooth sensitivity check',
        notes: 'Upper right molar hurts with cold drinks',
        status: 'PENDING',
        statusDescription: 'Pending confirmation',
        dentistName: null,
        createdAt: '2026-10-03T10:00:00'
      },
      {
        id: 702,
        appointmentDate: '2026-11-15',
        preferredTime: '14:30',
        reason: 'Routine 6-month cleaning',
        notes: null,
        status: 'CONFIRMED',
        statusDescription: 'Confirmed',
        dentistName: 'Dr. Sarah Connor',
        createdAt: '2026-10-01T09:00:00'
      }
    ];

    patientPortalApi.getPatientAppointments.mockResolvedValueOnce(mockAppointmentsList);

    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientAppointmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('appointments-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('appointments-count-badge')).toHaveTextContent('2 Requests');

    // Item 1: PENDING
    expect(screen.getByTestId('appointment-record-701')).toBeInTheDocument();
    expect(screen.getByText('Tooth sensitivity check')).toBeInTheDocument();
    expect(screen.getByText('Upper right molar hurts with cold drinks')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-701')).toHaveTextContent(/pending confirmation/i);
    expect(screen.getByText(/dentist assigned upon confirmation/i)).toBeInTheDocument();

    // Item 2: CONFIRMED with dentist
    expect(screen.getByTestId('appointment-record-702')).toBeInTheDocument();
    expect(screen.getByText('Routine 6-month cleaning')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-702')).toHaveTextContent('Confirmed');
    expect(screen.getByTestId('dentist-name-702')).toHaveTextContent('Dr. Sarah Connor');
  });

  it('validates required fields on submit and prevents empty submission', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientAppointmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('submit-appointment-request-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('submit-appointment-request-btn'));

    expect(screen.getByTestId('error-appointment-date')).toHaveTextContent(/appointment date is required/i);
    expect(screen.getByTestId('error-appointment-reason')).toHaveTextContent(/reason for visit is required/i);
    expect(patientPortalApi.createAppointmentRequest).not.toHaveBeenCalled();
  });

  it('validates and rejects past dates with friendly message', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientAppointmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-appointment-date')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-appointment-date'), { target: { value: pastDateStr } });
    fireEvent.change(screen.getByTestId('input-appointment-reason'), { target: { value: 'Tooth checkup' } });

    fireEvent.click(screen.getByTestId('submit-appointment-request-btn'));

    expect(screen.getByTestId('error-appointment-date')).toHaveTextContent(/appointment date cannot be earlier than today/i);
    expect(patientPortalApi.createAppointmentRequest).not.toHaveBeenCalled();
  });

  it('submits appointment request successfully, shows confirmation banner, and refreshes list', async () => {
    const createdAppointment = {
      id: 801,
      appointmentDate: futureDateStr,
      preferredTime: '11:00',
      reason: 'Cavity check and filling consultation',
      notes: 'Morning preferred',
      status: 'PENDING',
      statusDescription: 'Pending confirmation',
      dentistName: null,
      createdAt: '2026-10-03T12:00:00'
    };

    patientPortalApi.createAppointmentRequest.mockResolvedValueOnce(createdAppointment);

    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientAppointmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-appointment-date')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-appointment-date'), { target: { value: futureDateStr } });
    fireEvent.change(screen.getByTestId('input-preferred-time'), { target: { value: '11:00' } });
    fireEvent.change(screen.getByTestId('input-appointment-reason'), { target: { value: 'Cavity check and filling consultation' } });
    fireEvent.change(screen.getByTestId('input-appointment-notes'), { target: { value: 'Morning preferred' } });

    // Mock subsequent list fetch with new item
    patientPortalApi.getPatientAppointments.mockResolvedValueOnce([createdAppointment]);

    fireEvent.click(screen.getByTestId('submit-appointment-request-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('appointment-success-banner')).toBeInTheDocument();
    });

    // Check Honest Success State
    expect(screen.getByText(/appointment request submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/your request has been received and is pending clinic confirmation/i)).toBeInTheDocument();

    // Verify form was reset
    expect(screen.getByTestId('input-appointment-date')).toHaveValue('');
    expect(screen.getByTestId('input-appointment-reason')).toHaveValue('');

    // Verify API called with trimmed payload including default smsConsent false
    expect(patientPortalApi.createAppointmentRequest).toHaveBeenCalledWith({
      appointmentDate: futureDateStr,
      preferredTime: '11:00',
      reason: 'Cavity check and filling consultation',
      notes: 'Morning preferred',
      smsConsent: false
    });

    expect(screen.getByTestId('checkbox-appointment-sms-consent')).not.toBeChecked();
  });

  it('prevents duplicate submissions while request is in flight', async () => {
    let resolvePromise;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    patientPortalApi.createAppointmentRequest.mockReturnValueOnce(slowPromise);

    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientAppointmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('input-appointment-date')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('input-appointment-date'), { target: { value: futureDateStr } });
    fireEvent.change(screen.getByTestId('input-appointment-reason'), { target: { value: 'Checkup' } });

    const submitBtn = screen.getByTestId('submit-appointment-request-btn');
    fireEvent.click(submitBtn);

    // Button should now be disabled with Submitting text
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent(/submitting request/i);

    // Attempt second click while in flight
    fireEvent.click(submitBtn);
    expect(patientPortalApi.createAppointmentRequest).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolvePromise({
      id: 802,
      appointmentDate: futureDateStr,
      preferredTime: null,
      reason: 'Checkup',
      notes: null,
      status: 'PENDING',
      statusDescription: 'Pending confirmation'
    });

    await waitFor(() => {
      expect(screen.getByTestId('appointment-success-banner')).toBeInTheDocument();
    });
  });

  it('CRITICAL SECURITY: never renders staff navigation, telemetry, or staff management modules', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/appointments']}>
        <PatientAppointmentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('patient-appointments-page')).toBeInTheDocument();
    });

    // Staff tools and modules MUST NOT appear
    expect(screen.queryByText(/staff dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/inventory management/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/clinical workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/billing administration/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/staff management/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/operational telemetry/i)).not.toBeInTheDocument();
  });

  describe('SMS Consent Capture', () => {
    it('renders consent checkbox unchecked by default with development notice', async () => {
      render(
        <MemoryRouter initialEntries={['/patient/appointments']}>
          <PatientAppointmentsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('checkbox-appointment-sms-consent')).toBeInTheDocument();
      });

      const checkbox = screen.getByTestId('checkbox-appointment-sms-consent');
      expect(checkbox).not.toBeChecked();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
      expect(screen.getByText(/i agree to receive sms updates about this appointment request/i)).toBeInTheDocument();

      const notice = screen.getByTestId('notice-appointment-sms-consent');
      expect(notice).toBeInTheDocument();
      expect(notice).toHaveTextContent(/sms delivery is not active yet\. your preference will be saved for future notification support\./i);
    });

    it('allows patient to opt in and opt out before submitting', async () => {
      render(
        <MemoryRouter initialEntries={['/patient/appointments']}>
          <PatientAppointmentsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('checkbox-appointment-sms-consent')).toBeInTheDocument();
      });

      const checkbox = screen.getByTestId('checkbox-appointment-sms-consent');
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('submits booking request with smsConsent: true when patient opts in', async () => {
      const createdWithConsent = {
        id: 805,
        appointmentDate: futureDateStr,
        preferredTime: '14:00',
        reason: 'Tooth sensitivity consultation',
        notes: null,
        status: 'PENDING',
        statusDescription: 'Pending confirmation',
        dentistName: null,
        createdAt: '2026-10-04T09:00:00'
      };

      patientPortalApi.createAppointmentRequest.mockResolvedValueOnce(createdWithConsent);

      render(
        <MemoryRouter initialEntries={['/patient/appointments']}>
          <PatientAppointmentsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('input-appointment-date')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId('input-appointment-date'), { target: { value: futureDateStr } });
      fireEvent.change(screen.getByTestId('input-preferred-time'), { target: { value: '14:00' } });
      fireEvent.change(screen.getByTestId('input-appointment-reason'), { target: { value: 'Tooth sensitivity consultation' } });

      const checkbox = screen.getByTestId('checkbox-appointment-sms-consent');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      patientPortalApi.getPatientAppointments.mockResolvedValueOnce([createdWithConsent]);

      fireEvent.click(screen.getByTestId('submit-appointment-request-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('appointment-success-banner')).toBeInTheDocument();
      });

      // Verify payload contains smsConsent: true
      expect(patientPortalApi.createAppointmentRequest).toHaveBeenCalledWith({
        appointmentDate: futureDateStr,
        preferredTime: '14:00',
        reason: 'Tooth sensitivity consultation',
        notes: null,
        smsConsent: true
      });

      // Verify Honest Success State: status remains Pending confirmation, never 'SMS sent' or 'Appointment confirmed'
      expect(screen.getByText(/appointment request submitted/i)).toBeInTheDocument();
      expect(screen.getByText(/pending clinic confirmation/i)).toBeInTheDocument();
      expect(screen.queryByText(/sms sent/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/appointment confirmed/i)).not.toBeInTheDocument();

      // Form and consent checkbox reset
      expect(screen.getByTestId('checkbox-appointment-sms-consent')).not.toBeChecked();
      expect(screen.getByTestId('input-appointment-reason')).toHaveValue('');
    });
  });

  describe('Appointment Cancellation Flow', () => {
    const mockAppointments = [
      {
        id: 901,
        appointmentDate: futureDateStr,
        preferredTime: '10:00',
        reason: 'Tooth pain consultation',
        notes: null,
        status: 'PENDING',
        statusDescription: 'Pending confirmation',
        dentistName: null,
        createdAt: '2026-10-03T10:00:00'
      },
      {
        id: 902,
        appointmentDate: '2026-11-20',
        preferredTime: '15:00',
        reason: 'Routine checkup',
        notes: null,
        status: 'CONFIRMED',
        statusDescription: 'Confirmed',
        dentistName: 'Dr. Sarah Connor',
        createdAt: '2026-10-01T09:00:00'
      },
      {
        id: 903,
        appointmentDate: '2026-11-25',
        preferredTime: '11:00',
        reason: 'Cosmetic consultation',
        notes: null,
        status: 'CANCELLED',
        statusDescription: 'Cancelled',
        dentistName: null,
        createdAt: '2026-09-28T09:00:00'
      }
    ];

    it('renders Cancel Request button for PENDING appointment, but NOT for CONFIRMED or CANCELLED', async () => {
      patientPortalApi.getPatientAppointments.mockResolvedValueOnce(mockAppointments);

      render(
        <MemoryRouter initialEntries={['/patient/appointments']}>
          <PatientAppointmentsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('appointments-list')).toBeInTheDocument();
      });

      // PENDING has cancel button
      expect(screen.getByTestId('cancel-appointment-btn-901')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-appointment-btn-901')).toHaveTextContent(/cancel request/i);

      // CONFIRMED does not have cancel button
      expect(screen.queryByTestId('cancel-appointment-btn-902')).not.toBeInTheDocument();

      // CANCELLED does not have cancel button
      expect(screen.queryByTestId('cancel-appointment-btn-903')).not.toBeInTheDocument();
    });

    it('requires explicit confirmation before calling cancellation API', async () => {
      patientPortalApi.getPatientAppointments.mockResolvedValueOnce(mockAppointments);

      render(
        <MemoryRouter initialEntries={['/patient/appointments']}>
          <PatientAppointmentsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('cancel-appointment-btn-901')).toBeInTheDocument();
      });

      // Click cancel request
      fireEvent.click(screen.getByTestId('cancel-appointment-btn-901'));

      // Confirmation prompt appears
      expect(screen.getByTestId('cancel-confirm-box-901')).toBeInTheDocument();
      expect(screen.getByText(/cancel this appointment request\?/i)).toBeInTheDocument();
      expect(screen.getByText(/the pending request will be marked cancelled/i)).toBeInTheDocument();
      expect(screen.getByTestId('confirm-cancel-btn-901')).toBeInTheDocument();
      expect(screen.getByTestId('dismiss-cancel-btn-901')).toBeInTheDocument();

      // API has not been called yet
      expect(patientPortalApi.cancelAppointmentRequest).not.toHaveBeenCalled();

      // Click dismiss / Keep Request
      fireEvent.click(screen.getByTestId('dismiss-cancel-btn-901'));

      // Confirmation box disappears and Cancel button is restored
      expect(screen.queryByTestId('cancel-confirm-box-901')).not.toBeInTheDocument();
      expect(screen.getByTestId('cancel-appointment-btn-901')).toBeInTheDocument();
      expect(patientPortalApi.cancelAppointmentRequest).not.toHaveBeenCalled();
    });

    it('successfully cancels appointment, updates status to Cancelled, shows banner, and preserves record in history', async () => {
      patientPortalApi.getPatientAppointments.mockResolvedValueOnce(mockAppointments);
      patientPortalApi.cancelAppointmentRequest.mockResolvedValueOnce({
        id: 901,
        appointmentDate: futureDateStr,
        preferredTime: '10:00',
        reason: 'Tooth pain consultation',
        notes: null,
        status: 'CANCELLED',
        statusDescription: 'Cancelled',
        dentistName: null,
        createdAt: '2026-10-03T10:00:00'
      });

      render(
        <MemoryRouter initialEntries={['/patient/appointments']}>
          <PatientAppointmentsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('cancel-appointment-btn-901')).toBeInTheDocument();
      });

      // Confirm cancellation
      fireEvent.click(screen.getByTestId('cancel-appointment-btn-901'));
      fireEvent.click(screen.getByTestId('confirm-cancel-btn-901'));

      // Expect API called with appointment ID
      await waitFor(() => {
        expect(patientPortalApi.cancelAppointmentRequest).toHaveBeenCalledWith(901);
      });

      // Status chip is visibly updated to Cancelled
      expect(screen.getByTestId('status-badge-901')).toHaveTextContent('Cancelled');

      // Cancellation success banner appears
      expect(screen.getByTestId('appointment-cancel-success-banner')).toBeInTheDocument();
      expect(screen.getByText(/appointment request cancelled\./i)).toBeInTheDocument();

      // Record remains visible in history
      expect(screen.getByTestId('appointment-record-901')).toBeInTheDocument();
      expect(screen.getByText('Tooth pain consultation')).toBeInTheDocument();

      // Cancel button is no longer present for this appointment
      expect(screen.queryByTestId('cancel-appointment-btn-901')).not.toBeInTheDocument();
    });

    it('prevents duplicate clicks and disables controls while cancellation request is in flight', async () => {
      patientPortalApi.getPatientAppointments.mockResolvedValueOnce(mockAppointments);

      let resolveCancellation;
      const cancellationPromise = new Promise((resolve) => {
        resolveCancellation = resolve;
      });
      patientPortalApi.cancelAppointmentRequest.mockReturnValueOnce(cancellationPromise);

      render(
        <MemoryRouter initialEntries={['/patient/appointments']}>
          <PatientAppointmentsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('cancel-appointment-btn-901')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cancel-appointment-btn-901'));

      const confirmBtn = screen.getByTestId('confirm-cancel-btn-901');
      fireEvent.click(confirmBtn);

      // In flight: confirm button is disabled and shows Cancelling...
      expect(confirmBtn).toBeDisabled();
      expect(confirmBtn).toHaveTextContent(/cancelling\.\.\./i);

      // Secondary click while in flight is ignored
      fireEvent.click(confirmBtn);
      expect(patientPortalApi.cancelAppointmentRequest).toHaveBeenCalledTimes(1);

      // Resolve the cancellation request
      resolveCancellation({
        id: 901,
        status: 'CANCELLED',
        statusDescription: 'Cancelled'
      });

      await waitFor(() => {
        expect(screen.getByTestId('appointment-cancel-success-banner')).toBeInTheDocument();
      });
    });

    it('handles backend cancellation error by preserving original status and displaying safe error message', async () => {
      patientPortalApi.getPatientAppointments.mockResolvedValueOnce(mockAppointments);
      patientPortalApi.cancelAppointmentRequest.mockRejectedValueOnce(
        new Error('Only pending appointment requests can be cancelled.')
      );

      render(
        <MemoryRouter initialEntries={['/patient/appointments']}>
          <PatientAppointmentsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('cancel-appointment-btn-901')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('cancel-appointment-btn-901'));
      fireEvent.click(screen.getByTestId('confirm-cancel-btn-901'));

      await waitFor(() => {
        expect(screen.getByTestId('cancel-error-901')).toBeInTheDocument();
      });

      // Error message is displayed safely
      expect(screen.getByText(/only pending appointment requests can be cancelled\./i)).toBeInTheDocument();

      // Original status is preserved as Pending confirmation
      expect(screen.getByTestId('status-badge-901')).toHaveTextContent(/pending confirmation/i);

      // Record remains visible
      expect(screen.getByTestId('appointment-record-901')).toBeInTheDocument();
    });
  });
});
