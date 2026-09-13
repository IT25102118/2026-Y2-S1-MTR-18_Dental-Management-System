import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Top navigation sub-bar for Prescription Management.
 */
export default function PrescriptionNav() {
  const location = useLocation();

  const isList = location.pathname === '/prescriptions';
  const isNew = location.pathname === '/prescriptions/new';

  return (
    <nav className="prescription-nav" aria-label="Prescription navigation" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link to="/" style={{ fontSize: '0.875rem' }}>
          ← Back to Home
        </Link>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <Link
          to="/prescriptions"
          style={{
            fontWeight: isList ? 600 : 400,
            color: isList ? '#0f172a' : '#2563eb',
            textDecoration: isList ? 'none' : 'underline'
          }}
        >
          All Prescriptions
        </Link>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <Link
          to="/prescriptions/new"
          style={{
            fontWeight: isNew ? 600 : 400,
            color: isNew ? '#0f172a' : '#2563eb',
            textDecoration: isNew ? 'none' : 'underline'
          }}
        >
          + New Prescription
        </Link>
      </div>
    </nav>
  );
}
