import React from 'react';
import { Link } from 'react-router-dom';
import ClinicalNav from '../components/ClinicalNav';
import '../clinical.css';

export default function TreatmentPlansPage() {
  return (
    <div className="clinical-container">
      <nav className="clinical-nav" aria-label="Breadcrumb">
        <Link to="/">← Back to Home</Link>
      </nav>

      <div className="clinical-header">
        <h1>Treatment Plans</h1>
      </div>

      <ClinicalNav />

      <div className="clinical-placeholder" data-testid="treatment-plans-page-placeholder">
        <p>Treatment plans list will be implemented in Step 4D-3.</p>
      </div>
    </div>
  );
}
