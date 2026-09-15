import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import * as AuthContextModule from '../context/AuthContext';
import { AuthApiError } from '../api/authApi';

function DestinationWatcher() {
  const location = useLocation();
  return <div data-testid="target-location">{location.pathname}</div>;
}

describe('LoginPage', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      login: mockLogin,
      status: 'unauthenticated',
      isAuthenticated: false
    });
  });

  it('renders email and password inputs and submit button', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-button')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register as a Patient/i })).toHaveAttribute(
      'href',
      '/register'
    );
  });

  it('shows client-side validation error when submitting blank fields', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('login-submit-button'));

    expect(await screen.findByTestId('login-error-alert')).toHaveTextContent(
      'Please enter both email and password.'
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('submits credentials and navigates staff to /staff/dashboard by default', async () => {
    mockLogin.mockResolvedValueOnce({
      id: 1,
      email: 'admin@dentcare.com',
      role: 'ADMINISTRATOR'
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/staff/dashboard" element={<DestinationWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'admin@dentcare.com' }
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'ValidPassword123' }
    });
    fireEvent.click(screen.getByTestId('login-submit-button'));

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'admin@dentcare.com',
      password: 'ValidPassword123'
    });

    await waitFor(() => {
      expect(screen.getByTestId('target-location')).toHaveTextContent('/staff/dashboard');
    });
  });

  it('navigates to return-to internal destination preserved in location state', async () => {
    mockLogin.mockResolvedValueOnce({
      id: 2,
      email: 'dentist@dentcare.com',
      role: 'DENTIST'
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: '/inventory/items/12' }
          }
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/inventory/items/:id" element={<DestinationWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'dentist@dentcare.com' }
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'ValidPassword123' }
    });
    fireEvent.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('target-location')).toHaveTextContent('/inventory/items/12');
    });
  });

  it('rejects protocol-relative open redirect and safely defaults to the patient dashboard', async () => {
    mockLogin.mockResolvedValueOnce({
      id: 3,
      email: 'user@dentcare.com',
      role: 'PATIENT'
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: '//attacker.com/evil' }
          }
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/patient/dashboard" element={<DestinationWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'user@dentcare.com' }
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'ValidPassword123' }
    });
    fireEvent.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('target-location')).toHaveTextContent('/patient/dashboard');
    });
  });

  it('does not honor a staff return target for a PATIENT login', async () => {
    mockLogin.mockResolvedValueOnce({ id: 4, email: 'patient@dentcare.com', role: 'PATIENT' });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: '/clinical/examinations/42' } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/patient/dashboard" element={<DestinationWatcher />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'patient@dentcare.com' }
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'ValidPassword123' }
    });
    fireEvent.click(screen.getByTestId('login-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('target-location')).toHaveTextContent('/patient/dashboard');
    });
  });

  it('prefills only the registered email supplied through navigation state', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { prefillEmail: 'new.patient@example.com' } }]}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-email-input')).toHaveValue('new.patient@example.com');
    expect(screen.getByTestId('login-password-input')).toHaveValue('');
  });

  it('displays generic error on 401 Unauthorized', async () => {
    mockLogin.mockRejectedValueOnce(new AuthApiError(401, 'Invalid email or password'));

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'wrong@dentcare.com' }
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'BadPassword123' }
    });
    fireEvent.click(screen.getByTestId('login-submit-button'));

    expect(await screen.findByTestId('login-error-alert')).toHaveTextContent(
      'Invalid email or password'
    );
  });

  it('displays distinct security message on 403 CSRF failure', async () => {
    mockLogin.mockRejectedValueOnce(new AuthApiError(403, 'Forbidden'));

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'user@dentcare.com' }
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'Password123' }
    });
    fireEvent.click(screen.getByTestId('login-submit-button'));

    expect(await screen.findByTestId('login-error-alert')).toHaveTextContent(
      'Security validation failed. Please refresh the page and try again.'
    );
  });

  it('displays connection error on network failure (status 0)', async () => {
    mockLogin.mockRejectedValueOnce(new AuthApiError(0, 'Network disconnected'));

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('login-email-input'), {
      target: { value: 'user@dentcare.com' }
    });
    fireEvent.change(screen.getByTestId('login-password-input'), {
      target: { value: 'Password123' }
    });
    fireEvent.click(screen.getByTestId('login-submit-button'));

    expect(await screen.findByTestId('login-error-alert')).toHaveTextContent(
      'Unable to connect to the authentication service. Please check your connection.'
    );
  });
});
