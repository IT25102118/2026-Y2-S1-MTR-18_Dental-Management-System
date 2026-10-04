import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PatientRegistrationPage from '../pages/PatientRegistrationPage';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    registerPatient: vi.fn()
  };
});

describe('PatientRegistrationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form input fields, accessible labels, branding and submit button', () => {
    const { container } = render(
      <MemoryRouter>
        <PatientRegistrationPage />
      </MemoryRouter>
    );

    // Accessible title and branding
    expect(screen.getByRole('heading', { name: /patient registration/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/create your dentcare account/i)).toBeInTheDocument();
    expect(screen.getByText(/^first name/i)).toBeInTheDocument();
    expect(screen.getByText(/^last name/i)).toBeInTheDocument();
    expect(screen.getByText(/^email address/i)).toBeInTheDocument();
    expect(screen.getByText(/^phone number/i)).toBeInTheDocument();
    expect(screen.getByText(/^password/i)).toBeInTheDocument();
    expect(screen.getByText(/^confirm password/i)).toBeInTheDocument();

    expect(container.querySelector('#firstName')).toBeInTheDocument();
    expect(container.querySelector('#lastName')).toBeInTheDocument();
    expect(container.querySelector('#email')).toBeInTheDocument();
    expect(container.querySelector('#phone')).toBeInTheDocument();
    expect(container.querySelector('#password')).toBeInTheDocument();
    expect(container.querySelector('#confirmPassword')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create patient account|register patient account/i })).toBeInTheDocument();

    // Sign in link targeting /patient/login
    const loginLink = screen.getByRole('link', { name: /sign in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/patient/login');
  });

  it('validates required fields client-side before calling the API', async () => {
    render(
      <MemoryRouter>
        <PatientRegistrationPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /create patient account|register patient account/i }));

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();

    expect(authApi.registerPatient).not.toHaveBeenCalled();
  });

  it('validates password requirements and mismatch', async () => {
    const { container } = render(
      <MemoryRouter>
        <PatientRegistrationPage />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('#firstName'), { target: { value: 'Alice' } });
    fireEvent.change(container.querySelector('#lastName'), { target: { value: 'Smith' } });
    fireEvent.change(container.querySelector('#email'), { target: { value: 'alice@example.com' } });
    fireEvent.change(container.querySelector('#password'), { target: { value: 'short1' } });
    fireEvent.change(container.querySelector('#confirmPassword'), { target: { value: 'different1' } });

    fireEvent.click(screen.getByRole('button', { name: /create patient account|register patient account/i }));

    expect(await screen.findByText(/between 8 and 100 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(authApi.registerPatient).not.toHaveBeenCalled();
  });

  it('submits valid registration, replaces form with confirmed success state, and personalizes welcome message', async () => {
    authApi.registerPatient.mockResolvedValueOnce({
      id: 42,
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1 555-0199',
      role: 'PATIENT',
      active: true,
      createdAt: '2026-09-06T10:00:00'
    });

    function LoginDestination() {
      const location = useLocation();
      return <div data-testid="login-destination-state">{JSON.stringify(location.state)}</div>;
    }

    const { container } = render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<PatientRegistrationPage />} />
          <Route path="/patient/login" element={<LoginDestination />} />
          <Route path="/login" element={<LoginDestination />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('#firstName'), { target: { value: 'John' } });
    fireEvent.change(container.querySelector('#lastName'), { target: { value: 'Doe' } });
    fireEvent.change(container.querySelector('#email'), { target: { value: 'john.doe@example.com' } });
    fireEvent.change(container.querySelector('#phone'), { target: { value: '+1 555-0199' } });
    fireEvent.change(container.querySelector('#password'), { target: { value: 'Password123' } });
    fireEvent.change(container.querySelector('#confirmPassword'), { target: { value: 'Password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create patient account|register patient account/i }));

    await waitFor(() => {
      expect(authApi.registerPatient).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1 555-0199',
        password: 'Password123'
      });
    });

    // Check that confirmPassword was NOT passed to registerPatient
    const callArgs = authApi.registerPatient.mock.calls[0][0];
    expect(callArgs.confirmPassword).toBeUndefined();

    // Verify registration form is hidden/replaced by confirmed success state
    expect(screen.queryByLabelText(/personal details/i)).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /registration successful/i })).toBeInTheDocument();
    expect(screen.getByText(/welcome to dentcare, john!/i)).toBeInTheDocument();
    expect(screen.getByText(/your patient account has been created successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/john\.doe@example\.com/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to home/i })).toBeInTheDocument();

    const signInLink = screen.getByRole('link', { name: /continue to patient login/i });
    expect(signInLink).toHaveAttribute('href', '/patient/login');
    expect(signInLink).not.toHaveAttribute('href', expect.stringContaining('Password123'));
    fireEvent.click(signInLink);
    expect(screen.getByTestId('login-destination-state')).toHaveTextContent('john.doe@example.com');
    expect(screen.getByTestId('login-destination-state')).not.toHaveTextContent('Password123');
  });

  it('does not display success state on API failure and retains entered form values and error feedback', async () => {
    authApi.registerPatient.mockRejectedValueOnce(new Error('Network error occurred'));

    const { container } = render(
      <MemoryRouter>
        <PatientRegistrationPage />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('#firstName'), { target: { value: 'Sam' } });
    fireEvent.change(container.querySelector('#lastName'), { target: { value: 'Vance' } });
    fireEvent.change(container.querySelector('#email'), { target: { value: 'sam@example.com' } });
    fireEvent.change(container.querySelector('#password'), { target: { value: 'Password123' } });
    fireEvent.change(container.querySelector('#confirmPassword'), { target: { value: 'Password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create patient account|register patient account/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error occurred/i)).toBeInTheDocument();
    });

    // Form is retained, success view is NOT displayed
    expect(screen.queryByRole('heading', { name: /registration successful/i })).not.toBeInTheDocument();
    expect(container.querySelector('#firstName')).toHaveValue('Sam');
    expect(container.querySelector('#lastName')).toHaveValue('Vance');
    expect(container.querySelector('#email')).toHaveValue('sam@example.com');
  });

  it('handles duplicate email (409 Conflict) from API and displays error message without showing success', async () => {
    const conflictError = new authApi.AuthApiError(409, 'An account with this email address already exists');
    authApi.registerPatient.mockRejectedValueOnce(conflictError);

    const { container } = render(
      <MemoryRouter>
        <PatientRegistrationPage />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('#firstName'), { target: { value: 'Alice' } });
    fireEvent.change(container.querySelector('#lastName'), { target: { value: 'Smith' } });
    fireEvent.change(container.querySelector('#email'), { target: { value: 'duplicate@example.com' } });
    fireEvent.change(container.querySelector('#password'), { target: { value: 'Password123' } });
    fireEvent.change(container.querySelector('#confirmPassword'), { target: { value: 'Password123' } });

    fireEvent.click(screen.getByRole('button', { name: /create patient account|register patient account/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/an account with this email address already exists/i).length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.queryByRole('heading', { name: /registration successful/i })).not.toBeInTheDocument();
    expect(container.querySelector('#email')).toHaveValue('duplicate@example.com');
  });

  it('disables submit button and shows loading text while request is in flight to prevent double submission', async () => {
    let resolvePromise;
    authApi.registerPatient.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { container } = render(
      <MemoryRouter>
        <PatientRegistrationPage />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('#firstName'), { target: { value: 'Fast' } });
    fireEvent.change(container.querySelector('#lastName'), { target: { value: 'User' } });
    fireEvent.change(container.querySelector('#email'), { target: { value: 'fast@example.com' } });
    fireEvent.change(container.querySelector('#password'), { target: { value: 'Password123' } });
    fireEvent.change(container.querySelector('#confirmPassword'), { target: { value: 'Password123' } });

    const submitBtn = screen.getByRole('button', { name: /create patient account|register patient account/i });
    fireEvent.click(submitBtn);

    const pendingBtn = screen.getByRole('button', { name: /creating account|registering account/i });
    expect(pendingBtn).toBeDisabled();

    resolvePromise({ id: 1, email: 'fast@example.com', firstName: 'Fast', role: 'PATIENT' });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /registration successful/i })).toBeInTheDocument();
    });
  });
});
