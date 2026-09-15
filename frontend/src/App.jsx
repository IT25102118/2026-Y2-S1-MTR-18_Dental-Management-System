import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import InventoryItemsPage from './features/inventory/pages/InventoryItemsPage';
import InventoryItemCreatePage from './features/inventory/pages/InventoryItemCreatePage';
import InventoryItemDetailPage from './features/inventory/pages/InventoryItemDetailPage';
import InventoryItemEditPage from './features/inventory/pages/InventoryItemEditPage';
import InventoryBatchesPage from './features/inventory/pages/InventoryBatchesPage';
import InventoryAlertsPage from './features/inventory/pages/InventoryAlertsPage';
import InventoryOverviewPage from './features/inventory/pages/InventoryOverviewPage';
import PatientRegistrationPage from './features/auth/pages/PatientRegistrationPage';
import LoginPage from './features/auth/pages/LoginPage';
import AccountPage from './features/auth/pages/AccountPage';
import StaffManagementPage from './features/auth/pages/StaffManagementPage';
import AppHeader from './components/AppHeader';
import InvoiceListPage from './features/billing/pages/InvoiceListPage';
import InvoiceFormPage from './features/billing/pages/InvoiceFormPage';
import InvoiceDetailPage from './features/billing/pages/InvoiceDetailPage';
import ReceiptPage from './features/billing/pages/ReceiptPage';
import IncomeReportsPage from './features/billing/pages/IncomeReportsPage';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import ClinicalOverviewPage from './features/clinical/pages/ClinicalOverviewPage';
import ExaminationsPage from './features/clinical/pages/ExaminationsPage';
import ExaminationDetailPage from './features/clinical/pages/ExaminationDetailPage';
import TreatmentPlansPage from './features/clinical/pages/TreatmentPlansPage';
import TreatmentPlanDetailPage from './features/clinical/pages/TreatmentPlanDetailPage';
import PrescriptionListPage from './features/prescription/pages/PrescriptionListPage';
import PrescriptionCreatePage from './features/prescription/pages/PrescriptionCreatePage';
import PrescriptionDetailPage from './features/prescription/pages/PrescriptionDetailPage';
import PrescriptionEditPage from './features/prescription/pages/PrescriptionEditPage';

function RootPage() {
  const { isAuthenticated, user } = useAuth();
  const isStaffBilling = isAuthenticated && (user?.role === 'ADMINISTRATOR' || user?.role === 'RECEPTIONIST');
  const isPatient = isAuthenticated && user?.role === 'PATIENT';
  const isAdmin = isAuthenticated && user?.role === 'ADMINISTRATOR';
  const showBilling = !isPatient;

  const pageStyle = {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    padding: '3rem 1.5rem'
  };

  const containerStyle = {
    maxWidth: '1100px',
    margin: '0 auto'
  };

  const heroStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)'
  };

  const cardGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1.25rem'
  };

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '1.5rem',
    textDecoration: 'none',
    color: '#0f172a',
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
  };

  const iconStyle = {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    fontSize: '1.4rem',
    marginBottom: '1rem'
  };

  const cardTitleStyle = {
    margin: '0 0 0.5rem 0',
    fontSize: '1.15rem',
    fontWeight: 700
  };

  const cardDescriptionStyle = {
    margin: 0,
    color: '#64748b',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    flexGrow: 1
  };

  const cardActionStyle = {
    marginTop: '1.25rem',
    color: '#2563eb',
    fontWeight: 600,
    fontSize: '0.875rem'
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <header style={heroStyle}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <div
                style={{
                  color: '#2563eb',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '0.5rem'
                }}
              >
                Dental Practice Management System
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '2.25rem',
                  color: '#0f172a'
                }}
              >
                DentCare Dashboard
              </h1>
              <p
                style={{
                  margin: '0.75rem 0 0 0',
                  color: '#64748b',
                  fontSize: '1rem'
                }}
              >
                {isAuthenticated
                  ? `Welcome, ${user?.firstName || 'User'}. Select a module to continue.`
                  : 'Manage clinical, prescription, billing, and operational activities from one place.'}
              </p>
            </div>
            {isAuthenticated && (
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: '10px',
                  padding: '0.7rem 1rem',
                  color: '#334155',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {user?.role || 'Authenticated User'}
              </div>
            )}
          </div>
        </header>

        <main>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: '1.35rem'
              }}
            >
              System Modules
            </h2>
            <p
              style={{
                margin: '0.4rem 0 0 0',
                color: '#64748b',
                fontSize: '0.9rem'
              }}
            >
              Choose a module to manage DentCare operations.
            </p>
          </div>

          <div style={cardGridStyle}>
            {/* 1. Invoices & Billing (visible to visitors and staff; hidden from patients) */}
            {showBilling && (
              <Link to="/billing/invoices" style={cardStyle}>
                <div style={iconStyle}>💳</div>
                <h3 style={cardTitleStyle}>Invoices &amp; Billing</h3>
                <p style={cardDescriptionStyle}>
                  Manage patient invoices, payment recording, reversals, and printable receipts.
                </p>
                <div style={cardActionStyle}>
                  Open Billing Management →
                </div>
              </Link>
            )}

            {/* 2. Income Reports (staff only) */}
            {isStaffBilling && (
              <Link to="/billing/reports" style={cardStyle}>
                <div style={iconStyle}>📊</div>
                <h3 style={cardTitleStyle}>Income Reports</h3>
                <p style={cardDescriptionStyle}>
                  View clinic financial summaries, revenue analytics, and payment breakdowns.
                </p>
                <div style={cardActionStyle}>
                  Open Income Reports →
                </div>
              </Link>
            )}

            {/* 3. Prescription Management */}
            <Link to="/prescriptions" style={cardStyle}>
              <div style={iconStyle}>💊</div>
              <h3 style={cardTitleStyle}>Prescription Management</h3>
              <p style={cardDescriptionStyle}>
                Create, review, edit, finalize and maintain patient prescriptions and dosage instructions.
              </p>
              <div style={cardActionStyle}>
                Open Prescription Management →
              </div>
            </Link>

            {/* 4. Clinical Management */}
            <Link to="/clinical" style={cardStyle}>
              <div style={iconStyle}>🦷</div>
              <h3 style={cardTitleStyle}>Clinical Management</h3>
              <p style={cardDescriptionStyle}>
                Perform dental examinations, record tooth findings, and manage treatment plans.
              </p>
              <div style={cardActionStyle}>
                Open Clinical Management →
              </div>
            </Link>

            {/* 5. Inventory Management */}
            <Link to="/inventory" style={cardStyle}>
              <div style={iconStyle}>📦</div>
              <h3 style={cardTitleStyle}>Inventory Management</h3>
              <p style={cardDescriptionStyle}>
                Manage inventory items, batches, stock movements, and low-stock alerts.
              </p>
              <div style={cardActionStyle}>
                Open Inventory Management →
              </div>
            </Link>

            {/* 6. Staff Management (if admin) */}
            {isAdmin && (
              <Link to="/admin/staff" style={cardStyle}>
                <div style={iconStyle}>👥</div>
                <h3 style={cardTitleStyle}>Staff Management</h3>
                <p style={cardDescriptionStyle}>
                  Provision and manage staff members, system roles, and account statuses.
                </p>
                <div style={cardActionStyle}>
                  Open Staff Management →
                </div>
              </Link>
            )}

            {/* Account / Authentication Cards */}
            {isAuthenticated ? (
              <Link to="/account" style={cardStyle}>
                <div style={iconStyle}>👤</div>
                <h3 style={cardTitleStyle}>
                  My Account ({user?.firstName || 'User'})
                </h3>
                <p style={cardDescriptionStyle}>
                  View your account profile, assigned roles, and personal security settings.
                </p>
                <div style={cardActionStyle}>
                  View My Account →
                </div>
              </Link>
            ) : (
              <>
                <Link to="/login" style={cardStyle}>
                  <div style={iconStyle}>🔐</div>
                  <h3 style={cardTitleStyle}>Sign In</h3>
                  <p style={cardDescriptionStyle}>
                    Sign in securely to access authorized DentCare clinical and staff tools.
                  </p>
                  <div style={cardActionStyle}>
                    Sign In →
                  </div>
                </Link>

                <Link to="/register" style={cardStyle}>
                  <div style={iconStyle}>📝</div>
                  <h3 style={cardTitleStyle}>Patient Registration</h3>
                  <p style={cardDescriptionStyle}>
                    Register a new patient account to begin receiving dental care.
                  </p>
                  <div style={cardActionStyle}>
                    Register Patient →
                  </div>
                </Link>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-layout">
        <AppHeader />
        <main className="app-content-wrapper">
          <Routes>
            <Route path="/" element={<RootPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<PatientRegistrationPage />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
                  <StaffManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/invoices"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <InvoiceListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/invoices/new"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <InvoiceFormPage mode="create" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/invoices/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <InvoiceFormPage mode="edit" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/invoices/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <InvoiceDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/payments/:paymentId/receipt"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <ReceiptPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments/:paymentId/receipt"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <ReceiptPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing/reports"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <IncomeReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/income"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <IncomeReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <InvoiceListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/new"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <InvoiceFormPage mode="create" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <InvoiceFormPage mode="edit" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/:id"
              element={
                <ProtectedRoute allowedRoles={['ADMINISTRATOR', 'RECEPTIONIST']}>
                  <InvoiceDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <InventoryOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items"
              element={
                <ProtectedRoute>
                  <InventoryItemsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items/new"
              element={
                <ProtectedRoute>
                  <InventoryItemCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items/:id"
              element={
                <ProtectedRoute>
                  <InventoryItemDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items/:id/edit"
              element={
                <ProtectedRoute>
                  <InventoryItemEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/batches"
              element={
                <ProtectedRoute>
                  <InventoryBatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/alerts"
              element={
                <ProtectedRoute>
                  <InventoryAlertsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions"
              element={
                <ProtectedRoute>
                  <PrescriptionListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions/new"
              element={
                <ProtectedRoute>
                  <PrescriptionCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions/:id"
              element={
                <ProtectedRoute>
                  <PrescriptionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions/:id/edit"
              element={
                <ProtectedRoute>
                  <PrescriptionEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical"
              element={
                <ProtectedRoute>
                  <ClinicalOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical/examinations"
              element={
                <ProtectedRoute>
                  <ExaminationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical/examinations/:id"
              element={
                <ProtectedRoute>
                  <ExaminationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical/treatment-plans"
              element={
                <ProtectedRoute>
                  <TreatmentPlansPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical/treatment-plans/:id"
              element={
                <ProtectedRoute>
                  <TreatmentPlanDetailPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
