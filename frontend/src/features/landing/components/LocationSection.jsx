import React from 'react';
import { MapPin, Phone, MessageCircle, Mail, Clock, Navigation, Calendar } from 'lucide-react';

export default function LocationSection() {
  const contactDetails = [
    {
      icon: MapPin,
      label: 'Address',
      value: '[Address Placeholder, Ward Place / Cinnamon Gardens, Colombo 07, Sri Lanka]'
    },
    {
      icon: Phone,
      label: 'Telephone',
      value: '[Telephone Placeholder]'
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: '[WhatsApp Placeholder]'
    },
    {
      icon: Mail,
      label: 'Email',
      value: '[Email Placeholder • info@dentcare.lk]'
    },
    {
      icon: Clock,
      label: 'Opening Hours',
      value: '[Monday – Saturday: 08:30 – 19:30 | Sunday: By Appointment]'
    }
  ];

  return (
    <section id="location" className="dc-section" aria-label="Practice Location and Contact Info">
      <div className="dc-section-header">
        <span className="dc-section-tag">PREMIUM CLINICAL FACILITY</span>
        <h2 className="dc-section-title">
          DENTCARE<br />
          COLOMBO 07.
        </h2>
        <p className="dc-section-desc">
          Modern dental care in Colombo 07, Sri Lanka.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
        {/* Contact Information & Action Buttons */}
        <div className="dc-glass-card flex flex-col justify-between !p-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-xs mb-6 border border-cyan-500/20">
              <MapPin className="w-3.5 h-3.5" />
              <span>CENTRAL MEDICAL PRECINCT • CINNAMON GARDENS</span>
            </div>

            <h3 className="text-2xl font-bold text-white mb-6">
              Connect With Our Practice
            </h3>

            <div className="space-y-4 mb-8">
              {contactDetails.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="p-2 rounded-lg bg-cyan-950/40 text-cyan-400 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-cyan-400/80">
                        {item.label}
                      </div>
                      <div className="text-sm font-medium text-white/90">
                        {item.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/10">
            <a
              href="#map-view"
              className="dc-btn-secondary !py-2.5 !px-3 !text-xs justify-center"
            >
              <Navigation className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Get Directions
            </a>

            <a
              href="tel:+94112000000"
              className="dc-btn-secondary !py-2.5 !px-3 !text-xs justify-center"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Call Us
            </a>

            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="dc-btn-secondary !py-2.5 !px-3 !text-xs justify-center"
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              WhatsApp
            </a>

            <a
              href="#booking"
              className="dc-btn-primary !py-2.5 !px-3 !text-xs justify-center"
            >
              <Calendar className="w-3.5 h-3.5 mr-1.5" />
              Book Appointment
            </a>
          </div>
        </div>

        {/* Elegant Dark Map Visual Placeholder with Technical Coordinates */}
        <div id="map-view" className="dc-glass-card !p-0 overflow-hidden relative min-h-[420px] flex flex-col justify-between border-cyan-500/20">
          {/* Map Graphic Canvas / Styled Blueprint */}
          <div className="absolute inset-0 bg-[#070b12] opacity-90">
            {/* Ambient Map Grids */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(83,243,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(83,243,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />
            
            {/* Simulated Road Arteries */}
            <svg className="w-full h-full opacity-40 stroke-cyan-400/40" fill="none" viewBox="0 0 400 400">
              <path d="M 0 180 Q 150 200 400 120" strokeWidth="3" />
              <path d="M 120 0 L 140 400" strokeWidth="3" />
              <path d="M 280 0 L 260 400" strokeWidth="2" strokeDasharray="6 4" />
              <circle cx="200" cy="180" r="40" stroke="#ff6bd6" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx="200" cy="180" r="8" fill="#53f3ff" />
            </svg>
          </div>

          {/* Map Top Telemetry */}
          <div className="relative z-10 p-6 flex items-center justify-between font-mono text-xs text-cyan-300/80 bg-gradient-to-b from-[#05070b]/90 to-transparent">
            <div>GPS: 6.9147° N, 79.8732° E</div>
            <div className="text-pink-400">COLOMBO 07 SECTOR</div>
          </div>

          {/* Pin Card in Center */}
          <div className="relative z-10 p-6 m-6 rounded-2xl bg-[#05070b]/90 backdrop-blur-md border border-cyan-400/30 max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full bg-cyan-400 animate-ping" />
              <div className="font-bold text-white text-base">DentCare Clinical Suite</div>
            </div>
            <p className="text-xs text-[#aab4c3] mb-3">
              Valet parking available for all scheduled dental consultations and treatments.
            </p>
            <div className="text-[11px] font-mono text-cyan-400">
              CINNAMON GARDENS • COLOMBO 07
            </div>
          </div>

          {/* Map Bottom Status */}
          <div className="relative z-10 p-4 font-mono text-[11px] text-white/50 text-center bg-gradient-to-t from-[#05070b] to-transparent border-t border-white/5">
            INTERACTIVE MAP INTEGRATION READY • GOOGLE MAPS API COMPLIANT
          </div>
        </div>
      </div>
    </section>
  );
}
