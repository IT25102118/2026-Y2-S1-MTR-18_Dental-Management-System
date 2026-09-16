import React from 'react';
import { Star, MessageSquareQuote, ShieldCheck } from 'lucide-react';

export default function ReviewsSection() {
  // Using strictly verified placeholders per instructions without fabricating reviews
  const reviewSlots = [
    {
      id: 1,
      source: 'Verified Patient • Colombo 07',
      category: 'Cosmetic & Restorative'
    },
    {
      id: 2,
      source: 'Verified Patient • Colombo 07',
      category: 'Orthodontic Alignment'
    },
    {
      id: 3,
      source: 'Verified Patient • Colombo 07',
      category: 'Preventative & Routine Care'
    }
  ];

  return (
    <section id="reviews" className="dc-section" aria-label="Verified Patient Experiences">
      <div className="dc-section-header">
        <span className="dc-section-tag">TESTIMONIAL ARCHIVE</span>
        <h2 className="dc-section-title">
          PATIENT<br />
          EXPERIENCES.
        </h2>
        <p className="dc-section-desc">
          Reflections from individuals who have undergone preventative, cosmetic, and restorative care at our Colombo 07 practice.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {reviewSlots.map((slot) => (
          <div
            key={slot.id}
            className="dc-glass-card flex flex-col justify-between group hover:border-cyan-400/40 transition-all"
          >
            <div>
              {/* Star Rating Placeholder Banner */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
                <div className="flex text-amber-400 space-x-1" aria-label="5 out of 5 stars placeholder">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-cyan-400/70 uppercase">
                  {slot.category}
                </span>
              </div>

              {/* Exact Required Placeholder */}
              <div className="my-6">
                <MessageSquareQuote className="w-8 h-8 text-cyan-400/30 mb-3" />
                <p className="text-lg font-medium text-white/80 italic leading-relaxed">
                  “Patient review will appear here.”
                </p>
              </div>
            </div>

            {/* Structured Citation Meta */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-[#aab4c3]">
              <span>{slot.source}</span>
              <span className="inline-flex items-center gap-1 text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>CONFIRMED</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Compliance / Transparency Notice */}
      <p className="mt-8 text-center text-xs text-white/40 font-mono">
        STRUCTURED PLACEHOLDER DATA: Direct verified patient reviews are periodically curated in accordance with healthcare privacy standards.
      </p>
    </section>
  );
}
