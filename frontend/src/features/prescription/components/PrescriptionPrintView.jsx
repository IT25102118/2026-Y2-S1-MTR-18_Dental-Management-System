import React from 'react';

/**
 * Print-ready layout for a finalized dental prescription.
 * Follows formal prescription document format (clinic header, Rx symbol, signature area).
 */
export default function PrescriptionPrintView({ prescription }) {
  if (!prescription) return null;

  return (
    <div className="print-only-header" style={{ marginBottom: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>DentCare Dental Practice</h1>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#475569' }}>
          Official Clinical Prescription &bull; Registration & Records Department
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
        <div>
          <strong>Patient:</strong> {prescription.patientName || `Patient #${prescription.patientId}`}<br />
          <strong>Patient ID:</strong> {prescription.patientId}
        </div>
        <div style={{ textAlign: 'right' }}>
          <strong>Prescription ID:</strong> #{prescription.id}<br />
          <strong>Date Finalized:</strong> {prescription.finalizedAt ? new Date(prescription.finalizedAt).toLocaleDateString() : 'N/A'}<br />
          <strong>Prescribing Dentist:</strong> {prescription.dentistName || `Dentist #${prescription.dentistId}`}
        </div>
      </div>

      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'serif', marginBottom: '0.75rem' }}>
        &#8478;
      </div>
    </div>
  );
}
