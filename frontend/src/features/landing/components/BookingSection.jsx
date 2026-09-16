import React, { useState } from 'react';
import { Calendar, Clock, User, Phone, Mail, FileText, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

export default function BookingSection() {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    treatment: '',
    preferredDate: '',
    preferredTime: '',
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const treatments = [
    'General Dentistry & Checkup',
    'Cosmetic Dentistry',
    'Teeth Whitening',
    'Dental Implants',
    'Porcelain Veneers',
    'Clear Aligners',
    'Root Canal Treatment',
    'Emergency Dental Care',
    "Children's Dentistry",
    'Full Smile Makeover'
  ];

  const timeSlots = [
    'Morning (09:00 – 12:00)',
    'Early Afternoon (12:00 – 15:00)',
    'Late Afternoon (15:00 – 17:30)',
    'Evening (17:30 – 19:30)'
  ];

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required';
    if (!formData.phone.trim()) {
      errs.phone = 'Phone Number is required';
    } else if (!/^[0-9+\s-]{8,15}$/.test(formData.phone.trim())) {
      errs.phone = 'Please enter a valid phone number';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address';
    }
    if (!formData.treatment) errs.treatment = 'Please select a treatment of interest';
    if (!formData.preferredDate) errs.preferredDate = 'Please select a preferred date';
    if (!formData.preferredTime) errs.preferredTime = 'Please select a preferred time slot';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate prompt API transmission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 650);
  };

  return (
    <section id="booking" className="dc-section" aria-label="Appointment Booking Form">
      <div className="dc-section-header">
        <span className="dc-section-tag">RESERVE A CONSULTATION</span>
        <h2 className="dc-section-title">
          YOUR NEXT SMILE<br />
          STARTS HERE.
        </h2>
        <p className="dc-section-desc">
          Schedule an in-depth clinical consultation with our dental practitioners in Colombo 07. We prioritize thorough diagnostics and clear communication.
        </p>
      </div>

      <div className="dc-booking-wrap">
        {/* Left Info Panel */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-xs mb-6 border border-cyan-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>COLOMBO 07 CONCIERGE CARE</span>
            </div>

            <h3 className="text-3xl font-black text-white mb-4 tracking-tight">
              Personalised Clinical Care
            </h3>
            <p className="text-sm text-[#aab4c3] leading-relaxed mb-6">
              During your appointment, our practitioners perform optical scanning, discuss your individual concerns, and engineer a clear roadmap tailored to your comfort and aesthetic goals.
            </p>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-start gap-3 text-xs text-[#aab4c3]">
                <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <span>Transparent explanation of all diagnostics and imaging</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#aab4c3]">
                <div className="w-2 h-2 rounded-full bg-pink-400 mt-1.5 flex-shrink-0" />
                <span>Dedicated appointment blocks ensuring zero rushed procedures</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#aab4c3]">
                <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                <span>Strict infection control and hospital-grade sterilization protocols</span>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-xl bg-white/[0.02] border border-white/5 font-mono text-xs text-white/50">
            DIRECT PRACTICE DESK: +94 11 200 0000
          </div>
        </div>

        {/* Right Form Panel */}
        <div>
          {isSubmitted ? (
            <div className="p-8 rounded-2xl bg-cyan-950/20 border border-cyan-400/40 text-center space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-cyan-400/20 text-cyan-300 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white">Consultation Request Received</h3>
              <p className="text-sm text-cyan-100/80 max-w-md mx-auto leading-relaxed">
                Thank you for contacting DentCare. Our team will contact you to confirm your appointment.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  className="dc-btn-secondary !text-xs !py-2 !px-4"
                  onClick={() => {
                    setIsSubmitted(false);
                    setFormData({
                      fullName: '',
                      phone: '',
                      email: '',
                      treatment: '',
                      preferredDate: '',
                      preferredTime: '',
                      message: ''
                    });
                  }}
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="dc-form-group">
                  <label htmlFor="fullName" className="dc-form-label">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    className={`dc-form-input ${errors.fullName ? 'error' : ''}`}
                    placeholder="e.g. Anuki Perera"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                  {errors.fullName && <p className="dc-form-error">{errors.fullName}</p>}
                </div>

                {/* Phone Number */}
                <div className="dc-form-group">
                  <label htmlFor="phone" className="dc-form-label">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className={`dc-form-input ${errors.phone ? 'error' : ''}`}
                    placeholder="+94 77 123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                  {errors.phone && <p className="dc-form-error">{errors.phone}</p>}
                </div>
              </div>

              {/* Email Address */}
              <div className="dc-form-group">
                <label htmlFor="email" className="dc-form-label">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  className={`dc-form-input ${errors.email ? 'error' : ''}`}
                  placeholder="patient@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                {errors.email && <p className="dc-form-error">{errors.email}</p>}
              </div>

              {/* Treatment Selection */}
              <div className="dc-form-group">
                <label htmlFor="treatment" className="dc-form-label">
                  Treatment Interested In *
                </label>
                <select
                  id="treatment"
                  className={`dc-form-select ${errors.treatment ? 'error' : ''}`}
                  value={formData.treatment}
                  onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                >
                  <option value="">Select a treatment category...</option>
                  {treatments.map((t) => (
                    <option key={t} value={t} className="bg-[#05070b]">
                      {t}
                    </option>
                  ))}
                </select>
                {errors.treatment && <p className="dc-form-error">{errors.treatment}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preferred Date */}
                <div className="dc-form-group">
                  <label htmlFor="preferredDate" className="dc-form-label">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    id="preferredDate"
                    className={`dc-form-input ${errors.preferredDate ? 'error' : ''}`}
                    value={formData.preferredDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                  />
                  {errors.preferredDate && <p className="dc-form-error">{errors.preferredDate}</p>}
                </div>

                {/* Preferred Time Slot */}
                <div className="dc-form-group">
                  <label htmlFor="preferredTime" className="dc-form-label">
                    Preferred Time *
                  </label>
                  <select
                    id="preferredTime"
                    className={`dc-form-select ${errors.preferredTime ? 'error' : ''}`}
                    value={formData.preferredTime}
                    onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  >
                    <option value="">Select preferred time...</option>
                    {timeSlots.map((ts) => (
                      <option key={ts} value={ts} className="bg-[#05070b]">
                        {ts}
                      </option>
                    ))}
                  </select>
                  {errors.preferredTime && <p className="dc-form-error">{errors.preferredTime}</p>}
                </div>
              </div>

              {/* Message */}
              <div className="dc-form-group">
                <label htmlFor="message" className="dc-form-label">
                  Message (Optional)
                </label>
                <textarea
                  id="message"
                  rows={3}
                  className="dc-form-textarea"
                  placeholder="Describe your concerns, previous history, or questions for our clinical team..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="dc-btn-primary w-full !py-3.5 !mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span>Transmitting Request...</span>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Request Appointment</span>
                  </>
                )}
              </button>

              {/* Explicit non-automatic disclosure */}
              <p className="mt-3 text-[11px] text-center text-white/40 font-mono">
                Appointments are confirmed personally by telephone or WhatsApp after review by clinical staff.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
