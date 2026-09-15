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
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import AppHeader from './components/AppHeader';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';

function RootPage() {
  const { isAuthenticated, user } = useAuth();
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
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
