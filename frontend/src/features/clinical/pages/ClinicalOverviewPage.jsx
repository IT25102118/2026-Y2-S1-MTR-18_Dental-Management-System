import React from 'react';
import { Link } from 'react-router-dom';
import ClinicalNav from '../components/ClinicalNav';
import '../clinical.css';

export default function ClinicalOverviewPage() {
  return (
    <div className="clinical-container">
      <nav className="clinical-nav" aria-label="Breadcrumb">
        <Link to="/">← Back to Home</Link>
      </nav>

      <div className="clinical-header">
        <div>
          <h1>Clinical Management</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
            Clinical examinations, tooth condition findings, and dental treatment plans.
          </p>
        </div>
      </div>

      <ClinicalNav />

      <div className="clinical-overview-placeholder" data-testid="clinical-overview-placeholder">
        <p>Clinical overview dashboard will be implemented in Step 4D-2.</p>
      </div>
    </div>
  );
}
