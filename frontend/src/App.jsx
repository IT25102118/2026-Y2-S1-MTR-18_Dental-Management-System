import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import InventoryItemsPage from './features/inventory/pages/InventoryItemsPage';
import InventoryItemCreatePage from './features/inventory/pages/InventoryItemCreatePage';
import InventoryItemDetailPage from './features/inventory/pages/InventoryItemDetailPage';
import InventoryItemEditPage from './features/inventory/pages/InventoryItemEditPage';
import InventoryBatchesPage from './features/inventory/pages/InventoryBatchesPage';
import InventoryAlertsPage from './features/inventory/pages/InventoryAlertsPage';

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
      <Route path="/inventory" element={<Navigate to="/inventory/items" replace />} />
      <Route path="/inventory/items" element={<InventoryItemsPage />} />
      <Route path="/inventory/items/new" element={<InventoryItemCreatePage />} />
      <Route path="/inventory/items/:id" element={<InventoryItemDetailPage />} />
      <Route path="/inventory/items/:id/edit" element={<InventoryItemEditPage />} />
      <Route path="/inventory/batches" element={<InventoryBatchesPage />} />
      <Route path="/inventory/alerts" element={<InventoryAlertsPage />} />
    </Routes>
  );
}
