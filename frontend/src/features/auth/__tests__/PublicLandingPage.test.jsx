import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import PublicLandingPage from '../pages/PublicLandingPage';
import clinicContactConfig from '../../../config/clinicContactConfig';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null
  })
}));

describe('PublicLandingPage Demo Clinical Team Profiles (Prompt 93)', () => {
  const renderLandingPage = () => {
    return render(
      <MemoryRouter>
        <PublicLandingPage />
      </MemoryRouter>
    );
  };

  it('renders Section 1: Clinical Team heading, lead, and visible fictional-demo disclaimer', () => {
    renderLandingPage();

    // 1. Clinical Team heading renders
    expect(screen.getByText('CLINICAL TEAM')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Meet our demo dental team/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Explore example dental professionals and the types of clinical care workflows supported by the DentCare platform\./i)
    ).toBeInTheDocument();

    // 2. Visible fictional-demo disclaimer renders
    const disclaimer = screen.getByTestId('demo-team-disclaimer');
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer).toHaveTextContent(/Demo team profiles · Fictional examples for the DentCare university project/i);
  });

  it('renders exactly three fictional demo dentist profile cards with names, demo badge, roles, focus, and biographies', () => {
    renderLandingPage();

    // 3. Exactly three profile cards render
    const cardLawson = screen.getByTestId('demo-dentist-card-lawson');
    const cardWells = screen.getByTestId('demo-dentist-card-wells');
    const cardMercer = screen.getByTestId('demo-dentist-card-mercer');
    expect(cardLawson).toBeInTheDocument();
    expect(cardWells).toBeInTheDocument();
    expect(cardMercer).toBeInTheDocument();

    // 4. Each card displays a fictional sample name
    expect(screen.getByRole('heading', { name: /Dr\. Maya Lawson/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Dr\. Adrian Wells/i, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Dr\. Elena Mercer/i, level: 3 })).toBeInTheDocument();

    // 5. Each card displays "DEMO PROFILE"
    const demoBadges = screen.getAllByText('DEMO PROFILE');
    expect(demoBadges.length).toBe(3);

    // Display role: Demo Dentist
    const demoDentistLabels = screen.getAllByText('Demo Dentist');
    expect(demoDentistLabels.length).toBe(3);

    // 6. Each card has clinical focus and biography
    // Card 1: Lawson
    expect(screen.getByText('RESTORATIVE CARE')).toBeInTheDocument();
    expect(screen.getByText('Restorative & Aesthetic Dentistry')).toBeInTheDocument();
    expect(
      screen.getByText(/Focuses on restorative dental treatments, smile aesthetics, and clear treatment planning to support comfortable, patient-centered care\./i)
    ).toBeInTheDocument();

    // Card 2: Wells
    expect(screen.getByText('ORAL SURGERY CARE')).toBeInTheDocument();
    expect(screen.getByText('Oral Surgery & Dental Treatment')).toBeInTheDocument();
    expect(
      screen.getByText(/Demonstrates treatment workflows for dental extractions, surgical consultations, and coordinated patient care\./i)
    ).toBeInTheDocument();

    // Card 3: Mercer
    expect(screen.getByText('PREVENTIVE & ORTHODONTIC CARE')).toBeInTheDocument();
    expect(screen.getByText('Preventive & Orthodontic Care')).toBeInTheDocument();
    expect(
      screen.getByText(/Highlights preventive dentistry, oral health education, and orthodontic consultation workflows\./i)
    ).toBeInTheDocument();
  });

  it('verifies representative image alt text does not falsely identify a photographed person', () => {
    renderLandingPage();

    // 7. Representative image alt text
    const neutralImages = screen.getAllByAltText('Representative dental professional in a clinic');
    expect(neutralImages.length).toBe(3);

    const allImages = screen.getAllByRole('img');
    allImages.forEach((img) => {
      const alt = img.getAttribute('alt') || '';
      expect(alt).not.toMatch(/Portrait of Dr\./i);
      expect(alt).not.toMatch(/Maya Lawson/i);
      expect(alt).not.toMatch(/Adrian Wells/i);
      expect(alt).not.toMatch(/Elena Mercer/i);
      expect(alt).not.toMatch(/Robinson/i);
      expect(alt).not.toMatch(/Turner/i);
      expect(alt).not.toMatch(/Wilson/i);
      expect(alt).not.toMatch(/Licensed dentist/i);
    });
  });

  it('ensures all three appointment booking links use the existing /patient/appointments route without doctor pre-selection', () => {
    renderLandingPage();

    // 8. All three appointment links use existing /patient/appointments route
    const bookingButtons = [
      screen.getByTestId('book-appointment-lawson'),
      screen.getByTestId('book-appointment-wells'),
      screen.getByTestId('book-appointment-mercer')
    ];

    bookingButtons.forEach((btn) => {
      expect(btn).toHaveAttribute('href', '/patient/appointments');
      expect(btn.getAttribute('href')).not.toMatch(/[?&](dentist|doctor|staff)Id=/i);
      expect(btn).toHaveTextContent(/Book an Appointment/i);
    });
  });

  it('does not assert fabricated qualifications or actual staff employment claims', () => {
    renderLandingPage();

    // 9. No fabricated qualifications or actual staff employment claims
    const textContent = document.body.textContent;
    expect(textContent).not.toMatch(/licensed practitioner/i);
    expect(textContent).not.toMatch(/licensed dentist/i);
    expect(textContent).not.toMatch(/registered medical professional/i);
    expect(textContent).not.toMatch(/board-certified/i);
    expect(textContent).not.toMatch(/\bBDS\b/);
    expect(textContent).not.toMatch(/\bDDS\b/);
    expect(textContent).not.toMatch(/\bMDS\b/);
    expect(textContent).not.toMatch(/\bPhD\b/);
    expect(textContent).not.toMatch(/registration number/i);
    expect(textContent).not.toMatch(/license number/i);
    expect(textContent).not.toMatch(/years of (professional )?experience/i);
    expect(textContent).not.toMatch(/real clinic employment/i);
    expect(textContent).not.toMatch(/working hours/i);
    expect(textContent).not.toMatch(/patient reviews/i);
    expect(textContent).not.toMatch(/verified awards/i);
  });

  it('renders Section 2: Patient Experience with media composition, callout, and checklist rows unchanged', () => {
    renderLandingPage();

    // 10. Patient Experience section remains present and unchanged
    expect(screen.getByText('PATIENT CENTERED')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /A calm, refined approach to modern oral care/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/DentCare brings appointments, clinical records, treatment planning, billing, and prescriptions into one coordinated digital experience\./i)
    ).toBeInTheDocument();

    // Callout
    expect(
      screen.getByText(/DentCare coordinates clinical care and practice workflows through one integrated system, helping patients and staff manage treatment information more clearly\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Care Coordination & Practice Workflows/i)).toBeInTheDocument();

    // Checklist
    expect(screen.getByText(/Structured clinical and treatment records/i)).toBeInTheDocument();
    expect(screen.getByText(/Clear billing and appointment information/i)).toBeInTheDocument();
    expect(screen.getByText(/Coordinated prescription and follow-up workflows/i)).toBeInTheDocument();

    // Media Composition
    expect(screen.getByAltText(/Coordinated modern dental consultation/i)).toBeInTheDocument();
    expect(screen.getByText('PATIENT EXPERIENCE')).toBeInTheDocument();
    expect(screen.getByText('Coordinated Dental Care')).toBeInTheDocument();
    expect(screen.getByAltText(/Illustrative simulation of aligned smile result/i)).toBeInTheDocument();
    expect(screen.getByText('ILLUSTRATIVE SIMULATION')).toBeInTheDocument();
  });

  it('preserves existing account access CTAs and navigation on the landing page', () => {
    renderLandingPage();

    // 11. Existing Patient Login, Staff Login, and Patient Registration navigation remains functional
    expect(screen.getByTestId('landing-patient-login-cta')).toHaveAttribute('href', '/patient/login');
    expect(screen.getByTestId('landing-staff-login-cta')).toHaveAttribute('href', '/staff/login');
    expect(screen.getByTestId('landing-register-cta')).toHaveAttribute('href', '/register');
  });

  it('renders interactive Before/After teeth comparison slider with 50% initial position and accessible simulation labels', () => {
    renderLandingPage();

    const slider = screen.getByTestId('teeth-comparison-slider');
    expect(slider).toBeInTheDocument();
    expect(screen.getByText('BEFORE')).toBeInTheDocument();
    expect(screen.getByText('AFTER')).toBeInTheDocument();

    const simBadge = screen.getByTestId('teeth-slider-sim-badge');
    expect(simBadge).toBeInTheDocument();
    expect(simBadge).toHaveTextContent('ILLUSTRATIVE SIMULATION');

    const handle = screen.getByTestId('teeth-slider-handle');
    expect(handle).toBeInTheDocument();
    expect(handle).toHaveAttribute('role', 'slider');
    expect(handle).toHaveAttribute('aria-valuenow', '50');
    expect(handle).toHaveAttribute('aria-valuemin', '0');
    expect(handle).toHaveAttribute('aria-valuemax', '100');
    expect(handle).toHaveAttribute('aria-label', 'Before and after teeth comparison illustrative simulation slider');
    expect(handle).toHaveAttribute('aria-valuetext', '50% before simulation revealed');

    const beforeImg = screen.getByAltText(/Illustrative simulation of smile before treatment/i);
    const afterImg = screen.getByAltText(/Illustrative simulation of aligned smile result/i);
    expect(beforeImg).toBeInTheDocument();
    expect(afterImg).toBeInTheDocument();
    expect(beforeImg).toHaveStyle({ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' });
  });

  it('supports full keyboard navigation on the comparison slider handle including arrows, page keys, and home/end', () => {
    renderLandingPage();

    const handle = screen.getByTestId('teeth-slider-handle');

    // ArrowLeft decreases percentage by 5 (revealing more of After)
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle).toHaveAttribute('aria-valuenow', '45');

    // ArrowDown decreases percentage by 5
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(handle).toHaveAttribute('aria-valuenow', '40');

    // ArrowRight increases percentage by 5 (revealing more of Before)
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '45');

    // ArrowUp increases percentage by 5
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(handle).toHaveAttribute('aria-valuenow', '50');

    // PageDown decreases percentage by 10
    fireEvent.keyDown(handle, { key: 'PageDown' });
    expect(handle).toHaveAttribute('aria-valuenow', '40');

    // PageUp increases percentage by 10
    fireEvent.keyDown(handle, { key: 'PageUp' });
    expect(handle).toHaveAttribute('aria-valuenow', '50');

    // Home jumps to 0 (minimum)
    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle).toHaveAttribute('aria-valuenow', '0');

    // ArrowLeft / ArrowDown cannot go below 0
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(handle).toHaveAttribute('aria-valuenow', '0');
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(handle).toHaveAttribute('aria-valuenow', '0');

    // End jumps to 100 (maximum)
    fireEvent.keyDown(handle, { key: 'End' });
    expect(handle).toHaveAttribute('aria-valuenow', '100');

    // ArrowRight / ArrowUp cannot exceed 100
    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle).toHaveAttribute('aria-valuenow', '100');
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    expect(handle).toHaveAttribute('aria-valuenow', '100');
  });

  it('updates slider position on drag, supports window-level release outside card, and prevents stuck state', () => {
    renderLandingPage();

    const slider = screen.getByTestId('teeth-comparison-slider');
    const handle = screen.getByTestId('teeth-slider-handle');
    const beforeImg = screen.getByAltText(/Illustrative simulation of smile before treatment/i);

    // Mock bounding rect for dragging
    slider.getBoundingClientRect = () => ({
      left: 100,
      width: 200,
      top: 0,
      height: 150,
      right: 300,
      bottom: 150
    });

    // Mouse down at clientX = 160 (60px from left of 200px = 30%)
    fireEvent.mouseDown(slider, { clientX: 160 });
    expect(slider).toHaveClass('is-dragging');
    expect(handle).toHaveAttribute('aria-valuenow', '30');
    expect(beforeImg).toHaveStyle({ clipPath: 'polygon(0 0, 30% 0, 30% 100%, 0 100%)' });

    // Drag move on window outside local bounds (clientX = 250 -> 75%)
    fireEvent.mouseMove(window, { clientX: 250 });
    expect(handle).toHaveAttribute('aria-valuenow', '75');
    expect(beforeImg).toHaveStyle({ clipPath: 'polygon(0 0, 75% 0, 75% 100%, 0 100%)' });

    // Mouse up on window outside card releases drag cleanly
    fireEvent.mouseUp(window);
    expect(slider).not.toHaveClass('is-dragging');

    // Further mouse moves on window do not modify position when dragging is inactive
    fireEvent.mouseMove(window, { clientX: 120 });
    expect(handle).toHaveAttribute('aria-valuenow', '75');
  });

  it('clamps slider position strictly between 0% and 100% when dragged beyond card bounds', () => {
    renderLandingPage();

    const slider = screen.getByTestId('teeth-comparison-slider');
    const handle = screen.getByTestId('teeth-slider-handle');
    const beforeImg = screen.getByAltText(/Illustrative simulation of smile before treatment/i);

    slider.getBoundingClientRect = () => ({
      left: 100,
      width: 200,
      top: 0,
      height: 150,
      right: 300,
      bottom: 150
    });

    // Drag far to the left of the card (clientX = 50, left is 100) -> clamps to 0%
    fireEvent.mouseDown(slider, { clientX: 50 });
    expect(handle).toHaveAttribute('aria-valuenow', '0');
    expect(beforeImg).toHaveStyle({ clipPath: 'polygon(0 0, 0% 0, 0% 100%, 0 100%)' });

    // Drag far to the right of the card (clientX = 350, right is 300) -> clamps to 100%
    fireEvent.mouseMove(window, { clientX: 350 });
    expect(handle).toHaveAttribute('aria-valuenow', '100');
    expect(beforeImg).toHaveStyle({ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' });

    fireEvent.mouseUp(window);
    expect(slider).not.toHaveClass('is-dragging');
  });

  it('safely stops dragging on pointer cancellation and lost pointer capture', () => {
    renderLandingPage();

    const slider = screen.getByTestId('teeth-comparison-slider');
    const handle = screen.getByTestId('teeth-slider-handle');

    slider.getBoundingClientRect = () => ({
      left: 100,
      width: 200,
      top: 0,
      height: 150,
      right: 300,
      bottom: 150
    });

    // Start drag with pointer down
    fireEvent.pointerDown(slider, { pointerId: 1 });
    expect(slider).toHaveClass('is-dragging');

    // Pointer cancellation event terminates drag
    fireEvent.pointerCancel(slider);
    expect(slider).not.toHaveClass('is-dragging');

    // Start drag again and test lost pointer capture
    fireEvent.pointerDown(slider, { pointerId: 1 });
    expect(slider).toHaveClass('is-dragging');
    fireEvent.lostPointerCapture(slider);
    expect(slider).not.toHaveClass('is-dragging');
  });

  it('confirms the slider is transparently presented as an illustrative simulation without fabricated patient claims', () => {
    renderLandingPage();

    // Verify badge and alt text describe simulation
    expect(screen.getByTestId('teeth-slider-sim-badge')).toHaveTextContent(/ILLUSTRATIVE SIMULATION/i);

    const images = screen.getAllByRole('img');
    const sliderImages = images.filter((img) =>
      /Illustrative simulation/i.test(img.getAttribute('alt') || '')
    );
    expect(sliderImages.length).toBe(2);

    // Ensure no misleading real patient claim text appears in slider area
    const slider = screen.getByTestId('teeth-comparison-slider');
    expect(slider.textContent).not.toMatch(/verified patient/i);
    expect(slider.textContent).not.toMatch(/actual patient result/i);
    expect(slider.textContent).not.toMatch(/guaranteed result/i);
  });
});

describe('PublicLandingPage Clinic Location & Contact Section (Prompt 95)', () => {
  const renderLandingPage = () => {
    return render(
      <MemoryRouter>
        <PublicLandingPage />
      </MemoryRouter>
    );
  };

  it('renders Section 8: Location & Contact heading, eyebrow, and description', () => {
    renderLandingPage();

    const locationSection = screen.getByTestId('public-location-section');
    expect(locationSection).toBeInTheDocument();

    expect(screen.getByText('CLINIC LOCATION & CONTACT')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /Visit & Contact DentCare/i, level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Explore our demonstration clinic location, contact information, and appointment booking experience\./i)
    ).toBeInTheDocument();
  });

  it('renders illustrative map visual with demo disclaimer badge, accessible label, and caption', () => {
    renderLandingPage();

    // Map frame and disclaimer
    const mapFrame = screen.getByTestId('clinic-map-frame');
    expect(mapFrame).toBeInTheDocument();

    const demoBadge = screen.getByTestId('clinic-map-demo-badge');
    expect(demoBadge).toBeInTheDocument();
    expect(demoBadge).toHaveTextContent('DEMO LOCATION — NOT A REAL CLINIC ADDRESS');

    // Visual container has accessible role="img" and illustrative label
    const mapVisual = screen.getByTestId('clinic-map-visual');
    expect(mapVisual).toBeInTheDocument();
    expect(mapVisual).toHaveAttribute('role', 'img');
    expect(mapVisual.getAttribute('aria-label')).toMatch(/Illustrative map/i);
    expect(mapVisual.getAttribute('aria-label')).toMatch(/not a real navigation map/i);

    // Caption renders
    const mapCaption = screen.getByTestId('clinic-map-caption');
    expect(mapCaption).toBeInTheDocument();
    expect(mapCaption).toHaveTextContent('Illustrative map · Colombo, Sri Lanka');

    // Internal map elements render (street names, clinic callout)
    expect(screen.getByText('GALLE RD CORRIDOR')).toBeInTheDocument();
    expect(screen.getByText('LOTUS BOULEVARD')).toBeInTheDocument();
    expect(screen.getByText('CLINIC WAY')).toBeInTheDocument();
    expect(screen.getByText('CENTRAL GREEN PARK')).toBeInTheDocument();
    expect(screen.getByText('ESPLANADE GROUNDS')).toBeInTheDocument();
    expect(screen.getByText('DentCare Clinic')).toBeInTheDocument();
    expect(screen.getByText('Demonstration Location')).toBeInTheDocument();
  });

  it('renders clinic information card with demo badge, clinic name, location, and contact items', () => {
    renderLandingPage();

    const infoCard = screen.getByTestId('clinic-info-card');
    expect(infoCard).toBeInTheDocument();

    // Demo badge
    const clinicDemoBadge = screen.getByTestId('clinic-demo-badge');
    expect(clinicDemoBadge).toBeInTheDocument();
    expect(clinicDemoBadge).toHaveTextContent('DEMO LOCATION');

    // Clinic name & location
    expect(screen.getByRole('heading', { name: 'DentCare Demonstration Clinic', level: 3 })).toBeInTheDocument();
    expect(within(infoCard).getByText('Colombo, Sri Lanka')).toBeInTheDocument();

    // Phone & Email placeholders
    const phoneVal = screen.getByTestId('clinic-phone-value');
    expect(phoneVal).toBeInTheDocument();
    expect(phoneVal).toHaveTextContent('+94 XX XXX XXXX');

    const emailVal = screen.getByTestId('clinic-email-value');
    expect(emailVal).toBeInTheDocument();
    expect(emailVal).toHaveTextContent('contact@dentcare.example');
  });

  it('clearly marks opening hours with sample note and day/time schedules', () => {
    renderLandingPage();

    const hoursNote = screen.getByTestId('clinic-hours-note');
    expect(hoursNote).toBeInTheDocument();
    expect(hoursNote).toHaveTextContent('Example opening hours — for demonstration only');

    expect(screen.getByText('Monday–Friday')).toBeInTheDocument();
    expect(screen.getByText('8:30 AM–6:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Saturday')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM–1:00 PM')).toBeInTheDocument();
  });

  it('strictly ensures placeholder telephone and email values are non-actionable (no tel: or mailto: links)', () => {
    renderLandingPage();

    const phoneVal = screen.getByTestId('clinic-phone-value');
    const emailVal = screen.getByTestId('clinic-email-value');

    // Values are not inside anchor tags
    expect(phoneVal.closest('a')).toBeNull();
    expect(emailVal.closest('a')).toBeNull();

    // No tel: or mailto: anchors exist in the DOM
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('renders Book an Appointment CTA targeting /patient/appointments without pre-selection', () => {
    renderLandingPage();

    const bookingCta = screen.getByTestId('clinic-booking-cta');
    expect(bookingCta).toBeInTheDocument();
    expect(bookingCta).toHaveTextContent('Book an Appointment');
    expect(bookingCta).toHaveAttribute('href', '/patient/appointments');
    expect(bookingCta.getAttribute('href')).not.toMatch(/[?&](dentist|doctor|staff)Id=/i);
  });

  it('verifies proper homepage insertion point (preceding footer, following final action area)', () => {
    renderLandingPage();

    const locationSection = screen.getByTestId('public-location-section');
    const finalCta = document.querySelector('.public-cta');
    const footer = document.querySelector('.public-footer');

    expect(locationSection).toBeInTheDocument();
    expect(finalCta).toBeInTheDocument();
    expect(footer).toBeInTheDocument();

    // Final CTA comes before Location Section
    expect(finalCta.compareDocumentPosition(locationSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Location Section comes before Footer
    expect(locationSection.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('preserves all existing homepage sections and navigation links unchanged', () => {
    renderLandingPage();

    // Hero
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Better dental care starts with a better experience/i);

    // Clinical Team
    expect(screen.getByRole('heading', { name: /Meet our demo dental team/i, level: 2 })).toBeInTheDocument();

    // Patient Experience
    expect(screen.getByRole('heading', { name: /A calm, refined approach to modern oral care/i, level: 2 })).toBeInTheDocument();

    // Portal Choice
    expect(screen.getByRole('heading', { name: /Choose your access portal/i, level: 2 })).toBeInTheDocument();

    // Security Architecture
    expect(screen.getByRole('heading', { name: /Access designed around verified roles/i, level: 2 })).toBeInTheDocument();

    // FAQ
    expect(screen.getByRole('heading', { name: /Frequently asked questions/i, level: 2 })).toBeInTheDocument();

    // Final CTA
    expect(screen.getByRole('heading', { name: /Ready to access DentCare\?/i, level: 2 })).toBeInTheDocument();

    // Footer Navigation Links
    const footerNav = document.querySelector('.public-footer');
    expect(within(footerNav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(footerNav).getByRole('link', { name: 'Patient Login' })).toHaveAttribute('href', '/patient/login');
    expect(within(footerNav).getByRole('link', { name: 'Staff Login' })).toHaveAttribute('href', '/staff/login');
    expect(within(footerNav).getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/login');
    expect(within(footerNav).getByRole('link', { name: 'Patient Registration' })).toHaveAttribute('href', '/register');
  });
});

