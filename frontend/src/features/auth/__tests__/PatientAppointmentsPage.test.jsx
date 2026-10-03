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
  getPatientAppointmentById: vi.fn()
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

    // Verify API called with trimmed payload
    expect(patientPortalApi.createAppointmentRequest).toHaveBeenCalledWith({
      appointmentDate: futureDateStr,
      preferredTime: '11:00',
      reason: 'Cavity check and filling consultation',
      notes: 'Morning preferred'
    });
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
});
