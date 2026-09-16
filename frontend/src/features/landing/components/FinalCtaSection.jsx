import React from 'react';
import { Calendar, PhoneCall, Sparkles } from 'lucide-react';

export default function FinalCtaSection() {
  return (
    <section className="dc-section !py-12" aria-label="Final Consultation Call to Action">
      <div className="dc-final-cta relative overflow-hidden">
        {/* Large Glowing Tooth Silhouette Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
          <div className="w-96 h-96 rounded-full bg-gradient-to-tr from-cyan-500/30 to-pink-500/20 blur-3xl animate-pulse" />
          <svg
            className="absolute w-[440px] h-[520px] stroke-cyan-400/20 fill-cyan-400/5 -bottom-20"
            viewBox="0 0 200 240"
          >
            <path
              d="M 50 40 C 35 60, 30 100, 55 125 C 65 135, 70 170, 65 210 C 62 230, 75 235, 80 220 C 88 190, 95 150, 100 135 C 105 150, 112 190, 120 220 C 125 235, 138 230, 135 210 C 130 170, 135 135, 145 125 C 170 100, 165 60, 150 40 C 135 22, 115 32, 100 24 C 85 32, 65 22, 50 40 Z"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-xs border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>COMMENCE YOUR CARE ROADMAP</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight uppercase">
            READY FOR A<br />
            HEALTHIER,<br />
            <span className="dc-gradient-precision">CONFIDENT SMILE?</span>
          </h2>

          <p className="text-lg text-[#aab4c3] max-w-xl mx-auto">
            Start with a consultation at DentCare, Colombo 07.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <a href="#booking" className="dc-btn-primary !px-8 !py-3.5 text-sm">
              <Calendar className="w-4 h-4 mr-2" />
              Book Your Consultation
            </a>

            <a href="#location" className="dc-btn-secondary !px-8 !py-3.5 text-sm">
              <PhoneCall className="w-4 h-4 mr-2" />
              Contact DentCare
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
