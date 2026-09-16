import React from 'react';
import { UserCheck, Zap, HeartHandshake, Crosshair } from 'lucide-react';

export default function WhyDentCareSection() {
  const pillars = [
    {
      num: '01',
      title: 'PERSONALISED CARE',
      desc: 'Treatment begins by understanding your concerns and expectations.',
      icon: UserCheck,
      accent: 'cyan'
    },
    {
      num: '02',
      title: 'MODERN APPROACH',
      desc: 'Contemporary dental techniques focused on effective patient care.',
      icon: Zap,
      accent: 'pink'
    },
    {
      num: '03',
      title: 'PATIENT COMFORT',
      desc: 'A calm environment designed around your experience.',
      icon: HeartHandshake,
      accent: 'cyan'
    },
    {
      num: '04',
      title: 'CLINICAL PRECISION',
      desc: 'Careful assessment and personalised treatment planning.',
      icon: Crosshair,
      accent: 'pink'
    }
  ];

  return (
    <section id="why-dentcare" className="dc-section" aria-label="Why Choose DentCare">
      <div className="dc-section-header">
        <span className="dc-section-tag">PRACTICE DISTINCTIONS</span>
        <h2 className="dc-section-title">
          WHY DENTCARE.
        </h2>
        <p className="dc-section-desc">
          Four foundational commitments that guide every consultation, procedure, and patient relationship at our Colombo 07 practice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {pillars.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.num}
              className="dc-glass-card !p-10 flex flex-col justify-between group hover:border-cyan-400/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-8">
                  <span className="font-mono text-3xl font-black text-cyan-400/70 group-hover:text-cyan-300 transition-colors">
                    {item.num}
                  </span>
                  <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 group-hover:text-pink-400 group-hover:scale-110 transition-all">
                    <Icon className="w-6 h-6" />
                  </div>
                </div>

                <h3 className="text-2xl font-black tracking-tight text-white mb-3 group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h3>
                <p className="text-base text-[#aab4c3] leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-white/40">
                <span>DENTCARE PROTOCOL</span>
                <span className="text-cyan-400">COLOMBO 07</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
