import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';

/**
 * Top navigation sub-bar for Prescription Management.
 */
export default function PrescriptionNav() {
    const location = useLocation();
    let authUser = null;
    try {
        const auth = useAuth();
        authUser = auth?.user || null;
    } catch {
        authUser = null;
    }
    const isDentist = authUser?.role === 'DENTIST';

    const isList = location.pathname === '/prescriptions';
    const isNew = location.pathname === '/prescriptions/new';

    const baseButtonStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.55rem 0.9rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        fontWeight: 600,
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap'
    };

    const homeStyle = {
        ...baseButtonStyle,
        color: '#334155',
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1'
    };

    const listStyle = {
        ...baseButtonStyle,
        color: isList ? '#ffffff' : '#334155',
        backgroundColor: isList ? '#0f172a' : '#ffffff',
        border: isList
            ? '1px solid #0f172a'
            : '1px solid #cbd5e1'
    };

    const newStyle = {
        ...baseButtonStyle,
        color: '#ffffff',
        backgroundColor: isNew ? '#1d4ed8' : '#2563eb',
        border: '1px solid #2563eb',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    };

    return (
        <nav
            className="prescription-nav"
            aria-label="Prescription navigation"
            style={{
                marginBottom: '1.5rem'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}
            >
                <Link
                    to="/"
                    style={homeStyle}
                >
                    ← Back to Home
                </Link>

                <Link
                    to="/prescriptions"
                    style={listStyle}
                    aria-current={isList ? 'page' : undefined}
                >
                    All Prescriptions
                </Link>

                {isDentist && (
                    <Link
                        to="/prescriptions/new"
                        style={newStyle}
                        aria-current={isNew ? 'page' : undefined}
                    >
                        + New Prescription
                    </Link>
                )}
            </div>
        </nav>
    );
}