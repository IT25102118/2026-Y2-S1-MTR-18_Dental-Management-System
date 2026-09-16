import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffDashboardPage from '../pages/StaffDashboardPage';
import * as AuthContextModule from '../context/AuthContext';

function renderDashboard(routeState = null) {
  const initialEntries = [
    routeState ? { pathname: '/staff/dashboard', state: routeState } : '/staff/dashboard'
  ];

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <StaffDashboardPage />
    </MemoryRouter>
  );
}

describe('StaffDashboardPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly for ADMINISTRATOR with all 6 practice tools', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'admin@dentcare.com',
        role: 'ADMINISTRATOR'
      }
    });

    renderDashboard();

    expect(screen.getByTestId('staff-dashboard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Staff dashboard/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Welcome back/i)).toHaveTextContent('Sarah');
    expect(screen.getByTestId('staff-role-badge')).toHaveTextContent('ADMINISTRATOR');
    expect(screen.getByText('SC')).toBeInTheDocument(); // Avatar initials

    // Check all 6 tools are rendered
    expect(screen.getByRole('link', { name: /Open Inventory Management/i })).toHaveAttribute('href', '/inventory');
    expect(screen.getByRole('link', { name: /Open Clinical Management/i })).toHaveAttribute('href', '/clinical');
    expect(screen.getByRole('link', { name: /Open Prescription Management/i })).toHaveAttribute('href', '/prescriptions');
    expect(screen.getByRole('link', { name: /Open Invoices & Billing/i })).toHaveAttribute('href', '/billing/invoices');
    expect(screen.getByRole('link', { name: /Open Income Reports/i })).toHaveAttribute('href', '/billing/reports');
    expect(screen.getByRole('link', { name: /Open Staff Management/i })).toHaveAttribute('href', '/admin/staff');

    // Quick links
    expect(screen.getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/inventory/items');
    expect(screen.getByRole('link', { name: 'My Account' })).toHaveAttribute('href', '/account');
  });

  it('renders correctly for RECEPTIONIST with billing and reports but NO staff management', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 2,
        firstName: 'Emily',
        lastName: 'Rose',
        email: 'reception@dentcare.com',
        role: 'RECEPTIONIST'
      }
    });

    renderDashboard();

    expect(screen.getByTestId('staff-role-badge')).toHaveTextContent('RECEPTIONIST');
    expect(screen.getByRole('link', { name: /Open Inventory Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Clinical Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Prescription Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Invoices & Billing/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Income Reports/i })).toBeInTheDocument();

    // Staff Management must NOT be rendered
    expect(screen.queryByRole('link', { name: /Staff Management/i })).not.toBeInTheDocument();
  });

  it('renders correctly for DENTIST with clinical, inventory, prescriptions only', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 3,
        firstName: 'Marcus',
        lastName: 'Vance',
        email: 'dentist@dentcare.com',
        role: 'DENTIST'
      }
    });

    renderDashboard();

    expect(screen.getByTestId('staff-role-badge')).toHaveTextContent('DENTIST');
    expect(screen.getByRole('link', { name: /Open Inventory Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Clinical Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Prescription Management/i })).toBeInTheDocument();

    // Billing, Reports, and Staff Management must NOT be rendered
    expect(screen.queryByRole('link', { name: /Billing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Income Reports/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Staff Management/i })).not.toBeInTheDocument();
  });

  it('renders correctly for DENTAL_ASSISTANT', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 4,
        firstName: 'Chloe',
        lastName: 'Bennett',
        email: 'assistant@dentcare.com',
        role: 'DENTAL_ASSISTANT'
      }
    });

    renderDashboard();

    expect(screen.getByTestId('staff-role-badge')).toHaveTextContent('DENTAL_ASSISTANT');
    expect(screen.getByRole('link', { name: /Open Inventory Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Clinical Management/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Prescription Management/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Billing/i })).not.toBeInTheDocument();
  });

  it('displays access-denied alert when returned with accessDenied state', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 3,
        firstName: 'Marcus',
        role: 'DENTIST'
      }
    });

    renderDashboard({ accessDenied: true });

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/That page is not authorized for your account role/i);
  });
});
