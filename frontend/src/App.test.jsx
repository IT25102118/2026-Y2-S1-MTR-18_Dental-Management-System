import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import * as authApi from './features/auth/api/authApi';

vi.mock('./features/inventory/api/inventoryApi', () => ({
  getItems: vi.fn().mockResolvedValue({
    content: [],
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 12,
    first: true,
    last: true,
    empty: false
  })
}));

vi.mock('./features/inventory/api/movementApi', () => ({
  searchBatches: vi.fn().mockResolvedValue({
    content: [],
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 5,
    first: true,
    last: true,
    empty: false
  })
}));

vi.mock('./features/inventory/api/alertApi', () => ({
  getLowStockAlerts: vi.fn().mockResolvedValue({
    content: [],
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 2,
    first: true,
    last: true,
    empty: false
  })
}));

vi.mock('./features/billing/api/billingApi', () => ({
  getInvoices: vi.fn().mockResolvedValue([])
}));

vi.mock('./features/auth/api/authApi', async () => {
  const actual = await vi.importActual('./features/auth/api/authApi');
  return {
    ...actual,
    getCurrentUser: vi.fn().mockResolvedValue(null),
    getCsrfToken: vi.fn().mockResolvedValue({ token: 'test-csrf', headerName: 'X-XSRF-TOKEN' }),
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(true)
  };
});

vi.mock('./features/auth/api/staffApi', () => ({
  getAllStaff: vi.fn().mockResolvedValue([]),
  provisionStaff: vi.fn(),
  updateStaff: vi.fn(),
  updateStaffStatus: vi.fn()
}));

describe('Frontend Runtime Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getCurrentUser.mockResolvedValue(null);
  });

  it('renders a public landing page without operational module links', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /A clear, secure way to access dental care/i, level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Inventory Management/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Clinical Management/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Invoices & Billing/i })).not.toBeInTheDocument();

    const registerLinks = screen.getAllByRole('link', { name: /Patient Registration/i });
    expect(registerLinks.length).toBeGreaterThanOrEqual(1);
    expect(registerLinks[0]).toHaveAttribute('href', '/register');

    const loginLinks = screen.getAllByRole('link', { name: /Sign In/i });
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
    expect(loginLinks[0]).toHaveAttribute('href', '/login');
  });

  it('renders enhanced product capabilities, security architecture, and FAQ sections on the landing page', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Integrated tools built for dental practices/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Access designed around verified roles/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Frequently asked questions/i, level: 2 })).toBeInTheDocument();

    expect(screen.getByText(/Examinations, Tooth Charting & Treatment Plans/i)).toBeInTheDocument();
    expect(screen.getByText(/Prescription Authoring/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventory & Batch Tracking/i)).toBeInTheDocument();
    expect(screen.getByText(/Invoices & Payment Receipts/i)).toBeInTheDocument();

    // Verify operational module routes remain inaccessible via navigation links
    expect(screen.queryByRole('link', { name: /^Inventory$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Clinical$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Prescriptions$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Billing$/i })).not.toBeInTheDocument();
  });

  it('redirects an authenticated administrator from root to the staff dashboard', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: 'admin@dentcare.com',
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMINISTRATOR'
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('staff-dashboard')).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /Staff dashboard/i, level: 1 })).toBeInTheDocument();
    const staffLinks = screen.getAllByRole('link', { name: /Staff Management/i });
    expect(staffLinks.length).toBeGreaterThanOrEqual(1);
    expect(staffLinks[0]).toHaveAttribute('href', '/admin/staff');
  });

  it('routes /login to the login page (public route)', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Sign In/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-button')).toBeInTheDocument();
  });

  it('routes /register to the patient registration page (public route)', async () => {
    render(
      <MemoryRouter initialEntries={['/register']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /patient registration/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register patient account/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated access from /account to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/account']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Sign In/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
  });

  it('allows authenticated access to /account', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: 'dentist@dentcare.com',
      firstName: 'Sarah',
      lastName: 'Connor',
      phone: '+1 555-0199',
      role: 'DENTIST'
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /My Account/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('account-user-name')).toHaveTextContent('Sarah Connor');
    expect(screen.getByTestId('account-role-badge')).toHaveTextContent('DENTIST');
  });

  it('redirects unauthenticated access from /inventory to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Sign In/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
  });

  it('redirects unauthenticated access from /inventory/items to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory/items']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Sign In/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
  });

  it('routes /inventory to overview page when authenticated', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: 'admin@dentcare.com',
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMINISTRATOR'
    });

    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Inventory Management/i, level: 1 })).toBeInTheDocument();
    const invNav = screen.getByRole('navigation', { name: /inventory module navigation/i });
    expect(invNav).toBeInTheDocument();
    expect(within(invNav).getByRole('link', { name: /^Overview$/i })).toHaveAttribute('aria-current', 'page');
    expect(within(invNav).getByRole('link', { name: /^Items$/i })).toBeInTheDocument();
    expect(within(invNav).getByRole('link', { name: /^Batches$/i })).toBeInTheDocument();
    expect(within(invNav).getByRole('link', { name: /^Alerts$/i })).toBeInTheDocument();

    expect(screen.getByTestId('overview-card-items')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card-batches')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card-low-stock')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card-expiry')).toBeInTheDocument();
  });

  it('routes /inventory/items to catalog items page when authenticated', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: 'dentist@dentcare.com',
      firstName: 'Sarah',
      lastName: 'Connor',
      role: 'DENTIST'
    });

    render(
      <MemoryRouter initialEntries={['/inventory/items']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Inventory Items/i, level: 1 })).toBeInTheDocument();
    const invNav = screen.getByRole('navigation', { name: /inventory module navigation/i });
    expect(within(invNav).getByRole('link', { name: /^Items$/i })).toHaveAttribute('aria-current', 'page');
  });

  it('contains zero fake auth or user identity context in rendered output', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: 'admin@dentcare.com',
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMINISTRATOR'
    });

    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: /Inventory Management/i, level: 1 });

    expect(screen.queryByText(/fake user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/responsibleUserId/i)).not.toBeInTheDocument();
    expect(screen.getByText(/shared authentication\/current-user integration/i)).toBeInTheDocument();
  });

  it('routes /billing/invoices to invoice list page when authenticated as staff', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: 'reception@dentcare.com',
      firstName: 'Reception',
      lastName: 'Staff',
      role: 'RECEPTIONIST'
    });

    render(
      <MemoryRouter initialEntries={['/billing/invoices']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /^Invoices$/i, level: 1 })).toBeInTheDocument();
  });

  it('redirects unauthenticated access from /billing/invoices to /login', async () => {
    render(
      <MemoryRouter initialEntries={['/billing/invoices']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Sign In/i, level: 1 })).toBeInTheDocument();
  });

  it('allows administrator to access /admin/staff', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 1,
      email: 'admin@dentcare.com',
      firstName: 'System',
      lastName: 'Admin',
      role: 'ADMINISTRATOR'
    });

    render(
      <MemoryRouter initialEntries={['/admin/staff']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Staff Account Management/i, level: 1 })).toBeInTheDocument();
  });

  it('denies PATIENT access to /admin/staff and returns the user to the patient dashboard', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 2,
      email: 'patient@dentcare.com',
      firstName: 'John',
      lastName: 'Patient',
      role: 'PATIENT'
    });

    render(
      <MemoryRouter initialEntries={['/admin/staff']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('patient-dashboard')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/reserved for authorized clinic staff/i);
    expect(screen.queryByRole('heading', { name: /Staff Account Management/i, level: 1 })).not.toBeInTheDocument();
  });

  it('routes a successful PATIENT login to the patient dashboard', async () => {
    authApi.login.mockResolvedValueOnce({
      id: 7,
      email: 'patient@dentcare.com',
      firstName: 'Nimali',
      lastName: 'Silva',
      role: 'PATIENT'
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    fireEvent.change(await screen.findByTestId('login-email-input'), { target: { value: 'patient@dentcare.com' } });
    fireEvent.change(screen.getByTestId('login-password-input'), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByTestId('login-submit-button'));

    expect(await screen.findByTestId('patient-dashboard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Patient Dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Inventory$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Clinical$/i })).not.toBeInTheDocument();
  });

  it('routes a successful staff login to the staff dashboard', async () => {
    authApi.login.mockResolvedValueOnce({
      id: 8,
      email: 'assistant@dentcare.com',
      firstName: 'Kamal',
      lastName: 'Perera',
      role: 'DENTAL_ASSISTANT'
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    fireEvent.change(await screen.findByTestId('login-email-input'), { target: { value: 'assistant@dentcare.com' } });
    fireEvent.change(screen.getByTestId('login-password-input'), { target: { value: 'Password123' } });
    fireEvent.click(screen.getByTestId('login-submit-button'));

    expect(await screen.findByTestId('staff-dashboard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Staff Dashboard/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Billing$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Staff Management/i })).not.toBeInTheDocument();
  });

  it.each([
    ['PATIENT', '/patient/dashboard', 'patient-dashboard'],
    ['DENTIST', '/staff/dashboard', 'staff-dashboard']
  ])('redirects authenticated %s users away from login and registration', async (role, destination, testId) => {
    authApi.getCurrentUser.mockResolvedValue({
      id: 9,
      email: `${role.toLowerCase()}@dentcare.com`,
      firstName: 'Existing',
      lastName: 'User',
      role
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter initialEntries={['/register']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByTestId(testId)).toBeInTheDocument();
    expect(destination).toMatch(/^\/(patient|staff)\/dashboard$/);
  });

  it('does not expose guest controls while authentication hydration is pending', () => {
    authApi.getCurrentUser.mockReturnValueOnce(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/Checking session/i)).toBeInTheDocument();
    expect(screen.queryByTestId('header-login-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('header-register-link')).not.toBeInTheDocument();
    expect(screen.queryByTestId('public-landing-page')).not.toBeInTheDocument();
  });
});

