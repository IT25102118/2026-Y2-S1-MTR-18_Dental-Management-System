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
import ProtectedRoute from './features/auth/components/ProtectedRoute';
import { AuthProvider, useAuth } from './features/auth/context/AuthContext';
import ClinicalOverviewPage from './features/clinical/pages/ClinicalOverviewPage';
import ExaminationsPage from './features/clinical/pages/ExaminationsPage';
import ExaminationDetailPage from './features/clinical/pages/ExaminationDetailPage';
import TreatmentPlansPage from './features/clinical/pages/TreatmentPlansPage';
import TreatmentPlanDetailPage from './features/clinical/pages/TreatmentPlanDetailPage';

function RootPage() {
  const { isAuthenticated, user } = useAuth();

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
        <Route path="/inventory" element={<InventoryOverviewPage />} />
        <Route path="/inventory/items" element={<InventoryItemsPage />} />
        <Route path="/inventory/items/new" element={<InventoryItemCreatePage />} />
        <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
        <Route path="/inventory/items/:id/edit" element={<InventoryItemEditPage />} />
        <Route path="/inventory/batches" element={<InventoryBatchesPage />} />
        <Route path="/inventory/alerts" element={<InventoryAlertsPage />} />
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
    </AuthProvider>
  );
}
