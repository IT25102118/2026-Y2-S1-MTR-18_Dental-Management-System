import React from 'react';
import { ArrowDown, Calendar, Sparkles, Compass, ShieldCheck, Activity } from 'lucide-react';
import ToothCanvas3D from '../ToothCanvas3D';

export default function HeroSection() {
  return (
    <section id="hero" className="dc-hero" aria-label="Hero Overview">
      <div className="dc-hero-container">
        {/* Left Column: Typography, Copy & Calls to Action */}
        <div className="dc-hero-content">
          {/* Eyebrow */}
          <div className="dc-eyebrow">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>DENTCARE • COLOMBO 07</span>
          </div>

          {/* Main Headline */}
          <h1 className="dc-hero-headline">
            EVERY SMILE.<br />
            MAPPED WITH<br />
            <span className="dc-gradient-precision">PRECISION.</span>
          </h1>

          {/* Supporting Copy */}
          <p className="dc-hero-lead">
            Advanced dentistry designed around precision, comfort and natural-looking results.
          </p>
          <p className="dc-hero-sublead">
            Experience modern dental care in the heart of Colombo 07.
          </p>

          {/* Action CTAs */}
          <div className="dc-hero-actions">
            <a href="#booking" className="dc-btn-primary">
              <Calendar className="w-4 h-4" />
              Book An Appointment
            </a>

            <a href="#treatments" className="dc-btn-secondary">
              <Compass className="w-4 h-4" />
              Explore Treatments
            </a>
          </div>

          {/* Practice Pillars Metrics */}
          <div className="dc-hero-badges">
            <div className="dc-badge-item">
              <span className="dc-badge-value">0.02mm</span>
              <span className="dc-badge-label">Optical Accuracy</span>
            </div>
            <div className="dc-badge-item">
              <span className="dc-badge-value">3D CBCT</span>
              <span className="dc-badge-label">Guided Diagnostics</span>
            </div>
            <div className="dc-badge-item">
              <span className="dc-badge-value">COLOMBO 07</span>
              <span className="dc-badge-label">Ward Place Suite</span>
            </div>
          </div>
        </div>

        {/* Right Column: Signature 3D Translucent Floating Tooth */}
        <div className="dc-hero-visual" aria-hidden="true">
          <ToothCanvas3D mode="hero" interactive={true} />
        </div>
      </div>

      {/* Scroll to Discover Indicator */}
      <a href="#intro" className="dc-scroll-discover" aria-label="Scroll down to intro section">
        <span>SCROLL TO DISCOVER</span>
        <ArrowDown className="w-3.5 h-3.5" />
      </a>
    </section>
  );
}
