import React from 'react';
import { ArrowRight, Sparkles, Activity, ShieldCheck, HeartPulse, Stethoscope, Zap, SmilePlus } from 'lucide-react';

export default function TreatmentsSection() {
  const treatments = [
    {
      num: '01',
      name: 'General Dentistry',
      desc: 'Routine preventative examinations, ultrasonic cleanings, and proactive oral wellness preservation.',
      tag: 'PREVENTATIVE'
    },
    {
      num: '02',
      name: 'Cosmetic Dentistry',
      desc: 'Artfully sculpting balance, shade harmony, and facial alignment for a radiant natural smile.',
      tag: 'AESTHETICS'
    },
    {
      num: '03',
      name: 'Teeth Whitening',
      desc: 'Advanced in-chair photo-activated enamel brightening for safe, luminous, long-lasting results.',
      tag: 'ENHANCEMENT'
    },
    {
      num: '04',
      name: 'Dental Implants',
      desc: 'Biocompatible titanium tooth restorations engineered with guided 3D surgical placement.',
      tag: 'RECONSTRUCTION'
    },
    {
      num: '05',
      name: 'Veneers',
      desc: 'Ultra-thin porcelain laminates custom crafted to redefine tooth shape, tone, and symmetry.',
      tag: 'PRECISION PORCELAIN'
    },
    {
      num: '06',
      name: 'Clear Aligners',
      desc: 'Virtually invisible orthodontic alignment guided by computerized motion sequence tracking.',
      tag: 'ORTHODONTICS'
    },
    {
      num: '07',
      name: 'Root Canal Treatment',
      desc: 'Micro-endodontic therapy designed to comfortably preserve teeth and eliminate deep infections.',
      tag: 'ENDODONTICS'
    },
    {
      num: '08',
      name: 'Emergency Dentistry',
      desc: 'Rapid intervention for acute discomfort, dental trauma, fractures, or urgent clinical concerns.',
      tag: 'URGENT CARE'
    },
    {
      num: '09',
      name: "Children's Dentistry",
      desc: 'Gentle, positive pediatric dental experiences fostering lifelong oral health habits.',
      tag: 'PEDIATRICS'
    },
    {
      num: '10',
      name: 'Smile Makeovers',
      desc: 'Comprehensive multi-disciplinary treatment plans combining aesthetic and structural renewal.',
      tag: 'FULL REHABILITATION'
    }
  ];

  return (
    <section id="treatments" className="dc-section" aria-label="Comprehensive Dental Treatments">
      <div className="dc-section-header">
        <span className="dc-section-tag">CLINICAL EXCELLENCE</span>
        <h2 className="dc-section-title">
          DENTAL CARE.<br />
          REIMAGINED.
        </h2>
        <p className="dc-section-desc">
          Comprehensive dentistry designed around your health, comfort and confidence.
        </p>
      </div>

      <div className="dc-treatments-grid">
        {treatments.map((item) => (
          <div key={item.num} className="dc-treatment-card group">
            {/* Visual Header / Micro Graphic */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="dc-treatment-num">{item.num}</span>
                <span className="text-[10px] font-mono tracking-widest text-cyan-400/80 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                  {item.tag}
                </span>
              </div>
              <h3 className="dc-treatment-name group-hover:text-cyan-300 transition-colors">
                {item.name}
              </h3>
              <p className="dc-treatment-desc">{item.desc}</p>
            </div>

            {/* Visual Graphic Placeholder Box with Cyber Aesthetic */}
            <div className="my-3 h-28 rounded-xl bg-gradient-to-br from-[#0b1018] to-[#070a10] border border-white/5 relative overflow-hidden flex items-center justify-center group-hover:border-cyan-500/30 transition-all">
              <div className="absolute inset-0 bg-radial from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex flex-col items-center justify-center text-white/30 group-hover:text-cyan-400/80 transition-colors">
                <Sparkles className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-mono tracking-wider">PRECISION SCAN MAPPING</span>
              </div>
            </div>

            {/* Explore Action Link */}
            <a href="#booking" className="dc-treatment-cta">
              <span>EXPLORE TREATMENT</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
