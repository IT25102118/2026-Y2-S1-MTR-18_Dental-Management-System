import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PatientPrescriptionsPage from '../pages/PatientPrescriptionsPage';
import AppHeader from '../../../components/AppHeader';
import ProtectedRoute from '../components/ProtectedRoute';
import * as AuthContextModule from '../context/AuthContext';
import * as patientPortalApi from '../../patient/api/patientPortalApi';

vi.mock('../../patient/api/patientPortalApi', () => ({
  getPatientPrescriptions: vi.fn(),
  getPatientPrescriptionById: vi.fn()
}));

describe('PatientPrescriptionsPage', () => {
  const mockPatientUser = {
    id: 42,
    firstName: 'Eleanor',
    lastName: 'Vance',
    email: 'eleanor@example.com',
    role: 'PATIENT'
  };

  const mockStaffUser = {
    id: 10,
    firstName: 'Marcus',
    lastName: 'Dentist',
    email: 'marcus@dentcare.test',
    role: 'DENTIST'
  };

  const samplePrescriptions = [
    {
      id: 501,
      status: 'FINALIZED',
      dentistName: 'Dr. Sarah Connor',
      notes: 'Take after meals. Avoid alcohol during treatment.',
      createdAt: '2026-10-01T09:30:00',
      finalizedAt: '2026-10-01T10:00:00',
      items: [
        {
          id: 1001,
          medicineName: 'Amoxicillin',
          dosage: '500mg',
          frequency: '3 times daily',
          duration: '7 days',
          instructions: 'Complete entire antibiotic course.'
        },
        {
          id: 1002,
          medicineName: 'Ibuprofen',
          dosage: '400mg',
          frequency: 'Every 8 hours as needed',
          duration: '3 days',
          instructions: 'For pain relief with water.'
        }
      ]
    },
    {
      id: 502,
      status: 'DRAFT',
      dentistName: 'Dr. Alan Grant',
      notes: null,
      createdAt: '2026-10-03T14:15:00',
      finalizedAt: null,
      items: [
        {
          id: 1003,
          medicineName: 'Chlorhexidine Mouthwash',
          dosage: '0.12%',
          frequency: 'Twice daily',
          duration: '14 days',
          instructions: 'Rinse for 30 seconds after brushing.'
        }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockPatientUser,
      isAuthenticated: true,
      isLoading: false
    });
    patientPortalApi.getPatientPrescriptions.mockResolvedValue([]);
  });

  it('renders page title, description, and link back to Patient Dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /my prescriptions/i, level: 1 })).toBeInTheDocument();
    });

    expect(screen.getByText(/review medications and verified prescriptions issued to you by dentcare clinicians/i)).toBeInTheDocument();
    expect(screen.getByTestId('back-to-dashboard-btn')).toHaveAttribute('href', '/patient/dashboard');
  });

  it('renders loading state while fetching prescriptions', () => {
    patientPortalApi.getPatientPrescriptions.mockReturnValueOnce(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('prescriptions-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading your prescription records/i)).toBeInTheDocument();
  });

  it('renders error state with retry button on network failure', async () => {
    patientPortalApi.getPatientPrescriptions.mockRejectedValueOnce(new Error('Network connection timeout'));

    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('prescriptions-error-card')).toBeInTheDocument();
    });

    expect(screen.getByText(/unable to load prescriptions/i)).toBeInTheDocument();
    expect(screen.getByText(/network connection timeout/i)).toBeInTheDocument();

    // Clicking retry fetches again
    patientPortalApi.getPatientPrescriptions.mockResolvedValueOnce(samplePrescriptions);
    fireEvent.click(screen.getByTestId('retry-prescriptions-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('prescriptions-list')).toBeInTheDocument();
    });
  });

  it('renders honest empty state when patient has no prescriptions on file', async () => {
    patientPortalApi.getPatientPrescriptions.mockResolvedValueOnce([]);

    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('prescriptions-empty-state')).toBeInTheDocument();
    });

    expect(screen.getByText('You do not have any prescriptions available in the patient portal yet.')).toBeInTheDocument();
  });

  it('renders prescription list with real DTO data, clinician attribution, and status chips', async () => {
    patientPortalApi.getPatientPrescriptions.mockResolvedValueOnce(samplePrescriptions);

    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('prescriptions-list')).toBeInTheDocument();
    });

    expect(screen.getByTestId('prescriptions-count-badge')).toHaveTextContent('2 Prescriptions');

    // Prescription 501: Finalized
    expect(screen.getByTestId('prescription-card-501')).toBeInTheDocument();
    expect(screen.getByText('Prescription #501')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-501')).toHaveTextContent('Finalized');
    expect(screen.getByTestId('dentist-name-501')).toHaveTextContent(/dr\. sarah connor/i);
    expect(screen.getByTestId('prescription-notes-501')).toHaveTextContent(/take after meals/i);

    // Prescription 502: Draft
    expect(screen.getByTestId('prescription-card-502')).toBeInTheDocument();
    expect(screen.getByText('Prescription #502')).toBeInTheDocument();
    expect(screen.getByTestId('status-badge-502')).toHaveTextContent('Draft');
    expect(screen.getByTestId('dentist-name-502')).toHaveTextContent(/dr\. alan grant/i);
    // Notes null -> not rendered
    expect(screen.queryByTestId('prescription-notes-502')).not.toBeInTheDocument();
  });

  it('renders medication line-items with medicine name, dosage, frequency, duration, and complete instructions', async () => {
    patientPortalApi.getPatientPrescriptions.mockResolvedValueOnce(samplePrescriptions);

    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('medications-list-501')).toBeInTheDocument();
    });

    // Med 1: Amoxicillin
    expect(screen.getByTestId('medicine-name-1001')).toHaveTextContent('Amoxicillin');
    expect(screen.getByTestId('medication-dosage-1001')).toHaveTextContent('500mg');
    expect(screen.getByTestId('medication-frequency-1001')).toHaveTextContent('3 times daily');
    expect(screen.getByTestId('medication-duration-1001')).toHaveTextContent('7 days');
    expect(screen.getByTestId('medication-instructions-1001')).toHaveTextContent(/complete entire antibiotic course/i);

    // Med 2: Ibuprofen
    expect(screen.getByTestId('medicine-name-1002')).toHaveTextContent('Ibuprofen');
    expect(screen.getByTestId('medication-dosage-1002')).toHaveTextContent('400mg');
    expect(screen.getByTestId('medication-instructions-1002')).toHaveTextContent(/for pain relief with water/i);
  });

  it('does not fabricate fake content when optional fields are null or blank', async () => {
    const minimalPrescription = [
      {
        id: 700,
        status: 'FINALIZED',
        dentistName: null,
        notes: null,
        createdAt: '2026-10-04T12:00:00',
        finalizedAt: null,
        items: [
          {
            id: 2001,
            medicineName: 'Saline Solution',
            dosage: null,
            frequency: null,
            duration: null,
            instructions: null
          }
        ]
      }
    ];

    patientPortalApi.getPatientPrescriptions.mockResolvedValueOnce(minimalPrescription);

    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('prescription-card-700')).toBeInTheDocument();
    });

    // No notes box
    expect(screen.queryByTestId('prescription-notes-700')).not.toBeInTheDocument();
    // No dentist attribution tag
    expect(screen.queryByTestId('dentist-name-700')).not.toBeInTheDocument();
    // No instructions block
    expect(screen.queryByTestId('medication-instructions-2001')).not.toBeInTheDocument();
    // Medicine name is rendered
    expect(screen.getByTestId('medicine-name-2001')).toHaveTextContent('Saline Solution');
  });

  it('toggles prescription detail expansion smoothly and exposes accessible panel', async () => {
    patientPortalApi.getPatientPrescriptions.mockResolvedValueOnce(samplePrescriptions);

    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('toggle-details-btn-501')).toBeInTheDocument();
    });

    const toggleBtn = screen.getByTestId('toggle-details-btn-501');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('prescription-details-501')).not.toBeInTheDocument();

    // Expand
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('prescription-details-501')).toBeInTheDocument();
    expect(screen.getByText(/total medications/i)).toBeInTheDocument();

    // Collapse
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('prescription-details-501')).not.toBeInTheDocument();
  });

  it('filters prescriptions client-side by search query and status without extra API calls', async () => {
    patientPortalApi.getPatientPrescriptions.mockResolvedValueOnce(samplePrescriptions);

    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('prescriptions-toolbar')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('prescriptions-search-input');
    const statusSelect = screen.getByTestId('prescriptions-status-filter');

    // Search for Amoxicillin -> only 501 matches
    fireEvent.change(searchInput, { target: { value: 'Amoxicillin' } });
    expect(screen.getByTestId('prescription-card-501')).toBeInTheDocument();
    expect(screen.queryByTestId('prescription-card-502')).not.toBeInTheDocument();
    expect(screen.getByTestId('prescriptions-count-badge')).toHaveTextContent('1 Prescription');

    // Filter by status DRAFT while query is Amoxicillin -> 0 matches
    fireEvent.change(statusSelect, { target: { value: 'DRAFT' } });
    expect(screen.getByTestId('prescriptions-search-empty')).toBeInTheDocument();

    // Clear search query -> 502 matches DRAFT
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.queryByTestId('prescription-card-501')).not.toBeInTheDocument();
    expect(screen.getByTestId('prescription-card-502')).toBeInTheDocument();

    // Verify API was called only once during initial mount
    expect(patientPortalApi.getPatientPrescriptions).toHaveBeenCalledTimes(1);
  });

  it('renders My Prescriptions in AppHeader patient navigation', () => {
    render(
      <MemoryRouter initialEntries={['/patient/dashboard']}>
        <AppHeader />
      </MemoryRouter>
    );

    const prescriptionsLink = screen.getByRole('link', { name: /my prescriptions/i });
    expect(prescriptionsLink).toBeInTheDocument();
    expect(prescriptionsLink).toHaveAttribute('href', '/patient/prescriptions');
  });

  it('CRITICAL SECURITY: does NOT expose My Prescriptions in staff navigation', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockStaffUser,
      isAuthenticated: true,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/staff/dashboard']}>
        <AppHeader />
      </MemoryRouter>
    );

    // Staff navigation should contain staff "Prescriptions" (/prescriptions), NOT "My Prescriptions" (/patient/prescriptions)
    expect(screen.queryByRole('link', { name: /^my prescriptions$/i })).not.toBeInTheDocument();
    const staffPrescriptionLink = screen.getByRole('link', { name: /^prescriptions$/i });
    expect(staffPrescriptionLink).toHaveAttribute('href', '/prescriptions');
  });

  it('CRITICAL SECURITY: guards route with ProtectedRoute and denies staff access', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockStaffUser,
      isAuthenticated: true,
      isLoading: false
    });

    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <Routes>
          <Route
            path="/patient/prescriptions"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <PatientPrescriptionsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/staff/dashboard" element={<div data-testid="staff-redirect">Staff Home</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Staff is denied and redirected
    expect(screen.queryByTestId('patient-prescriptions-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('staff-redirect')).toBeInTheDocument();
  });

  it('CRITICAL SECURITY: never renders staff navigation, operational telemetry, or staff management modules', async () => {
    render(
      <MemoryRouter initialEntries={['/patient/prescriptions']}>
        <PatientPrescriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('patient-prescriptions-page')).toBeInTheDocument();
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
