import React from 'react';
import { Link } from 'react-router-dom';
import InventoryNav from './InventoryNav';

/**
 * Reusable page header primitive for MF-06 Inventory screens.
 * Encapsulates the standard breadcrumb navigation, page title, subtitle,
 * contextual action controls, and the inventory sub-module navigation bar.
 */
export default function InventoryPageHeader({
  title,
  subtitle,
  breadcrumb = { to: '/', label: '← Back to Home' },
  actions,
  showNav = true,
  children
}) {
  return (
    <header className="inventory-page-header" data-testid="inventory-page-header">
      {breadcrumb && (
        <nav className="inventory-nav" aria-label="Breadcrumb">
          <Link to={breadcrumb.to}>{breadcrumb.label}</Link>
        </nav>
      )}

      <div className="inventory-header">
        <div className="inventory-header-titles">
          <span className="inventory-header-eyebrow">Clinical Inventory Workspace</span>
          <h1>{title}</h1>
          {subtitle && (
            <p className="inventory-header-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="inventory-header-actions">{actions}</div>}
        {children}
      </div>

      {showNav && <InventoryNav />}
    </header>
  );
}
