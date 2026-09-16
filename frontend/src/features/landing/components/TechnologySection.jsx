import React from 'react';
import { Scan, Cpu, Eye, Camera, Crosshair, Sparkles, ShieldAlert } from 'lucide-react';

export default function TechnologySection() {
  const modules = [
    {
      id: '3d-scanning',
      icon: Scan,
      badge: 'OPTICAL RECONSTRUCTION',
      name: '3D DIGITAL SCANNING',
      desc: 'High-speed intraoral optical sensors mapping dentition in true color with micron-level contour fidelity without messy physical impressions.'
    },
    {
      id: 'smile-planning',
      icon: Cpu,
      badge: 'AESTHETIC SIMULATION',
      name: 'DIGITAL SMILE PLANNING',
      desc: 'Predictive facial contour algorithms simulating realistic aesthetic endpoints and harmonic tooth dimensions prior to active treatment.'
    },
    {
      id: 'digital-imaging',
      icon: Eye,
      badge: 'LOW-RADIATION CBCT',
      name: 'DIGITAL IMAGING',
      desc: 'Volumetric cone-beam diagnostics generating multi-planar cross sections of the jawbone, root canals, and nerve anatomy.'
    },
    {
      id: 'intraoral-cameras',
      icon: Camera,
      badge: 'CHAIRSIDE TELEMETRY',
      name: 'INTRAORAL CAMERAS',
      desc: 'Macro-magnification imaging displaying live high-definition visuals on patient screens for transparent understanding of findings.'
    },
    {
      id: 'guided-implants',
      icon: Crosshair,
      badge: 'COMPUTER-ASSISTED SURGERY',
      name: 'GUIDED IMPLANT PLANNING',
      desc: 'Surgically pre-mapped stent guides engineered to position restorative fixtures with millimeter depth and angulation control.'
    }
  ];

  return (
    <section id="technology-suite" className="dc-section" aria-label="Clinical Technology Suite">
      <div className="dc-section-header">
        <span className="dc-section-tag">ADVANCED CLINICAL SYSTEMS</span>
        <h2 className="dc-section-title">
          PRECISION<br />
          BEGINS WITH<br />
          TECHNOLOGY.
        </h2>
        <p className="dc-section-desc">
          State-of-the-art diagnostic and digital workflow systems engineered to maximize clinical accuracy, patient safety, and aesthetic predictability.
        </p>
      </div>

      <div className="dc-tech-grid">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div key={mod.id} className="dc-tech-card group">
              {/* Dynamic Scanning Laser Sweep */}
              <div className="dc-tech-scanline" />

              <div className="flex items-center justify-between mb-4">
                <span className="dc-tech-badge">{mod.badge}</span>
                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 group-hover:text-pink-400 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <h3 className="text-xl font-bold mb-2 tracking-tight group-hover:text-cyan-300 transition-colors">
                {mod.name}
              </h3>
              <p className="text-sm text-[#aab4c3] leading-relaxed mb-4">
                {mod.desc}
              </p>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-cyan-400/70">
                <span>SPEC: CALIBRATED</span>
                <span className="text-white/40">SYSTEM READY</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mandatory Transparent Note on Equipment Configuration */}
      <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/10 text-center text-xs text-white/50 max-w-2xl mx-auto flex items-center justify-center gap-2">
        <ShieldAlert className="w-4 h-4 text-cyan-400 flex-shrink-0" />
        <span>
          Clinical technology modules displayed represent diagnostic workflows. Specific instrumentation is tailored per clinical examination.
        </span>
      </div>
    </section>
  );
}
