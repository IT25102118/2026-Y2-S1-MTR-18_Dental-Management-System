import React, { useState } from 'react';
import { Layers, ShieldCheck, Activity, Eye, Zap, Radio } from 'lucide-react';
import ToothCanvas3D from '../ToothCanvas3D';

export default function InteractiveAnatomySection() {
  const [activeLayer, setActiveLayer] = useState('all');

  const layers = [
    {
      id: 'enamel',
      title: 'ENAMEL',
      tag: 'HYDROXYAPATITE 96%',
      desc: 'Protective outer surface. The hardest substance in the human body, shielding the tooth from mechanical wear and acidic erosion.',
      metric: '0.02mm Scan Threshold'
    },
    {
      id: 'dentin',
      title: 'DENTIN',
      tag: 'MINERALIZED MATRIX 70%',
      desc: 'The layer beneath the enamel. Composed of microscopic tubules transmitting thermal and pressure sensations to the nerve centre.',
      metric: 'Caries Barrier Depth'
    },
    {
      id: 'pulp',
      title: 'PULP',
      tag: 'NEUROVASCULAR CORE',
      desc: 'Contains nerves, arterioles, and vital blood vessels supplying biological vitality and cellular regeneration to the tooth.',
      metric: 'Endodontic Vitality'
    },
    {
      id: 'root',
      title: 'ROOT',
      tag: 'PERIODONTAL ANCHORAGE',
      desc: 'Supports the tooth firmly within the jawbone, secured by the periodontal ligament fibers and surrounding cementum.',
      metric: 'Bone Density Index'
    }
  ];

  return (
    <section id="technology" className="dc-section" aria-label="Interactive Dental Anatomy Visualization">
      <div className="dc-section-header">
        <span className="dc-section-tag">ADVANCED OPTICAL TOMOGRAPHY</span>
        <h2 className="dc-section-title">
          SEE BEYOND<br />
          THE SURFACE.
        </h2>
        <p className="dc-section-desc">
          Interactive multi-layer dental inspection. Experience how high-precision 3D diagnostic mapping reveals subtle structural details before any procedure begins.
        </p>
      </div>

      <div className="dc-anatomy-container">
        {/* Left Side: 3D Hologram Inspection Canvas */}
        <div className="dc-anatomy-canvas-wrap">
          <ToothCanvas3D mode="interactive" activeLayer={activeLayer} interactive={true} />

          {/* Quick HUD overlay in container corner */}
          <div className="absolute bottom-3 left-3 bg-[#05070b]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>INTERACTIVE ANATOMY MODE</span>
          </div>
        </div>

        {/* Right Side: Interactive Controls & Anatomical Callouts */}
        <div className="dc-anatomy-controls">
          <div>
            <span className="text-xs font-mono text-white/50 tracking-widest uppercase mb-2 block">
              SELECT ANATOMICAL STRATA:
            </span>
            <div className="dc-layer-btn-group">
              <button
                type="button"
                className={`dc-layer-btn ${activeLayer === 'all' ? 'active' : ''}`}
                onClick={() => setActiveLayer('all')}
              >
                All Layers (Composite)
              </button>
              {layers.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  className={`dc-layer-btn ${activeLayer === layer.id ? 'active' : ''}`}
                  onClick={() => setActiveLayer(layer.id)}
                >
                  {layer.title}
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Technical Callout Cards with Cyan Connection Lines */}
          <div className="dc-anatomy-callouts">
            {layers.map((layer) => {
              const isSelected = activeLayer === layer.id || activeLayer === 'all';
              return (
                <div
                  key={layer.id}
                  className={`dc-callout-card ${isSelected ? 'active' : 'opacity-40'} cursor-pointer`}
                  onClick={() => setActiveLayer(layer.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveLayer(layer.id);
                    }
                  }}
                  aria-label={`View details for ${layer.title}`}
                >
                  <div className="dc-callout-header">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <h3 className="dc-callout-title">{layer.title}</h3>
                    </div>
                    <span className="dc-callout-tag">{layer.tag}</span>
                  </div>
                  <p className="dc-callout-desc">{layer.desc}</p>
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-cyan-300/80">
                    <span>PARAM: {layer.metric}</span>
                    <span className="text-pink-400">RESOLVED</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
