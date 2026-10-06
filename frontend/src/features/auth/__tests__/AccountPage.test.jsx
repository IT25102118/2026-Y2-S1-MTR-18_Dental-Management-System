import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import AccountPage from '../pages/AccountPage';
import * as AuthContextModule from '../context/AuthContext';
import { AuthApiError } from '../api/authApi';
import * as patientPortalApi from '../../patient/api/patientPortalApi';

vi.mock('../../patient/api/patientPortalApi', () => ({
  updatePatientProfile: vi.fn(),
  changePatientPassword: vi.fn()
}));

function DestinationWatcher({ testId = 'route-path' }) {
  const location = useLocation();
  return <div data-testid={testId}>{location.pathname}</div>;
}

describe('AccountPage', () => {
  const mockLogout = vi.fn();
  const mockUpdateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Existing account data renders
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
      logout: mockLogout,
      updateUser: mockUpdateUser
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

  // 2. PATIENT sees Edit Phone
  it('renders Edit Phone button and Security section for PATIENT role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 555-0199',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('contact-info-section')).toBeInTheDocument();
    expect(screen.getByTestId('edit-phone-btn')).toBeInTheDocument();
    expect(screen.getByTestId('security-section')).toBeInTheDocument();
    expect(screen.getByTestId('change-password-btn')).toBeInTheDocument();
  });

  // 3. Staff roles do not see patient phone-edit control
  it('staff roles (ADMINISTRATOR, RECEPTIONIST, DENTIST, DENTAL_ASSISTANT) do not see patient mutation controls', () => {
    const staffRoles = ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'];

    for (const role of staffRoles) {
      vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
        user: {
          id: 50,
          email: `${role.toLowerCase()}@dentcare.com`,
          firstName: 'Staff',
          lastName: 'Member',
          phone: '+1 555-0150',
          role
        },
        logout: mockLogout,
        updateUser: mockUpdateUser
      });

      const { unmount } = render(
        <MemoryRouter initialEntries={['/account']}>
          <AccountPage />
        </MemoryRouter>
      );

      expect(screen.queryByTestId('contact-info-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('edit-phone-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('security-section')).not.toBeInTheDocument();
      expect(screen.queryByTestId('change-password-btn')).not.toBeInTheDocument();
      unmount();
    }
  });

  // 4. Phone form pre-fills current value
  it('phone form pre-fills current phone value on Edit Phone click', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 555-0199',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('edit-phone-btn'));

    const input = screen.getByTestId('phone-input');
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('+1 555-0199');
    expect(screen.getByTestId('save-phone-btn')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-phone-btn')).toBeInTheDocument();
  });

  // 5. Client validation works for phone (>25 chars)
  it('phone client validation rejects phone number exceeding 25 characters', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 555-0199',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('edit-phone-btn'));
    const input = screen.getByTestId('phone-input');

    fireEvent.change(input, { target: { value: '12345678901234567890123456' } }); // 26 chars
    fireEvent.click(screen.getByTestId('save-phone-btn'));

    expect(await screen.findByTestId('phone-error-alert')).toHaveTextContent(
      'Phone number cannot exceed 25 characters'
    );
    expect(patientPortalApi.updatePatientProfile).not.toHaveBeenCalled();
  });

  // 6 & 7. Save calls correct patient API with only phone, no userId/patientId
  it('save phone calls updatePatientProfile with only phone payload and no userId or patientId', async () => {
    patientPortalApi.updatePatientProfile.mockResolvedValueOnce({
      id: 101,
      email: 'patient@dentcare.com',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+1 555-7777',
      role: 'PATIENT'
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 555-0199',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('edit-phone-btn'));
    const input = screen.getByTestId('phone-input');

    fireEvent.change(input, { target: { value: '+1 555-7777' } });
    fireEvent.click(screen.getByTestId('save-phone-btn'));

    await waitFor(() => {
      expect(patientPortalApi.updatePatientProfile).toHaveBeenCalledTimes(1);
    });

    expect(patientPortalApi.updatePatientProfile).toHaveBeenCalledWith({
      phone: '+1 555-7777'
    });
    // Ensure no userId or patientId is sent
    const payload = patientPortalApi.updatePatientProfile.mock.calls[0][0];
    expect(payload.userId).toBeUndefined();
    expect(payload.patientId).toBeUndefined();
    expect(payload.id).toBeUndefined();
  });

  // 8. Button disabled while saving phone
  it('save button is disabled while phone update request is in flight', async () => {
    let resolveApi;
    patientPortalApi.updatePatientProfile.mockImplementationOnce(
      () => new Promise((resolve) => { resolveApi = resolve; })
    );

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 555-0199',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('edit-phone-btn'));
    const input = screen.getByTestId('phone-input');

    fireEvent.change(input, { target: { value: '+1 555-8888' } });
    fireEvent.click(screen.getByTestId('save-phone-btn'));

    expect(screen.getByTestId('save-phone-btn')).toBeDisabled();
    expect(screen.getByTestId('cancel-phone-btn')).toBeDisabled();
    expect(screen.getByTestId('save-phone-btn')).toHaveTextContent('Saving...');

    resolveApi({ phone: '+1 555-8888' });

    await waitFor(() => {
      expect(screen.queryByTestId('phone-edit-form')).not.toBeInTheDocument();
    });
  });

  // 9. Successful update refreshes displayed phone and calls updateUser
  it('successful phone update updates auth context and displays concise success alert', async () => {
    patientPortalApi.updatePatientProfile.mockResolvedValueOnce({
      id: 101,
      email: 'patient@dentcare.com',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+1 555-9999',
      role: 'PATIENT'
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 555-0199',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('edit-phone-btn'));
    fireEvent.change(screen.getByTestId('phone-input'), { target: { value: '+1 555-9999' } });
    fireEvent.click(screen.getByTestId('save-phone-btn'));

    expect(await screen.findByTestId('phone-success-alert')).toHaveTextContent(
      'Phone number updated successfully.'
    );
    expect(mockUpdateUser).toHaveBeenCalledWith({ phone: '+1 555-9999' });
    expect(screen.queryByTestId('phone-edit-form')).not.toBeInTheDocument();
  });

  // 10. Failed update displays error and preserves form
  it('failed phone update displays error alert, retains form input, and keeps edit mode open', async () => {
    patientPortalApi.updatePatientProfile.mockRejectedValueOnce(
      new Error('Failed to update phone number. Invalid format.')
    );

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 555-0199',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('edit-phone-btn'));
    fireEvent.change(screen.getByTestId('phone-input'), { target: { value: '+1 555-bad' } });
    fireEvent.click(screen.getByTestId('save-phone-btn'));

    expect(await screen.findByTestId('phone-error-alert')).toHaveTextContent(
      'Failed to update phone number. Invalid format.'
    );
    expect(screen.getByTestId('phone-input')).toHaveValue('+1 555-bad');
    expect(screen.getByTestId('save-phone-btn')).toBeInTheDocument();
  });

  // Cancel edit phone behavior
  it('cancel button exits phone edit mode without saving', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 555-0199',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('edit-phone-btn'));
    expect(screen.getByTestId('phone-input')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-phone-btn'));
    expect(screen.queryByTestId('phone-edit-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('edit-phone-btn')).toBeInTheDocument();
    expect(patientPortalApi.updatePatientProfile).not.toHaveBeenCalled();
  });

  // 11. PATIENT sees Change Password
  it('renders Change Password section for PATIENT role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Security/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByTestId('change-password-btn')).toBeInTheDocument();
  });

  // 12. Password fields use password input type
  it('all three password inputs use password input type', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('current-password-input')).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('new-password-input')).toHaveAttribute('type', 'password');
    expect(screen.getByTestId('confirm-password-input')).toHaveAttribute('type', 'password');
  });

  // 13. Mismatch prevented client-side
  it('password mismatch is prevented client-side with clear error', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'Current123' } });
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'NewPass123' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'DifferentPass123' } });
    fireEvent.click(screen.getByTestId('change-password-btn'));

    expect(await screen.findByTestId('password-error-alert')).toHaveTextContent(
      'New password and confirmation do not match.'
    );
    expect(patientPortalApi.changePatientPassword).not.toHaveBeenCalled();
  });

  // 14. Weak password rejected according to policy
  it('weak password without digits is rejected client-side', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'Current123' } });
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'nodigitsinthis' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'nodigitsinthis' } });
    fireEvent.click(screen.getByTestId('change-password-btn'));

    expect(await screen.findByTestId('password-error-alert')).toHaveTextContent(
      'Password must contain at least one letter and one digit.'
    );
    expect(patientPortalApi.changePatientPassword).not.toHaveBeenCalled();
  });

  it('short password (< 8 chars) is rejected client-side', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'Current123' } });
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'Pass1' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'Pass1' } });
    fireEvent.click(screen.getByTestId('change-password-btn'));

    expect(await screen.findByTestId('password-error-alert')).toHaveTextContent(
      'Password must be between 8 and 100 characters.'
    );
    expect(patientPortalApi.changePatientPassword).not.toHaveBeenCalled();
  });

  // 15. Valid submission sends current/new only
  it('valid submission sends currentPassword and newPassword only', async () => {
    patientPortalApi.changePatientPassword.mockResolvedValueOnce({
      message: 'Password changed successfully.'
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'CurrentPass123' } });
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.click(screen.getByTestId('change-password-btn'));

    await waitFor(() => {
      expect(patientPortalApi.changePatientPassword).toHaveBeenCalledTimes(1);
    });

    expect(patientPortalApi.changePatientPassword).toHaveBeenCalledWith({
      currentPassword: 'CurrentPass123',
      newPassword: 'NewSecurePass456'
    });
    const payload = patientPortalApi.changePatientPassword.mock.calls[0][0];
    expect(payload.userId).toBeUndefined();
    expect(payload.patientId).toBeUndefined();
    expect(payload.confirmPassword).toBeUndefined();
  });

  // 16. Duplicate submit prevented while request is in flight
  it('submit button is disabled during password change submission', async () => {
    let resolveChange;
    patientPortalApi.changePatientPassword.mockImplementationOnce(
      () => new Promise((resolve) => { resolveChange = resolve; })
    );

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'CurrentPass123' } });
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.click(screen.getByTestId('change-password-btn'));

    expect(screen.getByTestId('change-password-btn')).toBeDisabled();
    expect(screen.getByTestId('change-password-btn')).toHaveTextContent('Updating Password...');

    resolveChange({ message: 'Password changed successfully.' });

    await waitFor(() => {
      expect(screen.getByTestId('change-password-btn')).not.toBeDisabled();
    });
  });

  // 17. Success clears password inputs
  it('successful password change clears all password inputs', async () => {
    patientPortalApi.changePatientPassword.mockResolvedValueOnce({
      message: 'Password changed successfully.'
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'CurrentPass123' } });
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.click(screen.getByTestId('change-password-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('current-password-input')).toHaveValue('');
      expect(screen.getByTestId('new-password-input')).toHaveValue('');
      expect(screen.getByTestId('confirm-password-input')).toHaveValue('');
    });
  });

  // 18. Success message shown
  it('displays concise success message on successful password change', async () => {
    patientPortalApi.changePatientPassword.mockResolvedValueOnce({
      message: 'Password changed successfully.'
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'CurrentPass123' } });
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.click(screen.getByTestId('change-password-btn'));

    expect(await screen.findByTestId('password-success-alert')).toHaveTextContent(
      'Password changed successfully.'
    );
  });

  // 19. Error feedback shown safely
  it('displays safe error alert on password change failure without leaking hashes', async () => {
    patientPortalApi.changePatientPassword.mockRejectedValueOnce(
      new Error('Current password is incorrect')
    );

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByTestId('current-password-input'), { target: { value: 'WrongPass123' } });
    fireEvent.change(screen.getByTestId('new-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.change(screen.getByTestId('confirm-password-input'), { target: { value: 'NewSecurePass456' } });
    fireEvent.click(screen.getByTestId('change-password-btn'));

    expect(await screen.findByTestId('password-error-alert')).toHaveTextContent(
      'Current password is incorrect'
    );
  });

  // 20. Logout still works
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
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<DestinationWatcher testId="login-path" />} />
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

  // 21. Return to Dashboard routes correctly
  it('links to /patient/dashboard for PATIENT role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 101,
        email: 'patient@dentcare.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'PATIENT'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole('link', { name: /Return to Dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/patient/dashboard');
  });

  it('links to /staff/dashboard for ADMINISTRATOR role', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'admin@dentcare.com',
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMINISTRATOR'
      },
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <AccountPage />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByRole('link', { name: /Return to Dashboard/i });
    expect(dashboardLink).toHaveAttribute('href', '/staff/dashboard');
  });

  // 22. Staff account behavior remains intact and handles logout errors
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
      logout: mockLogout,
      updateUser: mockUpdateUser
    });

    render(
      <MemoryRouter initialEntries={['/account']}>
        <Routes>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<DestinationWatcher testId="login-path" />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('logout-button'));

    expect(await screen.findByTestId('logout-error-alert')).toHaveTextContent(
      'Logout failed: Security validation error. Please try again.'
    );
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
      logout: mockLogout,
      updateUser: mockUpdateUser
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
