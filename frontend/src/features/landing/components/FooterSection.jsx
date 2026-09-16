import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function YoutubeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <polygon points="10 15 15 12 10 9 10 15" />
    </svg>
  );
}

export default function FooterSection() {
  return (
    <footer className="dc-footer" aria-label="Site Footer">
      <div className="dc-footer-container">
        {/* Brand Summary */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="dc-brand-logo">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <span className="dc-brand-text">DENTCARE</span>
          </div>

          <p className="text-sm text-[#aab4c3] leading-relaxed max-w-sm">
            Modern Dentistry. Designed Around You.
          </p>
          <div className="text-xs font-mono text-cyan-400">
            Colombo 07, Sri Lanka
          </div>

          {/* Social Media Placeholders */}
          <div className="flex items-center gap-3 pt-2">
            <a
              href="#social-instagram"
              aria-label="DentCare on Instagram"
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-cyan-400 hover:border-cyan-400/40 transition-colors"
            >
              <InstagramIcon />
            </a>
            <a
              href="#social-facebook"
              aria-label="DentCare on Facebook"
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-cyan-400 hover:border-cyan-400/40 transition-colors"
            >
              <FacebookIcon />
            </a>
            <a
              href="#social-youtube"
              aria-label="DentCare on YouTube"
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-cyan-400 hover:border-cyan-400/40 transition-colors"
            >
              <YoutubeIcon />
            </a>
            <a
              href="#social-tiktok"
              aria-label="DentCare on TikTok"
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-white/70 hover:text-pink-400 hover:border-pink-400/40 transition-colors"
            >
              TT
            </a>
          </div>
        </div>

        {/* Column 1: Clinical Navigation */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-white/40">
            Clinical Navigation
          </div>
          <ul className="space-y-2 text-sm text-[#aab4c3]">
            <li><a href="#hero" className="hover:text-cyan-400 transition-colors">Home</a></li>
            <li><a href="#treatments" className="hover:text-cyan-400 transition-colors">Treatments</a></li>
            <li><a href="#technology" className="hover:text-cyan-400 transition-colors">Technology</a></li>
            <li><a href="#team" className="hover:text-cyan-400 transition-colors">Our Team</a></li>
            <li><a href="#transformations" className="hover:text-cyan-400 transition-colors">Smile Gallery</a></li>
          </ul>
        </div>

        {/* Column 2: Practice & Policies */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-white/40">
            Practice Information
          </div>
          <ul className="space-y-2 text-sm text-[#aab4c3]">
            <li><a href="#why-dentcare" className="hover:text-cyan-400 transition-colors">About</a></li>
            <li><a href="#location" className="hover:text-cyan-400 transition-colors">Contact</a></li>
            <li><a href="#privacy" className="hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
            <li><a href="#terms" className="hover:text-cyan-400 transition-colors">Terms of Care</a></li>
          </ul>
        </div>

        {/* Column 3: Portal Access & Auth */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-widest text-white/40">
            Patient Portal
          </div>
          <ul className="space-y-2 text-sm text-[#aab4c3]">
            <li>
              <Link to="/login" className="hover:text-cyan-400 transition-colors">
                Sign In to Portal
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-cyan-400 transition-colors">
                Patient Registration
              </Link>
            </li>
            <li>
              <a href="#booking" className="hover:text-cyan-400 transition-colors">
                Consultation Request
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal & Meta */}
      <div className="dc-footer-bottom">
        <div>
          © 2026 DentCare. All Rights Reserved. • Colombo 07, Sri Lanka
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-cyan-400">PRECISION HEALTHCARE ARCHITECTURE</span>
        </div>
      </div>
    </footer>
  );
}
