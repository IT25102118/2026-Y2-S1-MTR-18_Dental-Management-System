import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Sparkles, User, Calendar, Shield } from 'lucide-react';

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Home', href: '#hero' },
    { label: 'Treatments', href: '#treatments' },
    { label: 'Technology', href: '#technology' },
    { label: 'Our Team', href: '#team' },
    { label: 'Smile Gallery', href: '#transformations' },
    { label: 'About', href: '#why-dentcare' },
    { label: 'Contact', href: '#location' }
  ];

  return (
    <nav
      className={`dc-nav ${scrolled ? 'dc-nav-scrolled' : ''}`}
      aria-label="DentCare Main Navigation"
    >
      <div className="dc-nav-inner">
        {/* Brand Logo & Wordmark */}
        <a href="#hero" className="dc-brand" aria-label="DentCare Home">
          <div className="dc-brand-logo">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="dc-brand-text">DENTCARE</span>
            <span className="dc-brand-sub">COLOMBO 07</span>
          </div>
        </a>

        {/* Center Desktop Navigation Links */}
        <ul className="dc-nav-links">
          {navItems.map((item) => (
            <li key={item.label}>
              <a href={item.href} className="dc-nav-link">
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Right Action Controls */}
        <div className="dc-nav-actions">
          <Link
            to="/login"
            className="dc-btn-secondary !py-2 !px-4 !text-xs hidden md:inline-flex"
            data-testid="landing-login-cta"
            title="Access Dental Portal"
          >
            <User className="w-3.5 h-3.5 mr-1" />
            Sign In
          </Link>

          <a
            href="#booking"
            className="dc-btn-primary !py-2 !px-5 !text-xs"
            data-testid="landing-register-cta"
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            Book Appointment
          </a>

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            className="dc-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden mt-3 p-6 rounded-2xl bg-[#070a10]/95 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-4">
          <div className="flex flex-col space-y-4">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-white/80 hover:text-cyan-300 font-medium py-2 border-b border-white/5 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </a>
            ))}

            <div className="pt-4 flex flex-col space-y-3">
              <Link
                to="/login"
                className="dc-btn-secondary text-center justify-center py-2.5"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="dc-btn-primary text-center justify-center py-2.5"
                onClick={() => setMobileOpen(false)}
              >
                Patient Registration
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
