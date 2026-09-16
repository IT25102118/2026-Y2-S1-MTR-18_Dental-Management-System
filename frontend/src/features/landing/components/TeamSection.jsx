import React from 'react';
import { User, ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';

export default function TeamSection() {
  // Using strictly verified placeholders per instructions without fabricating credentials
  const teamMembers = [
    {
      id: 1,
      name: 'Dr. [Name]',
      qualification: '[Qualification]',
      role: 'Lead Dental Surgeon • [Role]'
    },
    {
      id: 2,
      name: 'Dr. [Name]',
      qualification: '[Qualification]',
      role: 'Specialist • [Role]'
    },
    {
      id: 3,
      name: 'Dr. [Name]',
      qualification: '[Qualification]',
      role: 'Associate Dentist • [Role]'
    }
  ];

  return (
    <section id="team" className="dc-section" aria-label="Clinical Dental Team">
      <div className="dc-section-header">
        <span className="dc-section-tag">CLINICAL DIRECTORS & PRACTITIONERS</span>
        <h2 className="dc-section-title">
          MEET THE PEOPLE<br />
          BEHIND YOUR SMILE.
        </h2>
        <p className="dc-section-desc">
          Experienced dental practitioners dedicated to clinical excellence, continuous education, and empathetic patient care in Colombo 07.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="dc-glass-card flex flex-col justify-between group hover:border-cyan-400/40 transition-all"
          >
            <div>
              {/* Doctor Avatar Graphic Box with Futuristic Holographic Aura */}
              <div className="w-full h-64 rounded-2xl bg-gradient-to-b from-[#0e1622] to-[#070a10] border border-white/5 mb-6 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-cyan-500/30 transition-colors">
                <div className="absolute inset-0 bg-radial from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-24 h-24 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_20px_rgba(83,243,255,0.2)]">
                  <User className="w-12 h-12" />
                </div>
                <span className="text-[11px] font-mono text-cyan-300/70 tracking-widest uppercase">
                  VERIFIED CLINICAL PRACTITIONER
                </span>
              </div>

              {/* Profile Details (Placeholders) */}
              <div className="space-y-1 mb-6">
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {member.name}
                </h3>
                <div className="text-xs font-mono text-cyan-400">
                  {member.qualification}
                </div>
                <div className="text-sm text-[#aab4c3]">
                  {member.role}
                </div>
              </div>
            </div>

            {/* Profile Action Button */}
            <a
              href="#booking"
              className="inline-flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-mono tracking-wider text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all group-hover:border-cyan-500/20"
            >
              <span>VIEW PROFILE</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
