import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  ClipboardList,
  Activity,
  FileText,
  Search,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Users
} from 'lucide-react';
import ClinicalNav from '../components/ClinicalNav';
import { useAuth } from '../../auth/context/AuthContext';
import { getPatients } from '../../patient/api/patientApi';
import '../clinical.css';

export default function ClinicalOverviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patientIdInput, setPatientIdInput] = useState('');
  const [recentPatients, setRecentPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadPatients() {
      setPatientsLoading(true);
      try {
        const response = await getPatients({ page: 0, size: 6 });
        if (isMounted && response?.content) {
          setRecentPatients(response.content);
        }
      } catch {
        // Fallback gracefully without breaking page render
      } finally {
        if (isMounted) {
          setPatientsLoading(false);
        }
      }
    }
    loadPatients();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLookupExaminations = (e) => {
    e.preventDefault();
    const trimmed = patientIdInput.trim();
    if (trimmed) {
      navigate(`/clinical/examinations?patientId=${trimmed}`);
    } else {
      navigate('/clinical/examinations');
    }
  };

  const handleLookupTreatmentPlans = () => {
    const trimmed = patientIdInput.trim();
    if (trimmed) {
      navigate(`/clinical/treatment-plans?patientId=${trimmed}`);
    } else {
      navigate('/clinical/treatment-plans');
    }
  };

  const isDentist = user?.role === 'DENTIST';

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
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link to="/clinical/examinations" className="btn btn-primary">
            <Stethoscope size={16} aria-hidden="true" style={{ marginRight: '0.35rem' }} />
            Examinations
          </Link>
          <Link to="/clinical/treatment-plans" className="btn btn-secondary">
            <ClipboardList size={16} aria-hidden="true" style={{ marginRight: '0.35rem' }} />
            Treatment Plans
          </Link>
        </div>
      </div>

      <ClinicalNav />

      {/* Main Clinical Dashboard Content retaining test ID for backward compatibility */}
      <div className="clinical-overview-placeholder" data-testid="clinical-overview-placeholder">
        {/* Patient Clinical Quick Lookup Banner */}
        <section className="clinical-overview-search-card" aria-labelledby="clinical-search-title">
          <div className="clinical-search-header">
            <Search size={20} color="#2563eb" aria-hidden="true" />
            <div>
              <h3 id="clinical-search-title">Quick Patient Clinical Lookup</h3>
              <p>Enter a Patient ID to immediately inspect examination records or manage treatment plans.</p>
            </div>
          </div>

          <form onSubmit={handleLookupExaminations} className="clinical-quick-lookup-form">
            <div className="clinical-lookup-input-group">
              <Search size={16} aria-hidden="true" />
              <input
                id="patient-clinical-id"
                type="number"
                min="1"
                step="1"
                placeholder="Enter Patient ID (e.g. 1, 6, 13)..."
                value={patientIdInput}
                onChange={(e) => setPatientIdInput(e.target.value)}
                aria-label="Patient ID"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              View Examinations →
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLookupTreatmentPlans}
            >
              View Treatment Plans →
            </button>
          </form>

          {/* Quick-Select Recent Patients */}
          {recentPatients.length > 0 && (
            <div className="clinical-quick-patients">
              <span style={{ fontWeight: 600 }}>Quick Select Patient:</span>
              {recentPatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`patient-pill-btn ${String(patientIdInput) === String(p.id) ? 'active' : ''}`}
                  onClick={() => setPatientIdInput(String(p.id))}
                  title={`${p.firstName} ${p.lastName} (${p.patientCode})`}
                >
                  #{p.id} {p.firstName} {p.lastName}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Clinical Capabilities & KPI Grid */}
        <div className="clinical-kpi-grid">
          {/* Card 1: Clinical Examinations */}
          <div className="clinical-kpi-card" data-testid="clinical-card-examinations">
            <div>
              <div className="clinical-kpi-header">
                <div className="clinical-kpi-title-wrap">
                  <span className="clinical-kpi-icon exam" aria-hidden="true">
                    <Stethoscope size={18} />
                  </span>
                  <h3>Examinations</h3>
                </div>
                <span className="clinical-kpi-badge">Diagnostic</span>
              </div>
              <p className="clinical-kpi-desc">
                Record chief complaints, oral observations, hard/soft tissue findings, and dentist-confirmed diagnoses.
              </p>
            </div>
            <div className="clinical-kpi-actions">
              <Link to="/clinical/examinations" className="btn btn-primary btn-sm">
                Browse Examinations →
              </Link>
              {isDentist && (
                <Link to="/clinical/examinations" className="btn btn-secondary btn-sm">
                  + Record Exam
                </Link>
              )}
            </div>
          </div>

          {/* Card 2: Treatment Plans */}
          <div className="clinical-kpi-card" data-testid="clinical-card-treatment-plans">
            <div>
              <div className="clinical-kpi-header">
                <div className="clinical-kpi-title-wrap">
                  <span className="clinical-kpi-icon plans" aria-hidden="true">
                    <ClipboardList size={18} />
                  </span>
                  <h3>Treatment Plans</h3>
                </div>
                <span className="clinical-kpi-badge">Care Pathways</span>
              </div>
              <p className="clinical-kpi-desc">
                Propose and approve staged dental treatments, track operative procedures, and manage completion progress.
              </p>
            </div>
            <div className="clinical-kpi-actions">
              <Link to="/clinical/treatment-plans" className="btn btn-primary btn-sm">
                Manage Plans →
              </Link>
              {isDentist && (
                <Link to="/clinical/treatment-plans" className="btn btn-secondary btn-sm">
                  + Propose Plan
                </Link>
              )}
            </div>
          </div>

          {/* Card 3: Tooth Charting */}
          <div className="clinical-kpi-card" data-testid="clinical-card-tooth-charting">
            <div>
              <div className="clinical-kpi-header">
                <div className="clinical-kpi-title-wrap">
                  <span className="clinical-kpi-icon charting" aria-hidden="true">
                    <Activity size={18} />
                  </span>
                  <h3>FDI Tooth Charting</h3>
                </div>
                <span className="clinical-kpi-badge">ISO 3950</span>
              </div>
              <p className="clinical-kpi-desc">
                Universal 2-digit FDI dental notation (quadrants 1–4, teeth 11–48) for dental findings and conditions.
              </p>
            </div>
            <div className="clinical-kpi-actions">
              <Link to="/clinical/examinations" className="btn btn-primary btn-sm">
                Open In Examinations →
              </Link>
            </div>
          </div>

          {/* Card 4: Prescription Integration */}
          <div className="clinical-kpi-card" data-testid="clinical-card-prescriptions">
            <div>
              <div className="clinical-kpi-header">
                <div className="clinical-kpi-title-wrap">
                  <span className="clinical-kpi-icon rx" aria-hidden="true">
                    <FileText size={18} />
                  </span>
                  <h3>Prescriptions</h3>
                </div>
                <span className="clinical-kpi-badge">Medications</span>
              </div>
              <p className="clinical-kpi-desc">
                Integrated prescription management for dental medications, dosage posology, and allergy safety alerts.
              </p>
            </div>
            <div className="clinical-kpi-actions">
              <Link to="/prescriptions" className="btn btn-primary btn-sm">
                Open Prescriptions →
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Operational Navigation */}
        <section className="clinical-quick-nav-section" aria-labelledby="quick-nav-title">
          <h2 id="quick-nav-title" className="clinical-section-title">
            Quick Operational Navigation
          </h2>
          <div className="clinical-quick-nav-grid">
            <Link to="/clinical/examinations" className="clinical-quick-nav-card">
              <div className="clinical-quick-nav-icon" aria-hidden="true">
                <Stethoscope size={20} />
              </div>
              <div className="clinical-quick-nav-body">
                <span className="clinical-quick-nav-title">Clinical Examinations</span>
                <span className="clinical-quick-nav-desc">Create or review patient examination records and diagnosis.</span>
              </div>
              <ArrowRight size={16} className="clinical-quick-nav-arrow" aria-hidden="true" />
            </Link>

            <Link to="/clinical/treatment-plans" className="clinical-quick-nav-card">
              <div className="clinical-quick-nav-icon" aria-hidden="true" style={{ backgroundColor: '#f0fdfa', color: '#0d9488' }}>
                <ClipboardList size={20} />
              </div>
              <div className="clinical-quick-nav-body">
                <span className="clinical-quick-nav-title">Treatment Plans & Procedures</span>
                <span className="clinical-quick-nav-desc">Manage proposed dental care plans and execution stages.</span>
              </div>
              <ArrowRight size={16} className="clinical-quick-nav-arrow" aria-hidden="true" />
            </Link>

            <Link to="/prescriptions" className="clinical-quick-nav-card">
              <div className="clinical-quick-nav-icon" aria-hidden="true" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                <FileText size={20} />
              </div>
              <div className="clinical-quick-nav-body">
                <span className="clinical-quick-nav-title">Dental Prescriptions</span>
                <span className="clinical-quick-nav-desc">Issue, review, and finalize patient dental medication orders.</span>
              </div>
              <ArrowRight size={16} className="clinical-quick-nav-arrow" aria-hidden="true" />
            </Link>

            <Link to="/patients" className="clinical-quick-nav-card">
              <div className="clinical-quick-nav-icon" aria-hidden="true" style={{ backgroundColor: '#f1f5f9', color: '#334155' }}>
                <Users size={20} />
              </div>
              <div className="clinical-quick-nav-body">
                <span className="clinical-quick-nav-title">Patient Directory</span>
                <span className="clinical-quick-nav-desc">Search full demographic files, medical histories, and allergies.</span>
              </div>
              <ArrowRight size={16} className="clinical-quick-nav-arrow" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Clinical Governance & Quality Assurance */}
        <section className="clinical-governance-section" aria-labelledby="clinical-governance-title">
          <div className="clinical-governance-card">
            <h2 id="clinical-governance-title" className="clinical-section-title" style={{ marginTop: 0 }}>
              Clinical Standards & Governance
            </h2>
            <div className="clinical-governance-grid">
              <div className="clinical-governance-item">
                <div className="clinical-gov-icon-wrap" aria-hidden="true">
                  <ShieldCheck size={20} />
                </div>
                <div className="clinical-gov-body">
                  <strong>Dentist Diagnostic Authority</strong>
                  <p>
                    Examinations may be drafted by dental assistants, but legal diagnosis confirmation and plan approval require verified Dentist credentials.
                  </p>
                </div>
              </div>

              <div className="clinical-governance-item">
                <div className="clinical-gov-icon-wrap" aria-hidden="true">
                  <Activity size={20} />
                </div>
                <div className="clinical-gov-body">
                  <strong>FDI Two-Digit Standard (ISO 3950)</strong>
                  <p>
                    All tooth-specific condition findings strictly enforce FDI numbering (teeth 11–48) to avoid tooth identification ambiguities across clinical staff.
                  </p>
                </div>
              </div>

              <div className="clinical-governance-item">
                <div className="clinical-gov-icon-wrap" aria-hidden="true">
                  <CheckCircle2 size={20} />
                </div>
                <div className="clinical-gov-body">
                  <strong>Audit-Safe Record Retention</strong>
                  <p>
                    Confirmed examinations and completed treatment plans are permanently archived to maintain medico-legal compliance and complete patient care history.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
