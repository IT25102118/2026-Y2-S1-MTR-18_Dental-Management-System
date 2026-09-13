import React from 'react';
import { Link } from 'react-router-dom';
import ClinicalNav from '../components/ClinicalNav';
import '../clinical.css';

export default function ExaminationsPage() {
  return (
    <div className="clinical-container">
      <nav className="clinical-nav" aria-label="Breadcrumb">
        <Link to="/">← Back to Home</Link>
      </nav>

      <div className="clinical-header">
        <h1>Clinical Examinations</h1>
      </div>

      <ClinicalNav />

      <div className="clinical-placeholder" data-testid="examinations-page-placeholder">
        <p>Clinical examinations list will be implemented in Step 4D-2.</p>
      </div>
    </div>
  );
}
