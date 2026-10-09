/**
 * Demonstration clinic location and contact configuration.
 *
 * NOTE: These values are fictional demonstration placeholders for the DentCare
 * academic project. They do NOT represent an active clinic address, active
 * telephone line, or real email inbox.
 */

export const clinicContactConfig = {
  isDemo: true,
  name: 'DentCare Demonstration Clinic',
  location: 'Colombo, Sri Lanka',
  phone: '+94 XX XXX XXXX',
  email: 'contact@dentcare.example',
  hours: [
    { days: 'Monday–Friday', hours: '8:30 AM–6:00 PM' },
    { days: 'Saturday', hours: '9:00 AM–1:00 PM' }
  ],
  hoursNote: 'Example opening hours — for demonstration only',
  demoBadge: 'DEMO LOCATION',
  mapCaption: 'Illustrative map · Colombo, Sri Lanka',
  mapDisclaimerBadge: 'DEMO LOCATION — NOT A REAL CLINIC ADDRESS',
  mapAriaLabel: 'Illustrative map · Colombo, Sri Lanka. Fictional demonstration clinic location, not a real navigation map.',
  sectionEyebrow: 'CLINIC LOCATION & CONTACT',
  sectionTitle: 'Visit & Contact DentCare',
  sectionDescription: 'Explore our demonstration clinic location, contact information, and appointment booking experience.',
  bookingPath: '/patient/appointments',
  bookingLabel: 'Book an Appointment'
};

export default clinicContactConfig;
