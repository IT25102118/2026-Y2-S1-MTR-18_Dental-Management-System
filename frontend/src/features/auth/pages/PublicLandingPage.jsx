import React, { useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPath } from '../roleAccess';
import '../../landing/landing-luxury.css';
import LandingNavbar from '../../landing/components/LandingNavbar';
import HeroSection from '../../landing/components/HeroSection';
import IntroSection from '../../landing/components/IntroSection';
import InteractiveAnatomySection from '../../landing/components/InteractiveAnatomySection';
import TreatmentsSection from '../../landing/components/TreatmentsSection';
import TechnologySection from '../../landing/components/TechnologySection';
import SmileTransformationSection from '../../landing/components/SmileTransformationSection';
import WhyDentCareSection from '../../landing/components/WhyDentCareSection';
import TeamSection from '../../landing/components/TeamSection';
import PatientJourneySection from '../../landing/components/PatientJourneySection';
import ReviewsSection from '../../landing/components/ReviewsSection';
import LocationSection from '../../landing/components/LocationSection';
import BookingSection from '../../landing/components/BookingSection';
import FinalCtaSection from '../../landing/components/FinalCtaSection';
import FooterSection from '../../landing/components/FooterSection';

export default function PublicLandingPage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    // Dynamic document title and structured data for Colombo 07 SEO
    document.title = 'DentCare • Advanced Precision Dentistry | Colombo 07, Sri Lanka';

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Dentist',
      name: 'DentCare Colombo 07',
      description: 'Advanced dentistry designed around precision, comfort and natural-looking results in Colombo 07, Sri Lanka.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Colombo',
        postalCode: '00700',
        addressRegion: 'Western Province',
        addressCountry: 'LK'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 6.9147,
        longitude: 79.8732
      },
      telephone: '+94112000000',
      priceRange: '$$$',
      openingHoursSpecification: [
        {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          opens: '08:30',
          closes: '19:30'
        }
      ]
    };

    let scriptTag = document.getElementById('dentcare-schema');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'dentcare-schema';
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(structuredData);

    return () => {
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div
        className="auth-loading-container bg-[#05070b] text-cyan-400 min-h-screen flex flex-col items-center justify-center font-mono"
        role="status"
        aria-live="polite"
        data-testid="landing-loading"
      >
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="tracking-widest text-xs">INITIALIZING DENTCARE PRECISION SUITE...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return (
    <div className="dc-landing-root" data-testid="public-landing-page">
      {/* Background Ambient Glows & Vector Grid */}
      <div className="dc-ambient-glow dc-glow-top-left" />
      <div className="dc-ambient-glow dc-glow-mid-right" />
      <div className="dc-ambient-glow dc-glow-bottom" />
      <div className="dc-grid-overlay" />

      {/* Floating Glass Navigation */}
      <LandingNavbar />

      {/* Main Structural Flow */}
      <main>
        {/* 1. Viewport Hero with 3D Translucent Floating Tooth */}
        <HeroSection />

        {/* 2. Philosophy & Engineered Dentistry Intro */}
        <IntroSection />

        {/* 3. Interactive Multi-layer Anatomical Tooth Inspection */}
        <InteractiveAnatomySection />

        {/* 4. 10 Comprehensive Clinical Treatments */}
        <TreatmentsSection />

        {/* 5. 5 Advanced Clinical Technology Modules */}
        <TechnologySection />

        {/* 6. Interactive Before/After Smile Transformation Slider */}
        <SmileTransformationSection />

        {/* 7. Why DentCare 4 Core Pillars */}
        <WhyDentCareSection />

        {/* 8. Dedicated Clinical Team & Practitioners */}
        <TeamSection />

        {/* 9. 6-Step Structured Patient Journey Timeline */}
        <PatientJourneySection />

        {/* 10. Verified Patient Experiences & Testimonials */}
        <ReviewsSection />

        {/* 11. Practice Location & Facilities in Colombo 07 */}
        <LocationSection />

        {/* 12. Validated Consultation Reservation Booking Engine */}
        <BookingSection />

        {/* 13. High-Impact Glowing Silhouette Final CTA */}
        <FinalCtaSection />
      </main>

      {/* 14. Luxury Clinical Footer */}
      <FooterSection />

      {/* Accessible Hidden Anchor CTAs for End-to-End Registration & Sign-In Test Selectors */}
      <div className="sr-only">
        <Link to="/register" data-testid="accessible-register-link">
          Patient Registration
        </Link>
        <Link to="/login" data-testid="accessible-login-link">
          Sign In
        </Link>
      </div>
    </div>
  );
}
