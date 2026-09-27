import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BILLING_ROLES } from '../roleAccess';
import '../entry.css';
import '../staff-dashboard.css';

const operationalModules = [
  {
    id: 'inventory',
    title: 'Inventory Management',
    description: 'Track clinical supplies, batch expirations, stock movements, and real-time replenishment alerts.',
    to: '/inventory',
    roles: ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'],
    category: 'Supplies',
    quickLinks: [
      { label: 'Catalog', to: '/inventory/items' },
      { label: 'Batches', to: '/inventory/batches' },
      { label: 'Alerts', to: '/inventory/alerts' }
    ]
  },
  {
    id: 'clinical',
    title: 'Clinical Management',
    description: 'Conduct comprehensive dental examinations, odontogram tooth findings, and active treatment plan workflows.',
    to: '/clinical',
    roles: ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'],
    category: 'Clinical',
    quickLinks: [
      { label: 'Examinations', to: '/clinical/examinations' },
      { label: 'Treatment Plans', to: '/clinical/treatment-plans' }
    ]
  },
  {
    id: 'prescriptions',
    title: 'Prescription Management',
    description: 'Authorize patient medications, track active dispensations, and maintain digital pharmacy records.',
    to: '/prescriptions',
    roles: ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'],
    category: 'Pharmacy',
    quickLinks: [
      { label: 'Prescriptions List', to: '/prescriptions' }
    ]
  },
  {
    id: 'billing',
    title: 'Invoices & Billing',
    description: 'Generate itemized patient invoices, process payments, and record clinic accounts receivable.',
    to: '/billing/invoices',
    roles: BILLING_ROLES,
    category: 'Billing',
    quickLinks: [
      { label: 'All Invoices', to: '/billing/invoices' },
      { label: 'New Invoice', to: '/billing/invoices/new' }
    ]
  },
  {
    id: 'reports',
    title: 'Income Reports',
    description: 'Audit daily cash settlements, monthly revenue trends, and financial reconciliation reports.',
    to: '/billing/reports',
    roles: BILLING_ROLES,
    category: 'Reports',
    quickLinks: [
      { label: 'Daily Summary', to: '/billing/reports' },
      { label: 'Monthly Summary', to: '/billing/reports' }
    ]
  },
  {
    id: 'staff-admin',
    title: 'Staff Management',
    description: 'Administer provider accounts, assign role permissions, and maintain clinic personnel credentials.',
    to: '/admin/staff',
    roles: ['ADMINISTRATOR'],
    category: 'Administration',
    quickLinks: [
      { label: 'Staff Accounts', to: '/admin/staff' }
    ]
  }
];

function ModuleIcon({ type }) {
  switch (type) {
    case 'inventory':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <polyline points="3.29 7 12 12 20.71 7" />
          <line x1="12" y1="22" x2="12" y2="12" />
          <path d="m7.5 4.5 9 5" />
          <path d="M6.5 15.5h3.5" />
          <path d="M8.25 13.75v3.5" />
          <path d="M14.5 14.5h3.5" />
          <path d="M14.5 17h2" />
        </svg>
      );
    case 'clinical':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    case 'prescriptions':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.5 20.5 20 11a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      );
    case 'billing':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case 'reports':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'staff-admin':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return null;
  }
}

function getRoleBadgeClass(role) {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'role-admin';
    case 'DENTIST':
      return 'role-dentist';
    case 'RECEPTIONIST':
      return 'role-receptionist';
    case 'DENTAL_ASSISTANT':
      return 'role-assistant';
    default:
      return 'role-default';
  }
}

function getRoleGuidance(role) {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'Full administrative oversight across staff authorization, inventory supply chains, clinical operations, and financial records.';
    case 'DENTIST':
      return 'Comprehensive dental workspace: diagnostic examinations, interactive tooth charting, treatment planning, and pharmaceutical prescriptions.';
    case 'RECEPTIONIST':
      return 'Front-desk operations console: patient invoicing, payment collections, daily reconciliation reports, and delivery tracking.';
    case 'DENTAL_ASSISTANT':
      return 'Operatory care operations: dental batch verification, chairside supply replenishment, and stock movement logs.';
    default:
      return 'Access operational tools and clinical records assigned to your staff credential.';
  }
}

function getRoleDisplay(role) {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'Administrator';
    case 'DENTIST':
      return 'Dentist';
    case 'RECEPTIONIST':
      return 'Receptionist';
    case 'DENTAL_ASSISTANT':
      return 'Dental Assistant';
    default:
      return role || 'Staff Member';
  }
}

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Quick keyboard shortcut '/' to jump to command search
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentDateStr = useMemo(() => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }).format(new Date());
    } catch {
      return '';
    }
  }, []);

  const modules = useMemo(() => {
    return operationalModules.filter((module) => module.roles.includes(user?.role));
  }, [user?.role]);

  // Filter modules by search query
  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modules;
    const q = searchQuery.toLowerCase();
    return modules.filter((mod) => {
      return (
        mod.title.toLowerCase().includes(q) ||
        mod.description.toLowerCase().includes(q) ||
        mod.category.toLowerCase().includes(q) ||
        mod.quickLinks.some((ql) => ql.label.toLowerCase().includes(q))
      );
    });
  }, [modules, searchQuery]);

  // Dynamic layout class: If odd count (e.g., 5 or 3), allow the lead module to span 2 columns on desktop
  const getTileLayoutClass = (index, totalCount) => {
    if (totalCount % 2 !== 0 && index === 0) {
      return 'staff-tile-wide';
    }
    return '';
  };

  // Contextual quick actions based on active staff role
  const quickActions = useMemo(() => {
    const actions = [];
    const role = user?.role;

    // Inventory shortcuts
    if (['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'].includes(role)) {
      actions.push({
        label: 'Supply & Expiry Alerts',
        to: '/inventory/alerts',
        desc: 'Review stock warnings & critical thresholds'
      });
      actions.push({
        label: 'Item Catalog',
        to: '/inventory/items',
        desc: 'Browse clinic supply inventory listings'
      });
    }

    // Clinical shortcuts
    if (['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'].includes(role)) {
      actions.push({
        label: 'Patient Examinations',
        to: '/clinical/examinations',
        desc: 'Access patient consultation & diagnostic records'
      });
      actions.push({
        label: 'Active Prescriptions',
        to: '/prescriptions',
        desc: 'Issue medications & track pharmacy orders'
      });
    }

    // Billing shortcuts
    if (BILLING_ROLES.includes(role)) {
      actions.push({
        label: 'Create New Invoice',
        to: '/billing/invoices/new',
        desc: 'Issue patient invoice & itemized services'
      });
      actions.push({
        label: 'Daily Revenue Reports',
        to: '/billing/reports',
        desc: 'Review practice settlements & revenue totals'
      });
    }

    // Staff admin shortcuts
    if (role === 'ADMINISTRATOR') {
      actions.push({
        label: 'Staff Account Management',
        to: '/admin/staff',
        desc: 'Provision staff accounts & role permissions'
      });
    }

    return actions;
  }, [user?.role]);

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'DC';

  return (
    <main className="staff-dashboard-root" data-testid="staff-dashboard">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          1. PREMIUM COMMAND CENTER HEADER (Dark Navy Foundation)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="staff-command-header">
        <div className="staff-header-glow" aria-hidden="true" />
        <div className="staff-header-grid-lines" aria-hidden="true" />

        {/* Lightweight clinical geometric line motif */}
        <svg
          className="staff-header-clinical-motif"
          width="210"
          height="210"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M50 12 C35 12 24 22 24 38 C24 54 28 68 34 88 C36 92 42 92 44 86 C46 80 48 68 50 68 C52 68 54 80 56 86 C58 92 64 92 66 88 C72 68 76 54 76 38 C76 22 65 12 50 12 Z"
            stroke="rgba(45, 212, 191, 0.16)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <path
            d="M38 32 C38 26 44 22 50 22 C56 22 62 26 62 32 C62 38 56 42 50 42 C44 42 38 38 38 32 Z"
            stroke="rgba(45, 212, 191, 0.1)"
            strokeWidth="1"
          />
          <circle cx="50" cy="50" r="38" stroke="rgba(45, 212, 191, 0.07)" strokeWidth="1" />
          <line x1="12" y1="50" x2="88" y2="50" stroke="rgba(45, 212, 191, 0.06)" strokeWidth="0.75" />
          <line x1="50" y1="12" x2="50" y2="88" stroke="rgba(45, 212, 191, 0.06)" strokeWidth="0.75" />
        </svg>
        
        <div className="staff-command-header-inner">
          <div className="staff-command-identity">
            <div className="staff-avatar-orbit">
              <div className="staff-avatar-chip" aria-hidden="true">
                {initials}
              </div>
            </div>
            
            <div className="staff-command-text">
              <span className="staff-header-eyebrow">DENTCARE STAFF WORKSPACE</span>
              <div className="staff-title-row">
                <h1>Staff dashboard</h1>
              </div>
              <p className="staff-header-subtitle">
                Welcome back, <strong>{user?.firstName || 'team member'}</strong>. Your clinical and practice operations workspace.
              </p>
            </div>
          </div>

          <div className="staff-command-controls">
            <span
              className={`staff-role-badge ${getRoleBadgeClass(user?.role)}`}
              data-testid="staff-role-badge"
            >
              <span className="role-dot" aria-hidden="true" />
              {user?.role}
            </span>

            <span className="staff-station-status-pill" title="Clinic workstation connected">
              <span className="staff-status-dot" aria-hidden="true" />
              <span>Station Online</span>
            </span>

            {currentDateStr && (
              <span className="staff-header-date" title="Current session date">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>{currentDateStr}</span>
              </span>
            )}

            <Link to="/account" className="staff-account-btn">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </svg>
              <span>My Account</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Security / Access Denied Notice */}
      {location.state?.accessDenied && (
        <div className="staff-dashboard-notice" role="alert">
          <div className="staff-notice-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="staff-notice-text">
            <strong>Access Restricted:</strong> That page is not authorized for your account role. You have been returned to your staff dashboard.
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          2. COMMAND OPERATION STRIP (Integrated Horizontal Status)
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="staff-command-strip" aria-label="Operational telemetry">
        <div className="staff-telemetry-node">
          <span className="staff-telemetry-beacon" aria-hidden="true" />
          <span className="staff-telemetry-tag">Workstation</span>
          <span className="staff-telemetry-data">Online &bull; Ready</span>
        </div>

        <div className="staff-telemetry-sep" aria-hidden="true" />

        <div className="staff-telemetry-node">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
          </svg>
          <span className="staff-telemetry-tag">Permitted Tools</span>
          <span className="staff-telemetry-data">{modules.length} {modules.length === 1 ? 'Module' : 'Modules'} Authorized</span>
        </div>

        <div className="staff-telemetry-sep" aria-hidden="true" />

        <div className="staff-telemetry-node">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          </svg>
          <span className="staff-telemetry-tag">Access Scope</span>
          <span className="staff-telemetry-data">{getRoleDisplay(user?.role)}</span>
        </div>

        <div className="staff-telemetry-sep" aria-hidden="true" />

        <div className="staff-telemetry-node staff-telemetry-session">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="staff-telemetry-tag">Station Mode</span>
          <span className="staff-telemetry-data">Chairside Primary</span>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          3. PRIMARY WORKSPACE & COMMAND RAIL
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="staff-command-layout">
        {/* Main Workstation Column */}
        <section className="staff-command-primary" aria-labelledby="staff-tools-title">
          {/* Tactical Command Bar (Search & Filter) */}
          <div className="staff-command-bar">
            <div className="staff-command-bar-title">
              <h2 id="staff-tools-title">Practice tools</h2>
              <span className="staff-module-counter">
                {filteredModules.length} of {modules.length} Authorized
              </span>
            </div>

            <div className="staff-command-search-wrap">
              <svg className="staff-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="staff-command-search-input"
                placeholder="Search tools, modules, or actions… [/]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter practice tools"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="staff-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Unified Light Module Grid */}
          {filteredModules.length > 0 ? (
            <div className={`staff-modules-grid count-${filteredModules.length}`}>
              {filteredModules.map((module, index) => {
                const layoutClass = getTileLayoutClass(index, filteredModules.length);
                return (
                  <article
                    className={`staff-module-card ${layoutClass} ${module.id === 'inventory' ? 'staff-card-inventory' : ''}`}
                    key={module.to}
                    style={{ '--stagger-idx': index }}
                  >
                    <div className="staff-card-ambient" aria-hidden="true" />
                    
                    <div className="staff-card-header">
                      <div className={`staff-card-icon-box ${module.id === 'inventory' ? 'staff-icon-inventory' : ''}`}>
                        <ModuleIcon type={module.id} />
                      </div>
                      <div className="staff-card-meta">
                        <span className="staff-card-badge">{module.category}</span>
                      </div>
                    </div>

                    <div className="staff-card-body">
                      <h3 className="staff-card-title">{module.title}</h3>
                      <p className="staff-card-desc">{module.description}</p>
                    </div>

                    {module.quickLinks && module.quickLinks.length > 0 && (
                      <div className="staff-card-shortcuts" aria-label={`${module.title} quick links`}>
                        <span className="staff-shortcuts-label">Shortcuts</span>
                        <div className="staff-shortcuts-chips">
                          {module.quickLinks.map((link) => (
                            <Link key={`${module.id}-${link.label}`} to={link.to} className="staff-shortcut-chip">
                              <span>{link.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="staff-card-footer">
                      <Link to={module.to} className="staff-primary-link">
                        <span>Open {module.title}</span>
                        <span className="staff-link-arrow" aria-hidden="true">&rarr;</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="staff-empty-search">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p>No operational tools found matching &quot;<strong>{searchQuery}</strong>&quot;.</p>
              <button
                type="button"
                className="staff-clear-btn"
                onClick={() => setSearchQuery('')}
              >
                Reset Filter
              </button>
            </div>
          )}
        </section>

        {/* Tactical Command Rail (Right Column) */}
        <aside className="staff-command-rail" aria-label="Operational shortcuts and governance">
          {/* Tactical Quick Actions Dock */}
          <div className="staff-rail-card staff-rail-actions">
            <div className="staff-rail-header">
              <div className="staff-rail-icon-wrap" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div className="staff-rail-title-group">
                <h3>Quick Actions</h3>
                <span className="staff-rail-subtitle">Command Dock</span>
              </div>
            </div>

            <div className="staff-action-list">
              {quickActions.map((qa) => (
                <Link key={qa.label} to={qa.to} className="staff-action-item">
                  <div className="staff-action-details">
                    <span className="staff-action-name">{qa.label}</span>
                    <span className="staff-action-sub">{qa.desc}</span>
                  </div>
                  <span className="staff-action-arrow" aria-hidden="true">&rsaquo;</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Role Governance & Security Card */}
          <div className="staff-rail-card staff-rail-governance">
            <div className="staff-rail-header">
              <div className="staff-rail-icon-wrap" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                </svg>
              </div>
              <div className="staff-rail-title-group">
                <h3>Role Guidance</h3>
                <span className="staff-rail-subtitle">Access Scope</span>
              </div>
            </div>

            <p className="staff-governance-text">
              {getRoleGuidance(user?.role)}
            </p>

            <div className="staff-governance-specs">
              <div className="staff-spec-row">
                <span className="spec-label">Assigned Level</span>
                <span className="spec-val">{getRoleDisplay(user?.role)}</span>
              </div>
              {user?.email && (
                <div className="staff-spec-row">
                  <span className="spec-label">Provider ID</span>
                  <span className="spec-val" title={user.email}>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
