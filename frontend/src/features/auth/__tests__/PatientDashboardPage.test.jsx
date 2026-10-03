import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import PatientDashboardPage from '../pages/PatientDashboardPage';
import * as AuthContextModule from '../context/AuthContext';
import * as patientPortalApi from '../../patient/api/patientPortalApi';

vi.mock('../../patient/api/patientPortalApi', () => ({
  getPatientDashboard: vi.fn(),
  getPatientPrescriptions: vi.fn(),
  getPatientPrescriptionById: vi.fn()
}));

function LoginWatcher() {
  const location = useLocation();
  return <div data-testid="login-path">{location.pathname}</div>;
}

describe('PatientDashboardPage', () => {
  const mockLogout = vi.fn();

  const mockUser = {
    id: 42,
    firstName: 'Eleanor',
    lastName: 'Vance',
    email: 'eleanor@example.com',
    phone: '+1 555-0144',
    role: 'PATIENT'
  };

  const mockDashboardData = {
    patient: {
      userId: 42,
      firstName: 'Eleanor',
      lastName: 'Vance',
      email: 'eleanor@example.com',
      phone: '+1 555-0144',
      role: 'PATIENT',
      active: true,
      patientCode: 'PAT-4200',
      hasClinicalProfile: true
    },
    clinicalStatus: {
      profileLinked: true,
      patientCode: 'PAT-4200',
      intakeStatus: 'COMPLETED',
      message: 'Your clinical patient record is active at DentCare.'
    },
    prescriptionsSummary: {
      totalCount: 0,
      activeCount: 0,
      recentPrescriptions: []
    },
    availableFeatures: [
      { id: 'profile', name: 'My Profile', status: 'AVAILABLE' },
      { id: 'prescriptions', name: 'My Prescriptions', status: 'AVAILABLE' },
      { id: 'appointments', name: 'Appointments', status: 'COMING_SOON' },
      { id: 'billing', name: 'Invoices & Payments', status: 'COMING_SOON' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      logout: mockLogout
    });
    patientPortalApi.getPatientDashboard.mockResolvedValue(mockDashboardData);
  });

  it('renders patient greeting, verified account badge, and loads summary data', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <PatientDashboardPage />
      </MemoryRouter>
    );

    // Initial loading state
    expect(screen.getByTestId('portal-loading')).toBeInTheDocument();

    // After loading resolves
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome, eleanor\./i, level: 1 })).toBeInTheDocument();
    });

    expect(screen.getByTestId('patient-role-pill')).toHaveTextContent(/verified patient account/i);
    expect(screen.getByTestId('patient-code-pill')).toHaveTextContent('PAT-4200');
    expect(screen.getByTestId('portal-profile-cta')).toHaveAttribute('href', '/account');
  });

  it('renders personal care profile card with verified details', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <PatientDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('patient-card-profile')).toBeInTheDocument();
    });

    expect(screen.getByTestId('patient-display-name')).toHaveTextContent('Eleanor Vance');
    expect(screen.getByTestId('patient-display-email')).toHaveTextContent('eleanor@example.com');
    expect(screen.getByTestId('patient-display-phone')).toHaveTextContent('+1 555-0144');
    expect(screen.getByRole('link', { name: /manage account & security/i })).toHaveAttribute('href', '/account');
  });

  it('renders clinical file status card with active status when linked', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <PatientDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('patient-card-clinical')).toBeInTheDocument();
    });

    expect(screen.getByText(/record active/i)).toBeInTheDocument();
    expect(screen.getByText('PAT-4200')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('renders empty prescriptions state with reassuring message when count is zero', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <PatientDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('patient-card-prescriptions')).toBeInTheDocument();
    });

    expect(screen.getByTestId('prescriptions-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/no active prescriptions on file/i)).toBeInTheDocument();
  });

  it('renders prescription list when patient has prescriptions on file', async () => {
    const dataWithPrescriptions = {
      ...mockDashboardData,
      prescriptionsSummary: {
        totalCount: 1,
        activeCount: 1,
        recentPrescriptions: [
          {
            id: 88,
            dentistName: 'Dr. Sarah Connor',
            notes: 'Take with food',
            items: [
              { medicineName: 'Amoxicillin', dosage: '500mg', frequency: 'TID', duration: '7 days' }
            ]
          }
        ]
      }
    };
    patientPortalApi.getPatientDashboard.mockResolvedValueOnce(dataWithPrescriptions);

    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <PatientDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('prescriptions-list')).toBeInTheDocument();
    });

    expect(screen.getByText(/prescription #88/i)).toBeInTheDocument();
    expect(screen.getByText(/dr\. sarah connor/i)).toBeInTheDocument();
    expect(screen.getByText(/amoxicillin/i)).toBeInTheDocument();
    expect(screen.getByText(/take with food/i)).toBeInTheDocument();
  });

  it('renders active appointment workflow card and honest coming-soon billing notice without fabricated contact details', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <PatientDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('patient-card-appointments')).toBeInTheDocument();
      expect(screen.getByTestId('patient-card-billing')).toBeInTheDocument();
    });

    // Verify Appointments card is active and routes to /patient/appointments
    expect(screen.getByRole('link', { name: /my appointments/i })).toHaveAttribute('href', '/patient/appointments');
    expect(screen.getByText(/request dental appointments online and review the status/i)).toBeInTheDocument();
    expect(screen.getByText(/pending confirmation/i)).toBeInTheDocument();

    // Verify Billing card retains honest coming-soon notice
    expect(screen.getByText(/patient billing statements are not yet available in the portal/i)).toBeInTheDocument();
    expect(screen.getByText(/please contact clinic reception regarding treatment invoices/i)).toBeInTheDocument();

    // Verify fabricated contact details are strictly absent from the DOM
    expect(screen.queryByText(/0100/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/monday.*friday/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/care@dentcare\.test/i)).not.toBeInTheDocument();
    expect(screen.getByText(/need assistance\? please speak with clinic reception/i)).toBeInTheDocument();
  });

  it('CRITICAL SECURITY: never renders staff navigation or staff management tools', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <PatientDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('patient-dashboard')).toBeInTheDocument();
    });

    // Staff tools and navigation MUST NOT appear
    expect(screen.queryByText(/staff dashboard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/inventory management/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/clinical workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/billing administration/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/staff management/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/income reports/i)).not.toBeInTheDocument();
  });

  it('renders access-denied notice when redirected with accessDenied in location state', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/patient/dashboard', state: { accessDenied: true } }]}>
        <PatientDashboardPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('patient-access-denied-notice')).toBeInTheDocument();
    expect(screen.getByText(/that page is reserved for authorized clinic staff/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome, eleanor\./i, level: 1 })).toBeInTheDocument();
    });
  });

  it('handles API loading error and allows retry', async () => {
    patientPortalApi.getPatientDashboard.mockRejectedValueOnce(new Error('Network error loading portal'));

    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <PatientDashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/unable to load dashboard records/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/network error loading portal/i)).toBeInTheDocument();

    // Click retry
    patientPortalApi.getPatientDashboard.mockResolvedValueOnce(mockDashboardData);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /welcome, eleanor\./i, level: 1 })).toBeInTheDocument();
    });
  });

  it('triggers logout and redirects to /login when sign out button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <Routes>
          <Route path="/patient/dashboard" element={<PatientDashboardPage />} />
          <Route path="/login" element={<LoginWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('patient-logout-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('patient-logout-btn'));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('login-path')).toHaveTextContent('/login');
    });
  });
});
