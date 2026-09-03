import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import InventoryPlaceholderPage from './features/inventory/pages/InventoryPlaceholderPage';

function RootPage() {
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
        </ul>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootPage />} />
      <Route path="/inventory/*" element={<InventoryPlaceholderPage />} />
    </Routes>
  );
}
