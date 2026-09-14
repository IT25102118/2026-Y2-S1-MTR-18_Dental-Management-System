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
import PrescriptionListPage from './features/prescription/pages/PrescriptionListPage';
import PrescriptionCreatePage from './features/prescription/pages/PrescriptionCreatePage';
import PrescriptionDetailPage from './features/prescription/pages/PrescriptionDetailPage';
import PrescriptionEditPage from './features/prescription/pages/PrescriptionEditPage';

function RootPage() {
    const { isAuthenticated, user } = useAuth();

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
        display: 'block',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '1.5rem',
        textDecoration: 'none',
        color: '#0f172a',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        minHeight: '150px'
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
        lineHeight: 1.6
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
                                    : 'Manage clinical and operational activities from one place.'}
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
                        <Link to="/prescriptions" style={cardStyle}>
                            <div style={iconStyle}>💊</div>

                            <h3 style={cardTitleStyle}>
                                Prescription Management
                            </h3>

                            <p style={cardDescriptionStyle}>
                                Create, review, edit, finalize and maintain patient
                                prescriptions and medicine instructions.
                            </p>

                            <div
                                style={{
                                    marginTop: '1rem',
                                    color: '#2563eb',
                                    fontWeight: 600,
                                    fontSize: '0.875rem'
                                }}
                            >
                                Open Prescription Management →
                            </div>
                        </Link>

                        <Link to="/inventory" style={cardStyle}>
                            <div style={iconStyle}>📦</div>

                            <h3 style={cardTitleStyle}>
                                Inventory Management
                            </h3>

                            <p style={cardDescriptionStyle}>
                                Manage inventory items, batches, stock information and
                                inventory alerts.
                            </p>

                            <div
                                style={{
                                    marginTop: '1rem',
                                    color: '#2563eb',
                                    fontWeight: 600,
                                    fontSize: '0.875rem'
                                }}
                            >
                                Open Inventory Management →
                            </div>
                        </Link>

                        {isAuthenticated ? (
                            <Link to="/account" style={cardStyle}>
                                <div style={iconStyle}>👤</div>

                                <h3 style={cardTitleStyle}>
                                    My Account ({user?.firstName || 'User'})
                                </h3>

                                <p style={cardDescriptionStyle}>
                                    View your DentCare account information, profile and
                                    assigned system role.
                                </p>

                                <div
                                    style={{
                                        marginTop: '1rem',
                                        color: '#2563eb',
                                        fontWeight: 600,
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    View My Account →
                                </div>
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" style={cardStyle}>
                                    <div style={iconStyle}>🔐</div>

                                    <h3 style={cardTitleStyle}>
                                        Sign In
                                    </h3>

                                    <p style={cardDescriptionStyle}>
                                        Sign in securely to access authorized DentCare
                                        functionality.
                                    </p>

                                    <div
                                        style={{
                                            marginTop: '1rem',
                                            color: '#2563eb',
                                            fontWeight: 600,
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        Sign In →
                                    </div>
                                </Link>

                                <Link to="/register" style={cardStyle}>
                                    <div style={iconStyle}>📝</div>

                                    <h3 style={cardTitleStyle}>
                                        Patient Registration
                                    </h3>

                                    <p style={cardDescriptionStyle}>
                                        Register a new patient account for access to DentCare.
                                    </p>

                                    <div
                                        style={{
                                            marginTop: '1rem',
                                            color: '#2563eb',
                                            fontWeight: 600,
                                            fontSize: '0.875rem'
                                        }}
                                    >
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
                <Route
                    path="/inventory/items/new"
                    element={<InventoryItemCreatePage />}
                />
                <Route
                    path="/inventory/items/:id"
                    element={<InventoryItemDetailPage />}
                />
                <Route
                    path="/inventory/items/:id/edit"
                    element={<InventoryItemEditPage />}
                />
                <Route
                    path="/inventory/batches"
                    element={<InventoryBatchesPage />}
                />
                <Route
                    path="/inventory/alerts"
                    element={<InventoryAlertsPage />}
                />

                <Route
                    path="/prescriptions"
                    element={<PrescriptionListPage />}
                />
                <Route
                    path="/prescriptions/new"
                    element={<PrescriptionCreatePage />}
                />
                <Route
                    path="/prescriptions/:id"
                    element={<PrescriptionDetailPage />}
                />
                <Route
                    path="/prescriptions/:id/edit"
                    element={<PrescriptionEditPage />}
                />
            </Routes>
        </AuthProvider>
    );
}