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
import InvoiceListPage from './features/billing/pages/InvoiceListPage';
import InvoiceFormPage from './features/billing/pages/InvoiceFormPage';
import InvoiceDetailPage from './features/billing/pages/InvoiceDetailPage';
import ReceiptPage from './features/billing/pages/ReceiptPage';
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';

function RootPage() {
  const { isAuthenticated, user } = useAuth();
  const isStaffBilling = isAuthenticated && (user?.role === 'ADMINISTRATOR' || user?.role === 'RECEPTIONIST');

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
          {isStaffBilling && (
            <li>
              <Link to="/billing/invoices">Invoices &amp; Billing</Link>
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
        <Route path="/inventory" element={<InventoryOverviewPage />} />
        <Route path="/inventory/items" element={<InventoryItemsPage />} />
        <Route path="/inventory/items/new" element={<InventoryItemCreatePage />} />
        <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
        <Route path="/inventory/items/:id/edit" element={<InventoryItemEditPage />} />
        <Route path="/inventory/batches" element={<InventoryBatchesPage />} />
        <Route path="/inventory/alerts" element={<InventoryAlertsPage />} />
      </Routes>
    </AuthProvider>
  );
}
