import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import AccountPage from '../pages/AccountPage';
import * as AuthContextModule from '../context/AuthContext';
import { AuthApiError } from '../api/authApi';

function LoginDestinationWatcher() {
  const location = useLocation();
  return <div data-testid="login-path">{location.pathname}</div>;
}

describe('AccountPage', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders safe user profile fields for an ADMINISTRATOR user', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'admin@dentcare.com',
        firstName: 'System',
        lastName: 'Admin',
        phone: '+1 555-0100',
        role: 'ADMINISTRATOR'
      },
      logout: mockLogout
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /My Account/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByTestId('account-user-name')).toHaveTextContent('System Admin');
    expect(screen.getByTestId('account-user-email')).toHaveTextContent('admin@dentcare.com');
    expect(screen.getByTestId('account-user-phone')).toHaveTextContent('+1 555-0100');
    expect(screen.getByTestId('account-role-badge')).toHaveTextContent('ADMINISTRATOR');
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
  });

  it('renders fallback for missing phone and displays RECEPTIONIST role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 2,
        email: 'desk@dentcare.com',
        firstName: 'Front',
        lastName: 'Desk',
        phone: null,
        role: 'RECEPTIONIST'
      },
      logout: mockLogout
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('account-user-phone')).toHaveTextContent('Not provided');
    expect(screen.getByTestId('account-role-badge')).toHaveTextContent('RECEPTIONIST');
  });

  it('renders correctly for DENTIST, DENTAL_ASSISTANT, and PATIENT roles', () => {
    const roles = ['DENTIST', 'DENTAL_ASSISTANT', 'PATIENT'];

    for (const role of roles) {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: {
          id: 3,
          email: `${role.toLowerCase()}@dentcare.com`,
          firstName: 'Clinic',
          lastName: 'Staff',
          role
        },
        logout: mockLogout
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/account']}>
          <AccountPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('account-role-badge')).toHaveTextContent(role);
      unmount();
    }
  });

  it('calls logout and navigates to /login on successful logout', async () => {
    mockLogout.mockResolvedValueOnce(true);

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'user@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<LoginDestinationWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId('login-path')).toHaveTextContent('/login');
    });
  });

  it('retains page and displays error alert when logout fails with 403', async () => {
    mockLogout.mockRejectedValueOnce(new AuthApiError(403, 'Forbidden'));

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'user@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<LoginDestinationWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('logout-button'));

    expect(await screen.findByTestId('logout-error-alert')).toHaveTextContent(
      'Logout failed: Security validation error. Please try again.'
    );
    // Did NOT navigate to /login
    expect(screen.queryByTestId('login-path')).not.toBeInTheDocument();
    expect(screen.getByTestId('account-user-email')).toHaveTextContent('user@dentcare.com');
  });

  it('retains page and displays connection error when logout fails with network error', async () => {
    mockLogout.mockRejectedValueOnce(new AuthApiError(0, 'Network disconnected'));

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'user@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('logout-button'));

    expect(await screen.findByTestId('logout-error-alert')).toHaveTextContent(
      'Logout failed: Network connection error. Please try again.'
    );
  });
});
