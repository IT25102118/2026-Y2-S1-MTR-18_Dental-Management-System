import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import LandingPage from '../pages/LandingPage';

describe('Public Landing Page Component (LP-1 to LP-8)', () => {
  const renderLandingPage = () => {
    return render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
  };

  it('AC-1: renders public hero heading and practice description', () => {
    renderLandingPage();

    expect(
      screen.getByRole('heading', { name: /Modern Dental Care & Practice Operations/i, level: 1 })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/A unified clinical and operational platform supporting patient registration/i)
    ).toBeInTheDocument();
  });

  it('AC-2 & AC-3: contains working primary CTAs to /register and /login', () => {
    renderLandingPage();

    const registerCta = screen.getByTestId('landing-register-cta');
    expect(registerCta).toBeInTheDocument();
    expect(registerCta).toHaveAttribute('href', '/register');
    expect(registerCta).toHaveTextContent(/Register as Patient/i);

    const loginCta = screen.getByTestId('landing-login-cta');
    expect(loginCta).toBeInTheDocument();
    expect(loginCta).toHaveAttribute('href', '/login');
    expect(loginCta).toHaveTextContent(/Sign In to Account/i);
  });

  it('AC-4: does not expose protected internal staff module links on public landing page', () => {
    renderLandingPage();

    const allLinks = screen.getAllByRole('link');
    const hrefs = allLinks.map((link) => link.getAttribute('href'));

    // Public landing page only routes to /register and /login
    expect(hrefs).not.toContain('/inventory');
    expect(hrefs).not.toContain('/inventory/items');
    expect(hrefs).not.toContain('/billing/invoices');
    expect(hrefs).not.toContain('/billing/reports');
    expect(hrefs).not.toContain('/clinical');
    expect(hrefs).not.toContain('/prescriptions');
    expect(hrefs).not.toContain('/admin/staff');
    expect(hrefs).not.toContain('/account');
  });

  it('AC-6: clearly distinguishes patient self-registration from administrator staff provisioning', () => {
    renderLandingPage();

    // Patient registration is prominent
    const patientCards = screen.getAllByRole('link', { name: /Register Patient Account|Register as Patient/i });
    expect(patientCards.length).toBeGreaterThanOrEqual(1);

    // No public staff registration link exists
    expect(screen.queryByRole('link', { name: /Register as Staff/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Create Staff Account/i })).not.toBeInTheDocument();

    // Staff access explicitly links to login
    const staffLoginLink = screen.getByRole('link', { name: /Staff Sign In/i });
    expect(staffLoginLink).toHaveAttribute('href', '/login');
    expect(
      screen.getAllByText(/Staff accounts are provisioned by clinic administrators/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders verified capability cards for clinical, prescription, billing, inventory, and accounts', () => {
    renderLandingPage();

    expect(screen.getByRole('heading', { name: /Patient Registration & Account/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Clinical Examinations & Plans/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Electronic Prescriptions/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Invoicing, Payments & Receipts/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Inventory & Supply Monitoring/i, level: 3 })).toBeInTheDocument();
  });

  it('contains semantic landmark regions for accessibility', () => {
    renderLandingPage();

    expect(screen.getByTestId('public-landing-page')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Integrated Dental Clinic Management/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /Get Started with DentCare/i })).toBeInTheDocument();
  });
});
