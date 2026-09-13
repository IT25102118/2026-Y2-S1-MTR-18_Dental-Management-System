import React from 'react';
import { Link, useParams } from 'react-router-dom';
import '../clinical.css';

export default function ExaminationDetailPage() {
  const { id } = useParams();

  return (
    <div className="clinical-container">
      <nav className="clinical-nav" aria-label="Breadcrumb">
        <Link to="/clinical/examinations">← Back to Examinations</Link>
      </nav>

      <div className="clinical-header">
        <h1>Examination #{id}</h1>
      </div>

      <div className="clinical-placeholder" data-testid="examination-detail-placeholder">
        <p>Examination detail and tooth findings editor will be implemented in Step 4D-2.</p>
      </div>
    </div>
  );
}
