import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BILLING_ROLES } from '../roleAccess';
import '../entry.css';

const operationalModules = [
  {
    title: 'Inventory Management',
    description: 'Review catalog items, batches, stock movements, and supply alerts.',
    to: '/inventory',
    roles: ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT']
  },
  {
    title: 'Clinical Management',
    description: 'Work with examinations, tooth findings, and treatment plans.',
    to: '/clinical',
    roles: ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT']
  },
  {
    title: 'Prescription Management',
    description: 'Review prescription records and perform role-permitted actions.',
    to: '/prescriptions',
    roles: ['ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT']
  },
  {
    title: 'Invoices & Billing',
    description: 'Manage invoices, payments, receipts, and income reporting.',
    to: '/billing/invoices',
    roles: BILLING_ROLES
  },
  {
    title: 'Income Reports',
    description: 'Review daily and monthly clinic income summaries.',
    to: '/billing/reports',
    roles: BILLING_ROLES
  },
  {
    title: 'Staff Management',
    description: 'Provision staff accounts and manage roles and account status.',
    to: '/admin/staff',
    roles: ['ADMINISTRATOR']
  }
];

export default function StaffDashboardPage() {
  const { user } = useAuth();
  const location = useLocation();
  const modules = operationalModules.filter((module) => module.roles.includes(user?.role));

  return (
    <main className="role-dashboard" data-testid="staff-dashboard">
      <section className="role-dashboard-hero">
        <div>
          <p className="entry-eyebrow">Dental Practice Management System</p>
          <h1>Staff dashboard</h1>
          <p>
            Welcome, {user?.firstName || 'team member'}. Your workspace shows only the modules
            assigned to the {user?.role || 'staff'} role.
          </p>
        </div>
        <span className="role-dashboard-badge">{user?.role}</span>
      </section>

      {location.state?.accessDenied && (
        <div className="dashboard-notice" role="alert">
          That page is not available for your account role. You have been returned to your staff dashboard.
        </div>
      )}

      <section aria-labelledby="staff-tools-title">
        <div className="role-dashboard-section-heading">
          <div>
            <p className="entry-eyebrow">Authorized workspace</p>
            <h2 id="staff-tools-title">Practice tools</h2>
          </div>
          <Link to="/account" className="btn btn-secondary">My Account</Link>
        </div>

        <div className="role-dashboard-grid">
          {modules.map((module, index) => (
            <article className="role-action-card" key={module.to}>
              <span className="role-card-kicker">0{index + 1}</span>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
              <Link to={module.to} className="role-card-link">
                Open {module.title} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
