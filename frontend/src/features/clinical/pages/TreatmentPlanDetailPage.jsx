import React from 'react';
import { Link, useParams } from 'react-router-dom';
import '../clinical.css';

export default function TreatmentPlanDetailPage() {
  const { id } = useParams();

  return (
    <div className="clinical-container">
      <nav className="clinical-nav" aria-label="Breadcrumb">
        <Link to="/clinical/treatment-plans">← Back to Treatment Plans</Link>
      </nav>

      <div className="clinical-header">
        <h1>Treatment Plan #{id}</h1>
      </div>

      <div className="clinical-placeholder" data-testid="treatment-plan-detail-placeholder">
        <p>Treatment plan detail, procedure manager, and status transitions will be implemented in Step 4D-3.</p>
      </div>
    </div>
  );
}
