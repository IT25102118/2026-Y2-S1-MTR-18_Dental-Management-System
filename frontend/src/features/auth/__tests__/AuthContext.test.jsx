import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as authApi from '../api/authApi';

vi.mock('../api/authApi', async () => {
  const actual = await vi.importActual('../api/authApi');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getCsrfToken: vi.fn(),
    clearCsrfToken: vi.fn()
  };
});

function TestConsumer() {
  const {
    status,
    user,
    error,
    isAuthenticated,
    isLoading,
    isError,
    retryHydration,
    login,
    logout
  } = useAuth();

  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="auth-flag">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="loading-flag">{isLoading ? 'loading' : 'not-loading'}</div>
      <div data-testid="error-flag">{isError ? 'error' : 'not-error'}</div>
      <div data-testid="user-email">{user?.email || 'no-user'}</div>
      <div data-testid="user-role">{user?.role || 'no-role'}</div>
      <div data-testid="error-message">{error?.message || 'no-error'}</div>
      <button onClick={() => retryHydration()} data-testid="btn-retry">Retry</button>
      <button
        onClick={() => login({ email: 'test@dentcare.com', password: 'Password123' }).catch(() => {})}
        data-testid="btn-login"
      >
        Login
      </button>
      <button onClick={() => logout().catch(() => {})} data-testid="btn-logout">Logout</button>
    </div>
  );
}

describe('AuthContext / AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with loading status then resolves to authenticated when /me returns user', async () => {
    const mockUser = {
      id: 1,
      email: 'admin@dentcare.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMINISTRATOR'
    };
    authApi.getCurrentUser.mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Initial state before promise resolves
    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    expect(screen.getByTestId('loading-flag')).toHaveTextContent('loading');

    // After hydration
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('auth-flag')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@dentcare.com');
    expect(screen.getByTestId('user-role')).toHaveTextContent('ADMINISTRATOR');
  });

  it('resolves to unauthenticated and user null when /me returns null (401)', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });

    expect(screen.getByTestId('auth-flag')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
    expect(screen.getByTestId('error-flag')).toHaveTextContent('not-error');
  });

  it('sets status to error (NOT unauthenticated) when /me throws 500 error', async () => {
    const error500 = new authApi.AuthApiError(500, 'Internal Server Error');
    authApi.getCurrentUser.mockRejectedValueOnce(error500);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error');
    });

    expect(screen.getByTestId('auth-flag')).toHaveTextContent('not-authenticated');
    expect(screen.getByTestId('error-flag')).toHaveTextContent('error');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Internal Server Error');
    expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
  });

  it('sets status to error (NOT unauthenticated) on network failure', async () => {
    const networkErr = new authApi.AuthApiError(0, 'Failed to fetch');
    authApi.getCurrentUser.mockRejectedValueOnce(networkErr);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error');
    });

    expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to fetch');
  });

  it('retryHydration re-triggers getCurrentUser and recovers from error', async () => {
    authApi.getCurrentUser
      .mockRejectedValueOnce(new authApi.AuthApiError(0, 'Network issue'))
      .mockResolvedValueOnce({
        id: 2,
        email: 'dentist@dentcare.com',
        role: 'DENTIST'
      });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error');
    });

    await act(async () => {
      screen.getByTestId('btn-retry').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    expect(screen.getByTestId('user-email')).toHaveTextContent('dentist@dentcare.com');
    expect(screen.getByTestId('user-role')).toHaveTextContent('DENTIST');
  });

  it('login updates status and user without redundant /me call', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(null); // start unauthenticated
    const loggedInUser = {
      id: 3,
      email: 'receptionist@dentcare.com',
      role: 'RECEPTIONIST'
    };
    authApi.login.mockResolvedValueOnce(loggedInUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('receptionist@dentcare.com');
    expect(screen.getByTestId('user-role')).toHaveTextContent('RECEPTIONIST');
    // getCurrentUser should only have been called once on startup
    expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('failed login does not authenticate and preserves error', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce(null);
    authApi.login.mockRejectedValueOnce(new authApi.AuthApiError(401, 'Invalid email or password'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
  });

  it('logout success sets status to unauthenticated and user null', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 4,
      email: 'assistant@dentcare.com',
      role: 'DENTAL_ASSISTANT'
    });
    authApi.logout.mockResolvedValueOnce(true);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
  });

  it('logout failure with 403 retains authenticated status and user', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 5,
      email: 'patient@dentcare.com',
      role: 'PATIENT'
    });
    authApi.logout.mockRejectedValueOnce(new authApi.AuthApiError(403, 'Forbidden'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    // Retained
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('patient@dentcare.com');
    expect(screen.getByTestId('error-message')).toHaveTextContent('Forbidden');
  });

  it('logout network failure retains authenticated status and user', async () => {
    authApi.getCurrentUser.mockResolvedValueOnce({
      id: 5,
      email: 'patient@dentcare.com',
      role: 'PATIENT'
    });
    authApi.logout.mockRejectedValueOnce(new authApi.AuthApiError(0, 'Network disconnected'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('patient@dentcare.com');
  });

  it('stale startup 401 cannot overwrite newer login (race guard)', async () => {
    let resolveStartup;
    const startupPromise = new Promise((resolve) => {
      resolveStartup = resolve;
    });
    authApi.getCurrentUser.mockReturnValueOnce(startupPromise);

    const loggedInUser = {
      id: 1,
      email: 'admin@dentcare.com',
      role: 'ADMINISTRATOR'
    };
    authApi.login.mockResolvedValueOnce(loggedInUser);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Startup /me is pending
    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    // User logs in while startup is pending
    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    // State is authenticated
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@dentcare.com');

    // Startup /me resolves afterward as 401 (null)
    await act(async () => {
      resolveStartup(null);
    });

    // Stale startup response must NOT overwrite authenticated state
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@dentcare.com');
  });

  it('stale hydration success cannot overwrite newer logout (race guard)', async () => {
    let resolveHydration;
    const hydrationPromise = new Promise((resolve) => {
      resolveHydration = resolve;
    });
    authApi.getCurrentUser.mockReturnValueOnce(hydrationPromise);
    authApi.logout.mockResolvedValueOnce(true);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');

    // User triggers logout while hydration is pending
    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    // State becomes unauthenticated
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');

    // Stale hydration resolves with an old user object
    await act(async () => {
      resolveHydration({
        id: 99,
        email: 'ghost@dentcare.com',
        role: 'PATIENT'
      });
    });

    // State must remain unauthenticated
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('no-user');
  });

  it('latest retry wins when older retry resolves last with conflicting result', async () => {
    let resolveRetryA;
    let resolveRetryB;
    const promiseA = new Promise((resolve) => {
      resolveRetryA = resolve;
    });
    const promiseB = new Promise((resolve) => {
      resolveRetryB = resolve;
    });

    // Initial startup fails
    authApi.getCurrentUser.mockRejectedValueOnce(new authApi.AuthApiError(0, 'Initial failure'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error');
    });

    // Next two calls: retry A, then retry B
    authApi.getCurrentUser
      .mockReturnValueOnce(promiseA)
      .mockReturnValueOnce(promiseB);

    // Trigger retry A
    act(() => {
      screen.getByTestId('btn-retry').click();
    });

    // Trigger retry B
    act(() => {
      screen.getByTestId('btn-retry').click();
    });

    // Retry B resolves first with authenticated user
    await act(async () => {
      resolveRetryB({
        id: 10,
        email: 'b-winner@dentcare.com',
        role: 'DENTIST'
      });
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('b-winner@dentcare.com');

    // Retry A resolves afterward with 401 unauthenticated
    await act(async () => {
      resolveRetryA(null);
    });

    // Result from Retry B must remain authoritative
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-email')).toHaveTextContent('b-winner@dentcare.com');
  });

  it('does not update state when unmounted while hydration is pending', async () => {
    let resolveHydration;
    authApi.getCurrentUser.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveHydration = resolve;
      })
    );

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('loading');
    unmount();

    await act(async () => {
      resolveHydration({ id: 1, email: 'user@dentcare.com', role: 'PATIENT' });
    });
  });

  it('throws when useAuth is consumed outside of AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    consoleError.mockRestore();
  });
});
