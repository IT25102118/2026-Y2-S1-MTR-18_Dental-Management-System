/**
 * Clinic location and contact configuration.
 */

export const clinicContactConfig = {
  isDemo: false,
  name: 'DentCare Dental Clinic',
  location: '128 Galle Road, Colombo 03, Sri Lanka',
  phone: '+94 11 258 7410',
  email: 'contact@dentcare.lk',
  hours: [
    { days: 'Monday–Friday', hours: '8:30 AM–6:00 PM' },
    { days: 'Saturday', hours: '9:00 AM–1:00 PM' }
  ],
  hoursNote: 'Official consultation & clinic hours',
  demoBadge: '',
  mapCaption: 'DentCare Dental Clinic · 128 Galle Road, Colombo 03',
  mapDisclaimerBadge: '',
  mapAriaLabel: 'DentCare Dental Clinic Location Map · Colombo 03, Sri Lanka',
  sectionEyebrow: 'CLINIC LOCATION & CONTACT',
  sectionTitle: 'Visit & Contact DentCare',
  sectionDescription: 'Explore our clinic location, contact information, and appointment booking experience.',
  bookingPath: '/patient/appointments',
  bookingLabel: 'Book an Appointment'
};

export default clinicContactConfig;
