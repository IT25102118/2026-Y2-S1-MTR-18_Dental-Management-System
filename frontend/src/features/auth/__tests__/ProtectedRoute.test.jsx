import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import * as AuthContextModule from '../context/AuthContext';

function LocationDisplay() {
  const location = useLocation();
  return (
    <div>
      <div data-testid="current-path">{location.pathname}</div>
      <div data-testid="location-from">{location.state?.from || 'no-from'}</div>
      <div data-testid="access-denied">{location.state?.accessDenied ? 'denied' : 'not-denied'}</div>
    </div>
  );
}

describe('ProtectedRoute guard', () => {
  it('renders loading UI while session is loading and does not render protected content', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      status: 'loading',
      isLoading: true,
      isError: false,
      isAuthenticated: false,
      user: null
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Secret Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders error state with retry button on error and does NOT redirect to /login', () => {
    const retryHydrationMock = vi.fn();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      status: 'error',
      isLoading: false,
      isError: true,
      isAuthenticated: false,
      error: new Error('Network timeout'),
      retryHydration: retryHydrationMock,
      user: null
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Secret Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-error-state')).toBeInTheDocument();
    expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('current-path')).not.toBeInTheDocument(); // not redirected to /login

    act(() => {
      screen.getByTestId('auth-retry-button').click();
    });
    expect(retryHydrationMock).toHaveBeenCalledTimes(1);
  });

  it('redirects unauthenticated user to /login preserving pathname, search, and hash', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      status: 'unauthenticated',
      isLoading: false,
      isError: false,
      isAuthenticated: false,
      user: null
    });

    render(
      <MemoryRouter initialEntries={['/protected?tab=reports&sort=date#section-2']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Secret Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
    expect(screen.getByTestId('location-from')).toHaveTextContent(
      '/protected?tab=reports&sort=date#section-2'
    );
  });

  it('renders protected child content when authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      status: 'authenticated',
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      user: { id: 1, email: 'admin@dentcare.com', role: 'ADMINISTRATOR' }
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Authenticated User Portal</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toHaveTextContent('Authenticated User Portal');
  });

  it('renders child content when user role matches allowedRoles', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      status: 'authenticated',
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      user: { id: 1, email: 'admin@dentcare.com', role: 'ADMINISTRATOR' }
    });

    render(
      <MemoryRouter initialEntries={['/staff-only']}>
        <Routes>
          <Route
            path="/staff-only"
            element={
              <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                <div data-testid="staff-content">Staff Portal</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('staff-content')).toHaveTextContent('Staff Portal');
  });

  it('redirects a disallowed PATIENT to the patient dashboard with access-denied state', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      status: 'authenticated',
      isLoading: false,
      isError: false,
      isAuthenticated: true,
      user: { id: 5, email: 'patient@dentcare.com', role: 'PATIENT' }
    });

    render(
      <MemoryRouter initialEntries={['/staff-only']}>
        <Routes>
          <Route
            path="/staff-only"
            element={
              <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                <div data-testid="staff-content">Staff Portal</div>
              </ProtectedRoute>
            }
          />
          <Route path="/patient/dashboard" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('staff-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('current-path')).toHaveTextContent('/patient/dashboard');
    expect(screen.getByTestId('access-denied')).toHaveTextContent('denied');
  });
});
