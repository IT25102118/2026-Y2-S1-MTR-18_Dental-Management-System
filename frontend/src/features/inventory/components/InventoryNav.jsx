import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function InventoryNav() {
  const location = useLocation();
  const path = location.pathname;

  const isOverview = path === '/inventory' || path === '/inventory/';
  const isItems = path.startsWith('/inventory/items');
  const isBatches = path.startsWith('/inventory/batches');
  const isAlerts = path.startsWith('/inventory/alerts');

  return (
    <nav className="inventory-module-nav" aria-label="Inventory module navigation">
      <Link
        to="/inventory"
        className={`inv-nav-link ${isOverview ? 'active' : ''}`}
        aria-current={isOverview ? 'page' : undefined}
      >
        Overview
      </Link>
      <Link
        to="/inventory/items"
        className={`inv-nav-link ${isItems ? 'active' : ''}`}
        aria-current={isItems ? 'page' : undefined}
      >
        Items
      </Link>
      <Link
        to="/inventory/batches"
        className={`inv-nav-link ${isBatches ? 'active' : ''}`}
        aria-current={isBatches ? 'page' : undefined}
      >
        Batches
      </Link>
      <Link
        to="/inventory/alerts"
        className={`inv-nav-link ${isAlerts ? 'active' : ''}`}
        aria-current={isAlerts ? 'page' : undefined}
      >
        Alerts
      </Link>
    </nav>
  );
}
