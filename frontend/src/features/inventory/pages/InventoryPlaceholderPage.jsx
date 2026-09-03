import React from 'react';
import { Link } from 'react-router-dom';

export default function InventoryPlaceholderPage() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <nav style={{ marginBottom: '1rem' }}>
        <Link to="/">← Back to Home</Link>
      </nav>
      <header>
        <h1>Inventory Management</h1>
        <p>Inventory management runtime initialized. Catalog management will be implemented in F1.</p>
      </header>
    </div>
  );
}
