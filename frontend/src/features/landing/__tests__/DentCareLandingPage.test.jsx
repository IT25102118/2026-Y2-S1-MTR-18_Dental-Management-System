import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import PublicLandingPage from '../../auth/pages/PublicLandingPage';
import { AuthProvider } from '../../auth/context/AuthContext';
import * as authApi from '../../auth/api/authApi';

vi.mock('../../auth/api/authApi', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn()
}));

describe('DentCare Luxury Futuristic Landing Page (Colombo 07)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.getCurrentUser.mockResolvedValue(null);
  });

  const renderLandingPage = () => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <PublicLandingPage />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders the cinematic hero with required headline, eyebrow, and CTAs', async () => {
    renderLandingPage();

    // Eyebrow
    expect(await screen.findByText(/DENTCARE • COLOMBO 07/i)).toBeInTheDocument();

    // Main Headline (Level 1)
    expect(screen.getByRole('heading', { name: /EVERY SMILE.*MAPPED WITH.*PRECISION/i, level: 1 })).toBeInTheDocument();

    // Supporting text
    expect(screen.getByText(/Advanced dentistry designed around precision, comfort and natural-looking results/i)).toBeInTheDocument();
    expect(screen.getByText(/Experience modern dental care in the heart of Colombo 07/i)).toBeInTheDocument();

    // Primary & Secondary Buttons
    expect(screen.getByRole('link', { name: /Book An Appointment/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore Treatments/i })).toBeInTheDocument();

    // Scroll to discover indicator
    expect(screen.getByText(/SCROLL TO DISCOVER/i)).toBeInTheDocument();
  });

  it('renders the intro section with the 3 core pillars', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /DENTISTRY.*ENGINEERED.*AROUND YOU/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Technology-assisted treatment planning/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient-centred dental care/i)).toBeInTheDocument();
    expect(screen.getByText(/Natural-looking smile solutions/i)).toBeInTheDocument();
  });

  it('renders the interactive tooth section (SEE BEYOND THE SURFACE) with layer callouts', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /SEE BEYOND.*THE SURFACE/i, level: 2 })).toBeInTheDocument();

    // Anatomical callouts
    expect(screen.getByText(/Protective outer surface/i)).toBeInTheDocument();
    expect(screen.getByText(/The layer beneath the enamel/i)).toBeInTheDocument();
    expect(screen.getByText(/Contains nerves, arterioles, and vital blood vessels/i)).toBeInTheDocument();
    expect(screen.getByText(/Supports the tooth firmly within the jawbone/i)).toBeInTheDocument();

    // Layer buttons
    const enamelBtn = screen.getAllByRole('button', { name: /ENAMEL/i })[0];
    expect(enamelBtn).toBeInTheDocument();
    fireEvent.click(enamelBtn);
    expect(enamelBtn).toHaveClass('active');
  });

  it('renders all 10 comprehensive clinical treatment cards', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /DENTAL CARE.*REIMAGINED/i, level: 2 })).toBeInTheDocument();

    const expectedTreatments = [
      'General Dentistry',
      'Cosmetic Dentistry',
      'Teeth Whitening',
      'Dental Implants',
      'Veneers',
      'Clear Aligners',
      'Root Canal Treatment',
      'Emergency Dentistry',
      "Children's Dentistry",
      'Smile Makeovers'
    ];

    expectedTreatments.forEach((treatment) => {
      expect(screen.getByRole('heading', { name: new RegExp(`^${treatment}$`, 'i') })).toBeInTheDocument();
    });

    // 10 Explore Treatment action links on cards + 1 in Hero
    expect(screen.getAllByText(/EXPLORE TREATMENT/i).length).toBe(11);
  });

  it('renders technology modules as non-fabricated editable placeholders', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /PRECISION.*BEGINS WITH.*TECHNOLOGY/i, level: 2 })).toBeInTheDocument();

    expect(screen.getByText(/3D DIGITAL SCANNING/i)).toBeInTheDocument();
    expect(screen.getByText(/DIGITAL SMILE PLANNING/i)).toBeInTheDocument();
    expect(screen.getAllByText(/DIGITAL IMAGING/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/INTRAORAL CAMERAS/i)).toBeInTheDocument();
    expect(screen.getByText(/GUIDED IMPLANT PLANNING/i)).toBeInTheDocument();
  });

  it('renders the interactive before/after smile transformation slider with clinical note', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /DESIGNED FOR.*REAL SMILES/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/BEFORE TREATMENT/i)).toBeInTheDocument();
    expect(screen.getByText(/AFTER TREATMENT/i)).toBeInTheDocument();
    expect(screen.getByText(/Every smile is different. Treatment recommendations depend on individual clinical assessment/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore Smile Treatments/i })).toBeInTheDocument();
  });

  it('renders the 4 large Why DentCare pillars', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /^WHY DENTCARE\.$/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /PERSONALISED CARE/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /MODERN APPROACH/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /PATIENT COMFORT/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /CLINICAL PRECISION/i })).toBeInTheDocument();
  });

  it('renders dentist profile cards strictly using placeholders without fabricated credentials', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /MEET THE PEOPLE.*BEHIND YOUR SMILE/i, level: 2 })).toBeInTheDocument();

    const namePlaceholders = screen.getAllByRole('heading', { name: /Dr\. \[Name\]/i });
    expect(namePlaceholders.length).toBeGreaterThanOrEqual(1);

    const qualPlaceholders = screen.getAllByText(/\[Qualification\]/i);
    expect(qualPlaceholders.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the 6-step patient journey timeline', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /YOUR JOURNEY.*AT DENTCARE/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^BOOK$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^CONSULT$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^ASSESS$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^PLAN$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^TREAT$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^MAINTAIN$/i })).toBeInTheDocument();
  });

  it('renders verified patient experiences placeholders without fake reviews', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /PATIENT.*EXPERIENCES/i, level: 2 })).toBeInTheDocument();

    const reviewTexts = screen.getAllByText(/“Patient review will appear here\.”/i);
    expect(reviewTexts.length).toBe(3);
  });

  it('renders Colombo 07 practice location with direct action buttons', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /DENTCARE.*COLOMBO 07/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Modern dental care in Colombo 07, Sri Lanka/i)).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Get Directions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Call Us/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /WhatsApp/i })).toBeInTheDocument();
  });

  it('validates booking appointment form inputs and shows submission confirmation notice', async () => {
    renderLandingPage();

    expect(await screen.findByRole('heading', { name: /YOUR NEXT SMILE.*STARTS HERE/i, level: 2 })).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Request Appointment/i });

    // Attempt submission with empty fields
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Full Name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Phone Number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a treatment of interest/i)).toBeInTheDocument();

    // Fill valid data
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Sanduni Fernando' } });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), { target: { value: '+94 77 123 4567' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'sanduni@example.com' } });
    fireEvent.change(screen.getByLabelText(/Treatment Interested In/i), { target: { value: 'Cosmetic Dentistry' } });
    fireEvent.change(screen.getByLabelText(/Preferred Date/i), { target: { value: '2026-10-15' } });
    fireEvent.change(screen.getByLabelText(/Preferred Time/i), { target: { value: 'Morning (09:00 – 12:00)' } });

    fireEvent.click(submitBtn);

    // Verify non-automatic confirmation notice
    expect(await screen.findByText(/Thank you for contacting DentCare\. Our team will contact you to confirm your appointment\./i)).toBeInTheDocument();
  });

  it('renders final dramatic CTA and comprehensive luxury footer', async () => {
    renderLandingPage();

    // Final CTA
    expect(await screen.findByRole('heading', { name: /READY FOR A.*HEALTHIER.*CONFIDENT SMILE/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Book Your Consultation/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contact DentCare/i })).toBeInTheDocument();

    // Footer
    expect(screen.getByText(/Modern Dentistry\. Designed Around You\./i)).toBeInTheDocument();
    expect(screen.getByText(/© 2026 DentCare\. All Rights Reserved\./i)).toBeInTheDocument();
  });
});
