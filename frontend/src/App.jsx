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
  const isAdmin = isAuthenticated && user?.role === 'ADMINISTRATOR';

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header>
        <h1>DentCare</h1>
        <p>Dental Practice Management System</p>
      </header>
      <main style={{ marginTop: '2rem' }}>
        <h2>Modules</h2>
        <ul>
          <li>
            <Link to="/inventory">Inventory Management</Link>
          </li>
          <li>
            <Link to="/clinical">Clinical Management</Link>
          </li>
          <li>
            <Link to="/prescriptions">Prescription Management</Link>
          </li>
          {isStaffBilling && (
            <>
              <li>
                <Link to="/billing/invoices">Invoices &amp; Billing</Link>
              </li>
              <li>
                <Link to="/billing/reports">Income Reports</Link>
              </li>
            </>
          )}
          {isAdmin && (
            <li>
              <Link to="/admin/staff">Staff Management</Link>
            </li>
          )}
          {isAuthenticated ? (
            <li>
              <Link to="/account">My Account ({user?.firstName || 'User'})</Link>
            </li>
          ) : (
            <>
              <li>
                <Link to="/login">Sign In</Link>
              </li>
              <li>
                <Link to="/register">Patient Registration</Link>
              </li>
            </>
          )}
        </ul>
      </main>
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
