import React, { useState, useRef } from 'react';
import { Sparkles, MoveHorizontal, Compass, AlertCircle } from 'lucide-react';

export default function SmileTransformationSection() {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPos(percentage);
  };

  const onMouseDown = () => { isDraggingRef.current = true; };
  const onMouseUp = () => { isDraggingRef.current = false; };
  const onMouseMove = (e) => {
    if (isDraggingRef.current) {
      handleMove(e.clientX);
    }
  };

  const onTouchMove = (e) => {
    if (e.touches && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  return (
    <section id="transformations" className="dc-section" aria-label="Smile Transformation Gallery">
      <div className="dc-section-header">
        <span className="dc-section-tag">AESTHETIC RESTORATION</span>
        <h2 className="dc-section-title">
          DESIGNED FOR<br />
          REAL SMILES.
        </h2>
        <p className="dc-section-desc">
          Compare diagnostic alignment and aesthetic contouring. Drag the interactive comparison divider to inspect shade, balance, and restorative harmony.
        </p>
      </div>

      {/* Interactive Drag Comparison Slider */}
      <div
        ref={containerRef}
        className="dc-slider-container"
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        role="region"
        aria-label="Interactive Before and After Smile Transformation Slider"
      >
        {/* AFTER View (Background Full Image) */}
        <div
          className="dc-slider-image flex items-center justify-center bg-gradient-to-tr from-[#0b1018] via-[#07131e] to-[#0d2232]"
        >
          <div className="text-center p-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-xs mb-3 border border-cyan-500/40">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DIGITAL SMILE SIMULATION • COMPLETED</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Refined Contour & Enamel Shade</h3>
            <p className="text-sm text-cyan-200/70 max-w-md mx-auto">
              Custom ceramic veneer restorations with balanced translucency and anatomical cusp morphology.
            </p>
          </div>
          <span className="dc-slider-tag right-6 text-cyan-400 border-cyan-500/30">
            AFTER TREATMENT
          </span>
        </div>

        {/* BEFORE View (Clipped Overlay Image) */}
        <div
          className="dc-slider-overlay bg-gradient-to-tr from-[#05070b] via-[#10141d] to-[#151922] flex items-center justify-center"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="text-center p-8 min-w-[320px]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 font-mono text-xs mb-3 border border-pink-500/40">
              <span>PRE-OP DIAGNOSTIC ASSESSMENT</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Initial Asymmetry & Wear</h3>
            <p className="text-sm text-white/50 max-w-md mx-auto">
              Mild incisal chipping, color variation, and midline slight rotation prior to corrective therapy.
            </p>
          </div>
          <span className="dc-slider-tag left-6 text-pink-400 border-pink-500/30">
            BEFORE TREATMENT
          </span>
        </div>

        {/* Draggable Divider Handle */}
        <div
          className="dc-slider-handle"
          style={{ left: `${sliderPos}%` }}
          aria-valuenow={Math.round(sliderPos)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setSliderPos((p) => Math.max(0, p - 5));
            if (e.key === 'ArrowRight') setSliderPos((p) => Math.min(100, p + 5));
          }}
        >
          <div className="dc-slider-btn">
            <MoveHorizontal className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer & CTA */}
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <p className="text-xs text-[#aab4c3] flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>
            Every smile is different. Treatment recommendations depend on individual clinical assessment.
          </span>
        </p>

        <div>
          <a href="#booking" className="dc-btn-primary !px-8 !py-3">
            <Compass className="w-4 h-4 mr-2" />
            Explore Smile Treatments
          </a>
        </div>
      </div>
    </section>
  );
}
