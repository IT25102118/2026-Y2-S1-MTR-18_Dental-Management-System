import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function ClinicalNav() {
  const location = useLocation();
  const path = location.pathname;

  const isOverview = path === '/clinical' || path === '/clinical/';
  const isExaminations = path.startsWith('/clinical/examinations');
  const isTreatmentPlans = path.startsWith('/clinical/treatment-plans');

  return (
    <nav className="clinical-module-nav" aria-label="Clinical module navigation">
      <Link
        to="/clinical"
        className={`clin-nav-link ${isOverview ? 'active' : ''}`}
        aria-current={isOverview ? 'page' : undefined}
      >
        Overview
      </Link>
      <Link
        to="/clinical/examinations"
        className={`clin-nav-link ${isExaminations ? 'active' : ''}`}
        aria-current={isExaminations ? 'page' : undefined}
      >
        Examinations
      </Link>
      <Link
        to="/clinical/treatment-plans"
        className={`clin-nav-link ${isTreatmentPlans ? 'active' : ''}`}
        aria-current={isTreatmentPlans ? 'page' : undefined}
      >
        Treatment Plans
      </Link>
    </nav>
  );
}
