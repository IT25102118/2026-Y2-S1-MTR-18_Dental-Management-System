import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

  it('renders all form input fields, accessible labels, and submit button', () => {
    const { container } = render(
      <MemoryRouter>
        <PatientRegistrationPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /patient registration/i, level: 1 })).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: /register patient account/i })).toBeInTheDocument();
  });

  it('validates required fields client-side before calling the API', async () => {
    render(
      <MemoryRouter>
        <PatientRegistrationPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /register patient account/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /register patient account/i }));

    expect(await screen.findByText(/between 8 and 100 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(authApi.registerPatient).not.toHaveBeenCalled();
  });

  it('submits valid registration, excludes confirmPassword, and renders success view', async () => {
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

    const { container } = render(
      <MemoryRouter>
        <PatientRegistrationPage />
      </MemoryRouter>
    );

    fireEvent.change(container.querySelector('#firstName'), { target: { value: 'John' } });
    fireEvent.change(container.querySelector('#lastName'), { target: { value: 'Doe' } });
    fireEvent.change(container.querySelector('#email'), { target: { value: 'john.doe@example.com' } });
    fireEvent.change(container.querySelector('#phone'), { target: { value: '+1 555-0199' } });
    fireEvent.change(container.querySelector('#password'), { target: { value: 'Password123' } });
    fireEvent.change(container.querySelector('#confirmPassword'), { target: { value: 'Password123' } });

    fireEvent.click(screen.getByRole('button', { name: /register patient account/i }));

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

    // Verify success state view
    expect(await screen.findByRole('heading', { name: /registration successful/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/john\.doe@example\.com/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to home/i })).toBeInTheDocument();
    // Does NOT navigate to nonexistent /login
    expect(screen.queryByRole('link', { name: /login/i })).not.toBeInTheDocument();
  });

  it('handles duplicate email (409 Conflict) from API and displays error message', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /register patient account/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/an account with this email address already exists/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('disables submit button and shows loading text while request is in flight', async () => {
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

    const submitBtn = screen.getByRole('button', { name: /register patient account/i });
    fireEvent.click(submitBtn);

    expect(screen.getByRole('button', { name: /registering account\.\.\./i })).toBeDisabled();

    resolvePromise({ id: 1, email: 'fast@example.com', role: 'PATIENT' });
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /registration successful/i, level: 2 })).toBeInTheDocument();
    });
  });
});
