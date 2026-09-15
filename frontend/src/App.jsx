import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
import PublicOnlyRoute from './features/auth/components/PublicOnlyRoute';
import { AuthProvider } from './features/auth/context/AuthContext';
import { STAFF_ROLES } from './features/auth/roleAccess';
import PublicLandingPage from './features/auth/pages/PublicLandingPage';
import PatientDashboardPage from './features/auth/pages/PatientDashboardPage';
import StaffDashboardPage from './features/auth/pages/StaffDashboardPage';
import ClinicalOverviewPage from './features/clinical/pages/ClinicalOverviewPage';
import ExaminationsPage from './features/clinical/pages/ExaminationsPage';
import ExaminationDetailPage from './features/clinical/pages/ExaminationDetailPage';
import TreatmentPlansPage from './features/clinical/pages/TreatmentPlansPage';
import TreatmentPlanDetailPage from './features/clinical/pages/TreatmentPlanDetailPage';
import PrescriptionListPage from './features/prescription/pages/PrescriptionListPage';
import PrescriptionCreatePage from './features/prescription/pages/PrescriptionCreatePage';
import PrescriptionDetailPage from './features/prescription/pages/PrescriptionDetailPage';
import PrescriptionEditPage from './features/prescription/pages/PrescriptionEditPage';

export default function App() {
  return (
    <AuthProvider>
      <div className="app-layout">
        <AppHeader />
        <div className="app-content-wrapper">
          <Routes>
            <Route path="/" element={<PublicLandingPage />} />
            <Route
              path="/login"
              element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>}
            />
            <Route
              path="/register"
              element={<PublicOnlyRoute><PatientRegistrationPage /></PublicOnlyRoute>}
            />
            <Route
              path="/patient/dashboard"
              element={
                <ProtectedRoute allowedRoles={['PATIENT']}>
                  <PatientDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff/dashboard"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <StaffDashboardPage />
                </ProtectedRoute>
              }
            />
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
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryItemsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items/new"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryItemCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items/:id"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryItemDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/items/:id/edit"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryItemEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/batches"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryBatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory/alerts"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryAlertsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <PrescriptionListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions/new"
              element={
                <ProtectedRoute allowedRoles={['DENTIST']}>
                  <PrescriptionCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions/:id"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <PrescriptionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/prescriptions/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['DENTIST']}>
                  <PrescriptionEditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <ClinicalOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical/examinations"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <ExaminationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical/examinations/:id"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <ExaminationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical/treatment-plans"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <TreatmentPlansPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clinical/treatment-plans/:id"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <TreatmentPlanDetailPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </div>
    </AuthProvider>
  );
}
