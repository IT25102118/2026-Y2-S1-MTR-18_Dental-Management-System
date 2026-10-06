import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItem, InventoryApiError } from '../api/inventoryApi';
import InventoryPageHeader from '../components/InventoryPageHeader';
import InventoryItemForm from '../components/InventoryItemForm';
import '../inventory.css';

/**
 * Page for registering a new inventory catalog item.
 */
export default function InventoryItemCreatePage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState({});
  const [serverErrorMessage, setServerErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (payload) => {
    if (submitting) return;
    setSubmitting(true);
    setServerFieldErrors({});
    setServerErrorMessage('');
    setSuccessMessage('');

    try {
      const created = await createItem(payload);
      setSuccessMessage('Item registered successfully.');
      navigate(`/inventory/items/${created.id}`, {
        state: { successMessage: 'Item registered successfully.' }
      });
    } catch (err) {
      if (err instanceof InventoryApiError) {
        if (err.status === 409) {
          // Conflict: duplicate item code
          setServerFieldErrors({
            itemCode: err.message || 'An inventory item with this code already exists'
          });
          setServerErrorMessage(err.message || 'Conflict: An item with this code already exists.');
        } else if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setServerFieldErrors(err.fieldErrors);
          setServerErrorMessage(err.message || 'Validation failed. Please correct the highlighted errors.');
        } else {
          setServerErrorMessage(err.message || 'Failed to create inventory item.');
        }
      } else {
        setServerErrorMessage(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/inventory/items');
  };

  return (
    <div className="inventory-container">
      <InventoryPageHeader
        title="Register New Inventory Item"
        breadcrumb={{ to: '/inventory/items', label: '← Back to Inventory Items' }}
        showNav={false}
      />

      {successMessage && (
        <div className="success-alert" role="status" aria-live="polite" data-testid="item-create-success">
          <div className="success-alert-content">
            <svg
              className="alert-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p>{successMessage}</p>
          </div>
          <button
            type="button"
            className="alert-dismiss-btn"
            onClick={() => setSuccessMessage('')}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <InventoryItemForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        serverFieldErrors={serverFieldErrors}
        serverErrorMessage={serverErrorMessage}
        submitting={submitting}
      />
    </div>
  );
}
