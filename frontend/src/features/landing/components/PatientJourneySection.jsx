import React from 'react';
import { Calendar, MessageSquare, Search, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function PatientJourneySection() {
  const steps = [
    {
      step: '01',
      title: 'BOOK',
      desc: 'Request your consultation online or via direct messaging.',
      icon: Calendar
    },
    {
      step: '02',
      title: 'CONSULT',
      desc: 'Discuss your concerns, expectations, medical background and smile goals in a comfortable setting.',
      icon: MessageSquare
    },
    {
      step: '03',
      title: 'ASSESS',
      desc: 'Clinical examination and appropriate diagnostics utilizing low-dose digital imaging and 3D intraoral scans.',
      icon: Search
    },
    {
      step: '04',
      title: 'PLAN',
      desc: 'Receive your personalised treatment plan with clear timelines, transparent milestones and aesthetic options.',
      icon: FileText
    },
    {
      step: '05',
      title: 'TREAT',
      desc: 'Proceed with your agreed treatment in a calm, contemporary clinical suite focused on comfort.',
      icon: CheckCircle2
    },
    {
      step: '06',
      title: 'MAINTAIN',
      desc: 'Continue with regular preventive dental care and proactive checkups to sustain oral health for life.',
      icon: ShieldAlert
    }
  ];

  return (
    <section id="journey" className="dc-section" aria-label="Step-by-step Patient Journey">
      <div className="dc-section-header">
        <span className="dc-section-tag">CARE SEQUENCE</span>
        <h2 className="dc-section-title">
          YOUR JOURNEY<br />
          AT DENTCARE.
        </h2>
        <p className="dc-section-desc">
          Structured, transparent, and patient-centered from your initial inquiry to long-term smile wellness.
        </p>
      </div>

      <div className="dc-timeline">
        {/* Glowing Cyan/Pink Vertical Conduit Line */}
        <div className="dc-timeline-line" />

        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.step} className="dc-timeline-item group">
              {/* Numbered Node */}
              <div className="dc-timeline-node group-hover:border-pink-400 group-hover:scale-110 transition-all">
                {s.step}
              </div>

              {/* Step Detail Card */}
              <div className="dc-timeline-content group-hover:border-cyan-400/40">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                    {s.title}
                  </h3>
                  <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-cyan-400">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-sm text-[#aab4c3] leading-relaxed m-0">
                  {s.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
