import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BILLING_ROLES } from '../roleAccess';
import '../entry.css';
import '../staff-dashboard.css';

const operationalModules = [
  {
    id: 'inventory',
    title: 'Inventory Management',
    description: 'Review catalog items, batches, stock movements, and supply alerts.',
    to: '/inventory',
    roles: ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'],
    category: 'Supplies & Batches',
    iconClass: 'icon-inventory',
    quickLinks: [
      { label: 'Catalog', to: '/inventory/items' },
      { label: 'Batches', to: '/inventory/batches' },
      { label: 'Alerts', to: '/inventory/alerts' }
    ]
  },
  {
    id: 'clinical',
    title: 'Clinical Management',
    description: 'Work with examinations, tooth findings, and treatment plans.',
    to: '/clinical',
    roles: ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'],
    category: 'Patient Care',
    iconClass: 'icon-clinical',
    quickLinks: [
      { label: 'Examinations', to: '/clinical/examinations' },
      { label: 'Treatment Plans', to: '/clinical/treatment-plans' }
    ]
  },
  {
    id: 'prescriptions',
    title: 'Prescription Management',
    description: 'Review prescription records and perform role-permitted actions.',
    to: '/prescriptions',
    roles: ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT'],
    category: 'Pharmacy & Rx',
    iconClass: 'icon-prescriptions',
    quickLinks: [
      { label: 'Prescriptions List', to: '/prescriptions' }
    ]
  },
  {
    id: 'billing',
    title: 'Invoices & Billing',
    description: 'Manage invoices, payments, receipts, and income reporting.',
    to: '/billing/invoices',
    roles: BILLING_ROLES,
    category: 'Financial Operations',
    iconClass: 'icon-billing',
    quickLinks: [
      { label: 'All Invoices', to: '/billing/invoices' },
      { label: 'New Invoice', to: '/billing/invoices/new' }
    ]
  },
  {
    id: 'reports',
    title: 'Income Reports',
    description: 'Review daily and monthly clinic income summaries.',
    to: '/billing/reports',
    roles: BILLING_ROLES,
    category: 'Practice Intelligence',
    iconClass: 'icon-reports',
    quickLinks: [
      { label: 'Daily Summary', to: '/billing/reports' },
      { label: 'Monthly Summary', to: '/billing/reports' }
    ]
  },
  {
    id: 'staff-admin',
    title: 'Staff Management',
    description: 'Provision staff accounts and manage roles and account status.',
    to: '/admin/staff',
    roles: ['ADMINISTRATOR'],
    category: 'Security & Access',
    iconClass: 'icon-admin',
    quickLinks: [
      { label: 'Staff Accounts', to: '/admin/staff' }
    ]
  }
];

function ModuleIcon({ type }) {
  switch (type) {
    case 'inventory':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      );
    case 'clinical':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
        </svg>
      );
    case 'prescriptions':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.5 20.5 20 11a4.95 4.95 0 1 0-7-7L3.5 13.5a4.95 4.95 0 1 0 7 7Z"></path>
          <path d="m8.5 8.5 7 7"></path>
        </svg>
      );
    case 'billing':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="20" height="14" x="2" y="5" rx="2"></rect>
          <line x1="2" x2="22" y1="10" y2="10"></line>
        </svg>
      );
    case 'reports':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      );
    case 'staff-admin':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
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
      return 'Practice Administration & Governance: Full oversight across clinic staff accounts, operatory inventory supplies, and practice financial records.';
    case 'DENTIST':
      return 'Clinical & Chairside Workspace: Access patient examinations, tooth charting, active treatment plans, prescriptions, and operatory inventory.';
    case 'RECEPTIONIST':
      return 'Front Desk & Billing Workspace: Manage patient invoices, payment collections, daily income reports, clinical records, and supply deliveries.';
    case 'DENTAL_ASSISTANT':
      return 'Operatory & Inventory Support: Assist with treatment procedures, batch verification, supply replenishments, and chairside stock movement logs.';
    default:
      return 'Practice Workspace: Access operational tools and clinical records assigned to your staff account.';
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
  const modules = operationalModules.filter((module) => module.roles.includes(user?.role));

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'DC';

  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date());

  return (
    <main className="staff-dashboard-root" data-testid="staff-dashboard">
      <header className="staff-dashboard-header">
        <div className="staff-dashboard-top-bar">
          <div className="staff-station-status">
            <span className="staff-status-indicator" aria-hidden="true" />
            <span>DentCare Clinical Suite &bull; Station Online</span>
          </div>
          <div className="staff-station-date" aria-label={`Current date: ${todayFormatted}`}>
            {todayFormatted}
          </div>
        </div>

        <div className="staff-header-content">
          <div className="staff-user-identity">
            <div className="staff-avatar-chip" aria-hidden="true">
              {initials}
            </div>
            <div className="staff-title-group">
              <p className="entry-eyebrow">Dental Practice Management System</p>
              <h1>Staff dashboard</h1>
              <p>
                Welcome back, <strong>{user?.firstName || 'team member'}</strong>. Your workspace displays
                only modules assigned to the {getRoleDisplay(user?.role)} role.
              </p>
            </div>
          </div>

          <div className="staff-header-actions">
            <span
              className={`staff-role-badge ${getRoleBadgeClass(user?.role)}`}
              data-testid="staff-role-badge"
            >
              {user?.role}
            </span>
            <Link to="/account" className="staff-account-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="5"></circle>
                <path d="M20 21a8 8 0 0 0-16 0"></path>
              </svg>
              My Account
            </Link>
          </div>
        </div>
      </header>

      {location.state?.accessDenied && (
        <div className="staff-dashboard-notice" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>That page is not authorized for your account role. You have been returned to your staff dashboard.</span>
        </div>
      )}

      <div className="staff-guidance-banner" role="region" aria-label="Role guidance">
        <span className="staff-guidance-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </span>
        <p className="staff-guidance-text">
          {getRoleGuidance(user?.role)}
        </p>
      </div>

      <section aria-labelledby="staff-tools-title">
        <div className="staff-section-header">
          <div className="staff-section-header-left">
            <h2 id="staff-tools-title">Practice tools</h2>
            <span className="staff-module-counter">
              {modules.length} {modules.length === 1 ? 'module' : 'modules'} available
            </span>
          </div>
        </div>

        <div className="staff-cards-grid">
          {modules.map((module) => (
            <article className="staff-module-card" key={module.to}>
              <div className="staff-card-top">
                <div className={`staff-card-icon-wrapper ${module.iconClass}`}>
                  <ModuleIcon type={module.id} />
                </div>
                <span className="staff-card-badge">{module.category}</span>
              </div>

              <div className="staff-card-body">
                <h3>{module.title}</h3>
                <p>{module.description}</p>

                {module.quickLinks && module.quickLinks.length > 0 && (
                  <div className="staff-quick-links" aria-label={`${module.title} quick links`}>
                    <span className="staff-quick-links-label">Quick Access</span>
                    <div className="staff-quick-links-chips">
                      {module.quickLinks.map((link) => (
                        <Link key={`${module.id}-${link.label}`} to={link.to} className="staff-quick-chip">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="staff-card-action">
                <Link to={module.to} className="staff-primary-link">
                  Open {module.title} <span className="staff-link-arrow" aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
