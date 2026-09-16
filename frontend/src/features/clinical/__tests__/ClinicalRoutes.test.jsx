import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../../App';
import * as authApi from '../../auth/api/authApi';

vi.mock('../../inventory/api/inventoryApi', () => ({
  getItems: vi.fn().mockResolvedValue({ content: [], totalElements: 0 })
}));

vi.mock('../../inventory/api/movementApi', () => ({
  searchBatches: vi.fn().mockResolvedValue({ content: [], totalElements: 0 })
}));

vi.mock('../../inventory/api/alertApi', () => ({
  getLowStockAlerts: vi.fn().mockResolvedValue({ content: [], totalElements: 0 })
}));

vi.mock('../../auth/api/authApi', async () => {
  const actual = await vi.importActual('../../auth/api/authApi');
  return {
    ...actual,
    getCurrentUser: vi.fn().mockResolvedValue(null),
    getCsrfToken: vi.fn().mockResolvedValue({ token: 'test-csrf', headerName: 'X-XSRF-TOKEN' }),
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(true)
  };
});

describe('Clinical Module Route Integration Tests', () => {
  const dentistUser = {
    id: 1,
    email: 'dentist@dentcare.com',
    firstName: 'Dr. Sarah',
    lastName: 'Connor',
    role: 'DENTIST'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user from /clinical to /login', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={['/clinical']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Sign In/i, level: 1 })).toBeInTheDocument();
  });

  it('routes /clinical to ClinicalOverviewPage for authenticated user', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(dentistUser);

    render(
      <MemoryRouter initialEntries={['/clinical']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Clinical Management/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /clinical module navigation/i })).toBeInTheDocument();
    expect(screen.getByTestId('clinical-overview-placeholder')).toBeInTheDocument();
  });

  it('routes /clinical/examinations to ExaminationsPage for authenticated user', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(dentistUser);

    render(
      <MemoryRouter initialEntries={['/clinical/examinations']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Clinical Examinations/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /clinical module navigation/i })).toBeInTheDocument();
    expect(screen.getByTestId('examinations-page-placeholder')).toBeInTheDocument();
  });

  it('routes /clinical/examinations/:id to ExaminationDetailPage for authenticated user', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(dentistUser);

    render(
      <MemoryRouter initialEntries={['/clinical/examinations/42']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Examination #42/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('examination-detail-placeholder')).toBeInTheDocument();
  });

  it('routes /clinical/treatment-plans to TreatmentPlansPage for authenticated user', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(dentistUser);

    render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Treatment Plans/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /clinical module navigation/i })).toBeInTheDocument();
    expect(screen.getByTestId('treatment-plans-page-placeholder')).toBeInTheDocument();
  });

  it('routes /clinical/treatment-plans/:id to TreatmentPlanDetailPage for authenticated user', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(dentistUser);

    render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans/101']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Treatment Plan #101/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('treatment-plan-detail-placeholder')).toBeInTheDocument();
  });

  it('does not expose Clinical Management from the public landing page', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('public-landing-page')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Clinical Management/i })).not.toBeInTheDocument();
  });
});
