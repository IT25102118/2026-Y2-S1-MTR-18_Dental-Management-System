import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StaffManagementPage from '../pages/StaffManagementPage';
import * as staffApi from '../api/staffApi';

vi.mock('../api/staffApi', () => ({
  getAllStaff: vi.fn(),
  provisionStaff: vi.fn(),
  updateStaff: vi.fn(),
  updateStaffStatus: vi.fn()
}));

const mockStaffList = [
  {
    id: 1,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@dentcare.com',
    phone: '+1 555-0101',
    role: 'ADMINISTRATOR',
    active: true
  },
  {
    id: 2,
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah@dentcare.com',
    phone: '+1 555-0102',
    role: 'DENTIST',
    active: true
  },
  {
    id: 3,
    firstName: 'Bob',
    lastName: 'Smith',
    email: 'bob@dentcare.com',
    phone: '+1 555-0103',
    role: 'RECEPTIONIST',
    active: false
  }
];

describe('StaffManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    staffApi.getAllStaff.mockResolvedValue(mockStaffList);
  });

  it('renders staff list table with all members', async () => {
    render(
      <MemoryRouter>
        <StaffManagementPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading staff members/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });

    expect(screen.getByText('admin@dentcare.com')).toBeInTheDocument();
    expect(screen.getByText('sarah@dentcare.com')).toBeInTheDocument();
    expect(screen.getByText('bob@dentcare.com')).toBeInTheDocument();
  });

  it('filters staff by role', async () => {
    render(
      <MemoryRouter>
        <StaffManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    const roleSelect = screen.getByLabelText(/filter by role/i);
    fireEvent.change(roleSelect, { target: { value: 'DENTIST' } });

    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
  });

  it('searches staff by name or email', async () => {
    render(
      <MemoryRouter>
        <StaffManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search staff by name or email/i);
    fireEvent.change(searchInput, { target: { value: 'sarah' } });

    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.queryByText('Admin User')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
  });

  it('opens provision staff modal and submits new staff member', async () => {
    staffApi.provisionStaff.mockResolvedValueOnce({
      id: 4,
      firstName: 'Emily',
      lastName: 'Brown',
      email: 'emily@dentcare.com',
      role: 'DENTAL_ASSISTANT',
      active: true
    });

    render(
      <MemoryRouter>
        <StaffManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    const provisionBtn = screen.getByRole('button', { name: /\+ provision new staff/i });
    fireEvent.click(provisionBtn);

    expect(screen.getByRole('heading', { name: /provision new staff member/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Emily' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Brown' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'emily@dentcare.com' } });
    fireEvent.change(screen.getByLabelText(/temporary password/i), { target: { value: 'Pass1234' } });
    fireEvent.change(screen.getByLabelText(/staff role/i), { target: { value: 'DENTAL_ASSISTANT' } });

    const submitBtn = screen.getByRole('button', { name: /provision staff account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(staffApi.provisionStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Emily',
          lastName: 'Brown',
          email: 'emily@dentcare.com',
          role: 'DENTAL_ASSISTANT'
        })
      );
      expect(screen.getByText(/staff account provisioned successfully/i)).toBeInTheDocument();
    });
  });

  it('opens edit modal and updates staff profile', async () => {
    staffApi.updateStaff.mockResolvedValueOnce({
      id: 2,
      firstName: 'Sarah',
      lastName: 'Connor-Smith',
      email: 'sarah@dentcare.com',
      role: 'DENTIST',
      active: true
    });

    render(
      <MemoryRouter>
        <StaffManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    fireEvent.click(editBtns[1]); // Sarah Connor

    expect(screen.getByRole('heading', { name: /edit staff account/i })).toBeInTheDocument();

    const lastNameInput = screen.getByLabelText(/last name/i);
    fireEvent.change(lastNameInput, { target: { value: 'Connor-Smith' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(staffApi.updateStaff).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          lastName: 'Connor-Smith'
        })
      );
      expect(screen.getByText(/staff details updated successfully/i)).toBeInTheDocument();
    });
  });

  it('toggles staff status between active and deactivated', async () => {
    staffApi.updateStaffStatus.mockResolvedValueOnce({
      id: 2,
      active: false
    });

    render(
      <MemoryRouter>
        <StaffManagementPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    });

    const deactivateBtn = screen.getByRole('button', { name: /deactivate sarah connor/i });
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(staffApi.updateStaffStatus).toHaveBeenCalledWith(2, false);
      expect(screen.getByText(/staff account deactivated successfully/i)).toBeInTheDocument();
    });
  });
});
