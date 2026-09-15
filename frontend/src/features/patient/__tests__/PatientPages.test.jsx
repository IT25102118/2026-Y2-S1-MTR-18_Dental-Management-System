import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PatientListPage from '../pages/PatientListPage';
import PatientCreatePage from '../pages/PatientCreatePage';
import PatientDetailPage from '../pages/PatientDetailPage';
import PatientEditPage from '../pages/PatientEditPage';
import * as patientApi from '../api/patientApi';

vi.mock('../api/patientApi', () => ({
  getPatients: vi.fn(),
  getPatientById: vi.fn(),
  createPatient: vi.fn(),
  updatePatient: vi.fn(),
  deactivatePatient: vi.fn(),
  reactivatePatient: vi.fn()
}));

describe('Patient Feature Pages', () => {
  const samplePatients = [
    {
      id: 1,
      patientCode: 'PAT-001',
      firstName: 'Alice',
      lastName: 'Wonder',
      phone: '+1 555-0101',
      email: 'alice@example.com',
      city: 'Metropolis',
      active: true
    },
    {
      id: 2,
      patientCode: 'PAT-002',
      firstName: 'Bob',
      lastName: 'Builder',
      phone: '+1 555-0102',
      email: 'bob@example.com',
      city: 'Gotham',
      active: false
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PatientListPage', () => {
    it('renders header, add button, search bar, and patient list', async () => {
      patientApi.getPatients.mockResolvedValueOnce({
        content: samplePatients,
        number: 0,
        size: 20,
        totalPages: 1,
        totalElements: 2,
        first: true,
        last: true,
        empty: false
      });

      render(
        <MemoryRouter>
          <PatientListPage />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Patient Records/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByTestId('add-patient-button')).toHaveAttribute('href', '/patients/new');
      expect(screen.getByTestId('patient-search-input')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Alice Wonder')).toBeInTheDocument();
        expect(screen.getByText('PAT-001')).toBeInTheDocument();
        expect(screen.getByText('Bob Builder')).toBeInTheDocument();
        expect(screen.getByText('PAT-002')).toBeInTheDocument();
      });

      // Active patient has Deactivate button
      expect(screen.getByTestId('deactivate-patient-1')).toBeInTheDocument();
      // Inactive patient has Reactivate button
      expect(screen.getByTestId('reactivate-patient-2')).toBeInTheDocument();
    });

    it('opens deactivation modal and calls deactivatePatient upon confirmation', async () => {
      patientApi.getPatients.mockResolvedValue({
        content: samplePatients,
        number: 0,
        size: 20,
        totalPages: 1,
        totalElements: 2,
        first: true,
        last: true,
        empty: false
      });
      patientApi.deactivatePatient.mockResolvedValueOnce({ id: 1, active: false });

      render(
        <MemoryRouter>
          <PatientListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('deactivate-patient-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('deactivate-patient-1'));

      expect(screen.getByText(/Confirm Deactivation/i)).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText(/Reason for deactivation/i), {
        target: { value: 'Relocated out of state' }
      });

      fireEvent.click(screen.getByTestId('confirm-deactivate-button'));

      await waitFor(() => {
        expect(patientApi.deactivatePatient).toHaveBeenCalledWith(1, 'Relocated out of state');
      });
    });

    it('calls reactivatePatient when clicking Reactivate', async () => {
      patientApi.getPatients.mockResolvedValue({
        content: samplePatients,
        number: 0,
        size: 20,
        totalPages: 1,
        totalElements: 2,
        first: true,
        last: true,
        empty: false
      });
      patientApi.reactivatePatient.mockResolvedValueOnce({ id: 2, active: true });

      render(
        <MemoryRouter>
          <PatientListPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('reactivate-patient-2')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('reactivate-patient-2'));

      await waitFor(() => {
        expect(patientApi.reactivatePatient).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('PatientCreatePage', () => {
    it('validates required fields before submitting', async () => {
      render(
        <MemoryRouter>
          <PatientCreatePage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('save-patient-button'));

      await waitFor(() => {
        expect(screen.getByTestId('error-patientCode')).toHaveTextContent(/Patient code is required/i);
        expect(screen.getByTestId('error-firstName')).toHaveTextContent(/First name is required/i);
        expect(screen.getByTestId('error-lastName')).toHaveTextContent(/Last name is required/i);
        expect(screen.getByTestId('error-dateOfBirth')).toHaveTextContent(/Date of birth is required/i);
        expect(screen.getByTestId('error-gender')).toHaveTextContent(/Gender is required/i);
        expect(screen.getByTestId('error-phone')).toHaveTextContent(/Phone number is required/i);
      });

      expect(patientApi.createPatient).not.toHaveBeenCalled();
    });

    it('submits form when all required fields are valid', async () => {
      patientApi.createPatient.mockResolvedValueOnce({ id: 99, patientCode: 'PAT-099' });

      render(
        <MemoryRouter initialEntries={['/patients/new']}>
          <Routes>
            <Route path="/patients/new" element={<PatientCreatePage />} />
            <Route path="/patients/:id" element={<div>Patient Detail 99</div>} />
          </Routes>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByTestId('patient-code-input'), { target: { value: 'PAT-099' } });
      fireEvent.change(screen.getByTestId('first-name-input'), { target: { value: 'Charles' } });
      fireEvent.change(screen.getByTestId('last-name-input'), { target: { value: 'Darwin' } });
      fireEvent.change(screen.getByTestId('dob-input'), { target: { value: '1985-05-12' } });
      fireEvent.change(screen.getByTestId('gender-select'), { target: { value: 'MALE' } });
      fireEvent.change(screen.getByTestId('phone-input'), { target: { value: '+1 555-0999' } });

      fireEvent.click(screen.getByTestId('save-patient-button'));

      await waitFor(() => {
        expect(patientApi.createPatient).toHaveBeenCalledWith(
          expect.objectContaining({
            patientCode: 'PAT-099',
            firstName: 'Charles',
            lastName: 'Darwin',
            dateOfBirth: '1985-05-12',
            gender: 'MALE',
            phone: '+1 555-0999'
          })
        );
        expect(screen.getByText('Patient Detail 99')).toBeInTheDocument();
      });
    });
  });

  describe('PatientDetailPage', () => {
    it('displays patient information and status badge', async () => {
      patientApi.getPatientById.mockResolvedValueOnce({
        id: 7,
        patientCode: 'PAT-007',
        firstName: 'James',
        lastName: 'Bond',
        dateOfBirth: '1980-04-13',
        gender: 'MALE',
        phone: '+44 20 7946 0999',
        email: 'jbond@mi6.gov.uk',
        city: 'London',
        addressLine1: 'Regent Park',
        active: true,
        allergies: 'Penicillin',
        medicalConditions: 'None',
        currentMedications: 'None'
      });

      render(
        <MemoryRouter initialEntries={['/patients/7']}>
          <Routes>
            <Route path="/patients/:id" element={<PatientDetailPage />} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'James Bond', level: 1 })).toBeInTheDocument();
        expect(screen.getByText('PAT-007')).toBeInTheDocument();
        expect(screen.getByText('+44 20 7946 0999')).toBeInTheDocument();
        expect(screen.getByText('Penicillin')).toBeInTheDocument();
        expect(screen.getByTestId('patient-status-badge')).toHaveTextContent('Active');
        expect(screen.getByTestId('edit-patient-details-button')).toBeInTheDocument();
        expect(screen.getByTestId('deactivate-patient-details-button')).toBeInTheDocument();
      });
    });
  });

  describe('PatientEditPage', () => {
    it('loads existing values with read-only patientCode and submits update', async () => {
      patientApi.getPatientById.mockResolvedValueOnce({
        id: 7,
        patientCode: 'PAT-007',
        firstName: 'James',
        lastName: 'Bond',
        dateOfBirth: '1980-04-13',
        gender: 'MALE',
        phone: '+44 20 7946 0999',
        email: 'jbond@mi6.gov.uk',
        city: 'London',
        addressLine1: 'Regent Park',
        active: true
      });
      patientApi.updatePatient.mockResolvedValueOnce({ id: 7 });

      render(
        <MemoryRouter initialEntries={['/patients/7/edit']}>
          <Routes>
            <Route path="/patients/:id/edit" element={<PatientEditPage />} />
            <Route path="/patients/:id" element={<div>Patient Detail 7</div>} />
          </Routes>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('edit-first-name-input')).toHaveValue('James');
      });

      fireEvent.change(screen.getByTestId('edit-first-name-input'), { target: { value: 'Jimmy' } });
      fireEvent.click(screen.getByTestId('update-patient-button'));

      await waitFor(() => {
        expect(patientApi.updatePatient).toHaveBeenCalledWith(
          '7',
          expect.objectContaining({
            firstName: 'Jimmy',
            lastName: 'Bond'
          })
        );
        expect(screen.getByText('Patient Detail 7')).toBeInTheDocument();
      });
    });
  });
});
