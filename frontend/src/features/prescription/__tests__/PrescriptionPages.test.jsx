import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../auth/context/AuthContext';
import PrescriptionStatusBadge from '../components/PrescriptionStatusBadge';
import PrescriptionListPage from '../pages/PrescriptionListPage';
import PrescriptionCreatePage from '../pages/PrescriptionCreatePage';
import PrescriptionDetailPage from '../pages/PrescriptionDetailPage';
import PrescriptionEditPage from '../pages/PrescriptionEditPage';
import * as prescriptionApi from '../api/prescriptionApi';
import * as authApi from '../../auth/api/authApi';

vi.mock('../api/prescriptionApi', () => ({
  getPrescriptions: vi.fn(),
  getPrescriptionById: vi.fn(),
  createPrescription: vi.fn(),
  updatePrescription: vi.fn(),
  finalizePrescription: vi.fn(),
  cancelPrescription: vi.fn()
}));

vi.mock('../../auth/api/authApi', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getCsrfToken: vi.fn()
}));

describe('PrescriptionStatusBadge', () => {
  it('renders Draft badge correctly', () => {
    render(<PrescriptionStatusBadge status="DRAFT" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Draft');
    expect(badge.className).toContain('badge-draft');
  });

  it('renders Finalized badge correctly', () => {
    render(<PrescriptionStatusBadge status="FINALIZED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Finalized');
    expect(badge.className).toContain('badge-finalized');
  });

  it('renders Cancelled badge correctly', () => {
    render(<PrescriptionStatusBadge status="CANCELLED" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent('Cancelled');
    expect(badge.className).toContain('badge-cancelled');
  });
});

describe('PrescriptionListPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authApi.getCurrentUser.mockResolvedValue(null);
  });

  it('renders empty state when no prescriptions exist', async () => {
    prescriptionApi.getPrescriptions.mockResolvedValue({
      content: [],
      number: 0,
      size: 20,
      totalPages: 0,
      totalElements: 0,
      first: true,
      last: true,
      empty: true
    });

    render(
        <MemoryRouter>
          <PrescriptionListPage />
        </MemoryRouter>
    );

    expect(
        screen.getByText(/Loading prescriptions.../i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
          screen.getByText(/No prescriptions recorded yet/i)
      ).toBeInTheDocument();
    });
  });

  it('renders prescription table rows with patient and status', async () => {
    prescriptionApi.getPrescriptions.mockResolvedValue({
      content: [
        {
          id: 1,
          patientId: 10,
          patientName: 'Jane Doe',
          dentistId: 2,
          dentistName: 'Dr. Smith',
          status: 'DRAFT',
          itemCount: 2,
          createdAt: '2026-09-14T01:00:00'
        },
        {
          id: 2,
          patientId: 11,
          patientName: 'Bob Miller',
          dentistId: 2,
          dentistName: 'Dr. Smith',
          status: 'FINALIZED',
          itemCount: 1,
          createdAt: '2026-09-14T01:00:00'
        }
      ],
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
          <PrescriptionListPage />
        </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Miller')).toBeInTheDocument();

      expect(
          screen.getByRole('status', {
            name: 'Prescription status: Draft'
          })
      ).toBeInTheDocument();

      expect(
          screen.getByRole('status', {
            name: 'Prescription status: Finalized'
          })
      ).toBeInTheDocument();
    });
  });
});

describe('PrescriptionCreatePage', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    authApi.getCurrentUser.mockResolvedValue({
      id: 2,
      firstName: 'Dr. Dentist',
      lastName: 'Surgeon',
      role: 'DENTIST'
    });
  });

  it('validates required fields and blocks submission when invalid', async () => {
    render(
        <MemoryRouter>
          <AuthProvider>
            <PrescriptionCreatePage />
          </AuthProvider>
        </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', {
      name: /Save as Draft/i
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
          screen.getByText(/Patient ID is required/i)
      ).toBeInTheDocument();

      expect(
          screen.getByText(/Medicine name is required/i)
      ).toBeInTheDocument();

      expect(
          screen.getByText(/Dosage is required/i)
      ).toBeInTheDocument();

      expect(
          screen.getByText(/Frequency is required/i)
      ).toBeInTheDocument();

      expect(
          screen.getByText(/Duration is required/i)
      ).toBeInTheDocument();
    });

    expect(
        prescriptionApi.createPrescription
    ).not.toHaveBeenCalled();
  });

  it('submits valid prescription draft and navigates', async () => {
    prescriptionApi.createPrescription.mockResolvedValue({
      id: 99
    });

    render(
        <MemoryRouter initialEntries={['/prescriptions/new']}>
          <AuthProvider>
            <Routes>
              <Route
                  path="/prescriptions/new"
                  element={<PrescriptionCreatePage />}
              />

              <Route
                  path="/prescriptions/:id"
                  element={<div>Detail Page 99</div>}
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
    );

    fireEvent.change(
        screen.getByLabelText(/Patient ID/i),
        {
          target: {
            value: '1'
          }
        }
    );

    fireEvent.change(
        screen.getByLabelText(/Prescribing Dentist ID/i),
        {
          target: {
            value: '2'
          }
        }
    );

    fireEvent.change(
        screen.getByLabelText(/Medicine Name/i),
        {
          target: {
            value: 'Amoxicillin'
          }
        }
    );

    fireEvent.change(
        screen.getByLabelText(/Dosage/i),
        {
          target: {
            value: '500mg'
          }
        }
    );

    fireEvent.change(
        screen.getByLabelText(/Frequency/i),
        {
          target: {
            value: '3x daily'
          }
        }
    );

    fireEvent.change(
        screen.getByLabelText(/Duration/i),
        {
          target: {
            value: '7 days'
          }
        }
    );

    fireEvent.change(
        screen.getByLabelText(/Quantity/i),
        {
          target: {
            value: '21'
          }
        }
    );

    const submitBtn = screen.getByRole('button', {
      name: /Save as Draft/i
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
          prescriptionApi.createPrescription
      ).toHaveBeenCalledWith(
          expect.objectContaining({
            patientId: 1,
            dentistId: 2,
            items: expect.arrayContaining([
              expect.objectContaining({
                medicineName: 'Amoxicillin',
                quantity: 21
              })
            ])
          })
      );

      expect(
          screen.getByText('Detail Page 99')
      ).toBeInTheDocument();
    });
  });
});

describe('PrescriptionDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    authApi.getCurrentUser.mockResolvedValue({
      id: 2,
      firstName: 'Dr. Dentist',
      lastName: 'Surgeon',
      role: 'DENTIST'
    });
  });

  it('renders DRAFT prescription with Edit, Finalize, and Cancel actions', async () => {
    prescriptionApi.getPrescriptionById.mockResolvedValue({
      id: 10,
      patientId: 1,
      patientName: 'Alice Patient',
      dentistId: 2,
      dentistName: 'Dr. Bob Dentist',
      status: 'DRAFT',
      notes: 'Post extraction',
      createdAt: '2026-09-14T01:00:00',
      updatedAt: '2026-09-14T01:00:00',
      items: [
        {
          id: 101,
          medicineName: 'Amoxicillin',
          strength: '500mg',
          dosage: '1 capsule',
          frequency: '3 times daily',
          duration: '5 days',
          quantity: 15,
          instructions: 'Take with food'
        }
      ]
    });

    render(
        <MemoryRouter initialEntries={['/prescriptions/10']}>
          <AuthProvider>
            <Routes>
              <Route
                  path="/prescriptions/:id"
                  element={<PrescriptionDetailPage />}
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
    );

    await waitFor(() => {
      expect(
          screen.getByText(/Prescription #10/i)
      ).toBeInTheDocument();

      expect(
          screen.getByText('Alice Patient')
      ).toBeInTheDocument();

      expect(
          screen.getByText('Amoxicillin')
      ).toBeInTheDocument();

      expect(
          screen.getByRole('link', {
            name: /Edit Draft/i
          })
      ).toBeInTheDocument();

      expect(
          screen.getByRole('button', {
            name: /Finalize Prescription/i
          })
      ).toBeInTheDocument();
    });
  });

  it('allows finalization when confirmed by authorized dentist', async () => {
    prescriptionApi.getPrescriptionById.mockResolvedValue({
      id: 10,
      patientId: 1,
      patientName: 'Alice Patient',
      dentistId: 2,
      dentistName: 'Dr. Bob Dentist',
      status: 'DRAFT',
      createdAt: '2026-09-14T01:00:00',
      updatedAt: '2026-09-14T01:00:00',
      items: [
        {
          id: 101,
          medicineName: 'Amoxicillin',
          dosage: '500mg',
          frequency: '3x daily',
          duration: '5 days',
          quantity: 15
        }
      ]
    });

    prescriptionApi.finalizePrescription.mockResolvedValue({
      id: 10,
      patientId: 1,
      dentistId: 2,
      status: 'FINALIZED',
      finalizedAt: '2026-09-14T01:10:00',
      createdAt: '2026-09-14T01:00:00',
      updatedAt: '2026-09-14T01:10:00',
      items: []
    });

    render(
        <MemoryRouter initialEntries={['/prescriptions/10']}>
          <AuthProvider>
            <Routes>
              <Route
                  path="/prescriptions/:id"
                  element={<PrescriptionDetailPage />}
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
    );

    await waitFor(() => {
      expect(
          screen.getByRole('button', {
            name: /Finalize Prescription/i
          })
      ).toBeInTheDocument();
    });

    fireEvent.click(
        screen.getByRole('button', {
          name: /Finalize Prescription/i
        })
    );

    // Modal appears
    expect(
        screen.getByText(/Finalize Prescription #10\?/i)
    ).toBeInTheDocument();

    fireEvent.click(
        screen.getByRole('button', {
          name: /Yes, Finalize Prescription/i
        })
    );

    await waitFor(() => {
      expect(
          prescriptionApi.finalizePrescription
      ).toHaveBeenCalledWith('10', '2');

      expect(
          screen.getByText(/Prescription has been finalized/i)
      ).toBeInTheDocument();
    });
  });

  it('locks finalized prescription into read-only mode and hides edit button', async () => {
    prescriptionApi.getPrescriptionById.mockResolvedValue({
      id: 15,
      patientId: 1,
      dentistId: 2,
      status: 'FINALIZED',
      finalizedAt: '2026-09-14T01:00:00',
      createdAt: '2026-09-14T01:00:00',
      updatedAt: '2026-09-14T01:00:00',
      items: []
    });

    render(
        <MemoryRouter initialEntries={['/prescriptions/15']}>
          <AuthProvider>
            <Routes>
              <Route
                  path="/prescriptions/:id"
                  element={<PrescriptionDetailPage />}
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
    );

    await waitFor(() => {
      expect(
          screen.getByText(/Prescription #15/i)
      ).toBeInTheDocument();

      expect(
          screen.queryByRole('link', {
            name: /Edit Draft/i
          })
      ).not.toBeInTheDocument();

      expect(
          screen.getByRole('button', {
            name: /Print \/ Save PDF/i
          })
      ).toBeInTheDocument();
    });
  });
});

describe('PrescriptionEditPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('blocks editing if prescription is already FINALIZED', async () => {
    prescriptionApi.getPrescriptionById.mockResolvedValue({
      id: 20,
      patientId: 1,
      dentistId: 2,
      status: 'FINALIZED',
      createdAt: '2026-09-14T01:00:00',
      updatedAt: '2026-09-14T01:00:00',
      items: []
    });

    render(
        <MemoryRouter
            initialEntries={['/prescriptions/20/edit']}
        >
          <Routes>
            <Route
                path="/prescriptions/:id/edit"
                element={<PrescriptionEditPage />}
            />
          </Routes>
        </MemoryRouter>
    );

    await waitFor(() => {
      expect(
          screen.getByText(
              /Cannot Edit Non-Draft Prescription/i
          )
      ).toBeInTheDocument();

      expect(
          screen.queryByRole('button', {
            name: /Save Changes/i
          })
      ).not.toBeInTheDocument();
    });
  });
});