import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BILLING_ROLES } from '../roleAccess';
import '../entry.css';
import '../staff-dashboard.css';

const operationalModules = [
  {
    id: 'inventory',
    title: 'Inventory Management',
    description: 'Track supplies, batches, stock movements, and real-time alerts.',
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
    description: 'Work with dental examinations, tooth findings, and active treatment plans.',
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
    description: 'Issue medications, track active prescriptions, and perform clinical workflows.',
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
    description: 'Manage patient invoices, record payments, and track clinic revenue.',
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
    description: 'Review daily and monthly revenue summaries, settlements, and financial reports.',
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
    description: 'Provision staff credentials, assign role access levels, and monitor personnel.',
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case 'clinical':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
      );
    case 'prescriptions':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.5 20.5 20 11a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      );
    case 'billing':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case 'reports':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'staff-admin':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
      return 'role-dentist';
  }
}

function getRoleGuidance(role) {
  switch (role) {
    case 'ADMINISTRATOR':
      return 'Full oversight across clinic staff accounts, inventory supplies, and practice financial records.';
    case 'DENTIST':
      return 'Access patient examinations, tooth charting, active treatment plans, and prescriptions.';
    case 'RECEPTIONIST':
      return 'Manage patient invoices, payment collections, daily income reports, and supply deliveries.';
    case 'DENTAL_ASSISTANT':
      return 'Operatory care, batch verification, supply replenishments, and chairside stock movement logs.';
    default:
      return 'Access operational tools and clinical records assigned to your staff account.';
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

  // Contextual quick actions based on active staff role
  const quickActions = useMemo(() => {
    const actions = [];
    const role = user?.role;

    // Inventory shortcuts
    if (['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'].includes(role)) {
      actions.push({
        label: 'Supply & Expiry Alerts',
        to: '/inventory/alerts',
        desc: 'Check stock warnings'
      });
      actions.push({
        label: 'Item Catalog',
        to: '/inventory/items',
        desc: 'Browse inventory listings'
      });
    }

    // Clinical shortcuts
    if (['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'].includes(role)) {
      actions.push({
        label: 'Patient Examinations',
        to: '/clinical/examinations',
        desc: 'Consultation records'
      });
      actions.push({
        label: 'Active Prescriptions',
        to: '/prescriptions',
        desc: 'Medications and dosages'
      });
    }

    // Billing shortcuts
    if (BILLING_ROLES.includes(role)) {
      actions.push({
        label: 'Create New Invoice',
        to: '/billing/invoices/new',
        desc: 'Issue a patient invoice'
      });
      actions.push({
        label: 'Daily Revenue Reports',
        to: '/billing/reports',
        desc: 'Financial settlements'
      });
    }

    // Staff admin shortcuts
    if (role === 'ADMINISTRATOR') {
      actions.push({
        label: 'Staff Account Management',
        to: '/admin/staff',
        desc: 'Credentials and permissions'
      });
    }

    return actions;
  }, [user?.role]);

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'DC';

  return (
    <main className="staff-dashboard-root" data-testid="staff-dashboard">
      {/* ZONE 1: Compact Page Header */}
      <header className="staff-page-header">
        <div className="staff-header-identity">
          <div className="staff-avatar-chip" aria-hidden="true">
            {initials}
          </div>
          <div className="staff-header-titles">
            <span className="staff-header-eyebrow">Dental Practice Management System</span>
            <div className="staff-title-row">
              <h1>Staff dashboard</h1>
              <span className="staff-station-status-pill" title="Clinic workstation connected">
                <span className="staff-status-dot" aria-hidden="true" />
                <span>Station Online</span>
              </span>
            </div>
            <p className="staff-header-subtitle">
              Welcome back, <strong>{user?.firstName || 'team member'}</strong>. Manage today&apos;s clinic operations and access authorized staff tools.
            </p>
          </div>
        </div>

        <div className="staff-header-controls">
          <span
            className={`staff-role-badge ${getRoleBadgeClass(user?.role)}`}
            data-testid="staff-role-badge"
          >
            <span className="role-dot" aria-hidden="true" />
            {user?.role}
          </span>
          <Link to="/account" className="staff-account-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
            <span>My Account</span>
          </Link>
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

      {/* ZONE 2: Compact Operational Overview Strip */}
      <section className="staff-overview-bar" aria-label="Operational overview">
        <div className="staff-overview-item">
          <span className="staff-overview-dot" aria-hidden="true" />
          <span className="staff-overview-label">Workstation:</span>
          <span className="staff-overview-val">Online &bull; Ready</span>
        </div>
        <div className="staff-overview-divider" aria-hidden="true" />
        <div className="staff-overview-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect width="7" height="7" x="3" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="3" rx="1" />
            <rect width="7" height="7" x="14" y="14" rx="1" />
            <rect width="7" height="7" x="3" y="14" rx="1" />
          </svg>
          <span className="staff-overview-label">Permitted Tools:</span>
          <span className="staff-overview-val">{modules.length} {modules.length === 1 ? 'Module' : 'Modules'}</span>
        </div>
        <div className="staff-overview-divider" aria-hidden="true" />
        <div className="staff-overview-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          </svg>
          <span className="staff-overview-label">Access Scope:</span>
          <span className="staff-overview-val">{getRoleDisplay(user?.role)}</span>
        </div>
      </section>

      {/* ZONE 3: Main Workspace (Primary Tools + Secondary Actions) */}
      <div className="staff-workspace-layout">
        {/* Left: Primary Working Area (Practice Tools) */}
        <section className="staff-tools-primary" aria-labelledby="staff-tools-title">
          <div className="staff-tools-header">
            <div className="staff-tools-header-text">
              <h2 id="staff-tools-title">Practice tools</h2>
              <span className="staff-module-counter">
                {filteredModules.length} of {modules.length}
              </span>
            </div>

            <div className="staff-search-box">
              <svg className="staff-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="staff-search-input"
                placeholder="Filter tools..."
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

          {filteredModules.length > 0 ? (
            <div className="staff-cards-grid">
              {filteredModules.map((module) => (
                <article className="staff-module-card" key={module.to}>
                  <div className="staff-card-header">
                    <div className="staff-card-icon-wrapper">
                      <ModuleIcon type={module.id} />
                    </div>
                    <div className="staff-card-heading-group">
                      <h3>{module.title}</h3>
                      <span className="staff-card-category-tag">{module.category}</span>
                    </div>
                  </div>

                  <p className="staff-card-desc">{module.description}</p>

                  {module.quickLinks && module.quickLinks.length > 0 && (
                    <div className="staff-quick-links" aria-label={`${module.title} quick links`}>
                      <span className="staff-quick-label">Direct Links</span>
                      <div className="staff-quick-chips">
                        {module.quickLinks.map((link) => (
                          <Link key={`${module.id}-${link.label}`} to={link.to} className="staff-quick-chip">
                            <span>{link.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="staff-card-action">
                    <Link to={module.to} className="staff-primary-link">
                      <span>Open {module.title}</span>
                      <span className="staff-link-arrow" aria-hidden="true">&rarr;</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="staff-empty-search">
              <p>No tools found matching &quot;<strong>{searchQuery}</strong>&quot;.</p>
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

        {/* Right: Secondary Operational Sidebar */}
        <aside className="staff-tools-sidebar" aria-label="Operational shortcuts and context">
          {/* Quick Actions Panel */}
          <div className="staff-sidebar-card">
            <div className="staff-sidebar-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <h3>Quick Actions</h3>
            </div>
            <div className="staff-sidebar-links">
              {quickActions.map((qa) => (
                <Link key={qa.label} to={qa.to} className="staff-action-row">
                  <div className="staff-action-text">
                    <span className="staff-action-title">{qa.label}</span>
                    <span className="staff-action-desc">{qa.desc}</span>
                  </div>
                  <span className="staff-action-chevron" aria-hidden="true">&rsaquo;</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Role Context Panel */}
          <div className="staff-sidebar-card">
            <div className="staff-sidebar-header">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <h3>Role Guidance</h3>
            </div>
            <p className="staff-scope-note">
              {getRoleGuidance(user?.role)}
            </p>
            <div className="staff-scope-meta">
              <div className="staff-scope-meta-item">
                <span className="meta-label">Access Level:</span>
                <span className="meta-val">{getRoleDisplay(user?.role)}</span>
              </div>
              {user?.email && (
                <div className="staff-scope-meta-item">
                  <span className="meta-label">Signed in as:</span>
                  <span className="meta-val" title={user.email}>{user.email}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
