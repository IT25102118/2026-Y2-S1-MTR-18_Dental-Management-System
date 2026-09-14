import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('Frontend Runtime Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getCurrentUser.mockResolvedValue(null);
  });

  it('renders root page with application title and navigation links', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /DentCare/i, level: 1 })).toBeInTheDocument();
    const inventoryLink = screen.getByRole('link', { name: /Inventory Management/i });
    expect(inventoryLink).toBeInTheDocument();
    expect(inventoryLink).toHaveAttribute('href', '/inventory');

    const registerLink = screen.getByRole('link', { name: /Patient Registration/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');

    const loginLink = screen.getByRole('link', { name: /Sign In/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('renders root page with My Account link when authenticated', async () => {
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
      expect(screen.getByRole('link', { name: /My Account \(System\)/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /Sign In/i })).not.toBeInTheDocument();
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

  it('routes /inventory to the inventory overview landing page (public route)', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Inventory Management/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /inventory module navigation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Overview$/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /^Items$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Batches$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Alerts$/i })).toBeInTheDocument();

    expect(screen.getByTestId('overview-card-items')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card-batches')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card-low-stock')).toBeInTheDocument();
    expect(screen.getByTestId('overview-card-expiry')).toBeInTheDocument();
  });

  it('routes /inventory/items to the inventory catalog items page (public route)', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory/items']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Inventory Items/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Items$/i })).toHaveAttribute('aria-current', 'page');
  });

  it('contains zero fake auth or user identity context in rendered output', async () => {
    render(
      <MemoryRouter initialEntries={['/inventory']}>
        <App />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: /Inventory Management/i, level: 1 });

    expect(screen.queryByText(/fake user/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/dental assistant/i)).not.toBeInTheDocument();
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
});
