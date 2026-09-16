import React from 'react';
import { Target, HeartHandshake, Smile, CheckCircle2 } from 'lucide-react';

export default function IntroSection() {
  const features = [
    {
      icon: Target,
      tag: 'METHOD 01',
      title: 'PRECISION',
      desc: 'Technology-assisted treatment planning with micro-level restorative accuracy.'
    },
    {
      icon: HeartHandshake,
      tag: 'METHOD 02',
      title: 'COMFORT',
      desc: 'Patient-centred dental care designed to minimise anxiety and ensure gentle procedures.'
    },
    {
      icon: Smile,
      tag: 'METHOD 03',
      title: 'CONFIDENCE',
      desc: 'Natural-looking smile solutions tailored precisely to your facial aesthetics.'
    }
  ];

  return (
    <section id="intro" className="dc-section" aria-label="Introduction to DentCare Philosophy">
      <div className="dc-section-header">
        <span className="dc-section-tag">PHILOSOPHY & STANDARDS</span>
        <h2 className="dc-section-title">
          DENTISTRY.<br />
          ENGINEERED<br />
          AROUND YOU.
        </h2>
        <p className="dc-section-desc">
          At DentCare, modern technology meets personalised dental care. Every treatment begins with understanding your needs, comfort and goals.
        </p>
      </div>

      <div className="dc-intro-cards">
        {features.map((feat) => {
          const Icon = feat.icon;
          return (
            <div key={feat.title} className="dc-glass-card">
              <div className="flex items-center justify-between mb-4">
                <div className="dc-card-icon-wrap">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="font-mono text-xs text-cyan-400 tracking-wider">
                  {feat.tag}
                </span>
              </div>
              <h3 className="dc-card-title">{feat.title}</h3>
              <p className="dc-card-desc">{feat.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
