import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getItemById, updateItem, InventoryApiError } from '../api/inventoryApi';
import InventoryItemForm from '../components/InventoryItemForm';
import '../inventory.css';

/**
 * Page for editing an existing inventory item's master data.
 * Item code and currentQuantity are immutable.
 */
export default function InventoryItemEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState({});
  const [serverErrorMessage, setServerErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);

    getItemById(id)
      .then((data) => {
        if (isMounted) {
          setItem(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err instanceof InventoryApiError && err.status === 404) {
            setNotFound(true);
          } else {
            setLoadError(err.message || 'Failed to load inventory item.');
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setServerFieldErrors({});
    setServerErrorMessage('');

    try {
      await updateItem(id, payload);
      navigate(`/inventory/items/${id}`);
    } catch (err) {
      if (err instanceof InventoryApiError) {
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setServerFieldErrors(err.fieldErrors);
          setServerErrorMessage(err.message || 'Validation failed. Please correct the highlighted errors.');
        } else {
          setServerErrorMessage(err.message || 'Failed to update inventory item.');
        }
      } else {
        setServerErrorMessage(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/inventory/items/${id}`);
  };

  if (loading) {
    return (
      <div className="inventory-container">
        <div className="loading-state" role="status">
          Loading item details...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="inventory-container">
        <nav className="inventory-nav" aria-label="Breadcrumb">
          <Link to="/inventory/items">← Back to Inventory Items</Link>
        </nav>
        <div className="empty-state" role="alert">
          <h2>Item Not Found</h2>
          <p>The inventory item you are trying to edit does not exist or has been removed.</p>
          <Link to="/inventory/items" className="btn btn-primary">
            Return to Inventory Catalog
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="inventory-container">
        <nav className="inventory-nav" aria-label="Breadcrumb">
          <Link to="/inventory/items">← Back to Inventory Items</Link>
        </nav>
        <div className="error-alert" role="alert">
          <p>{loadError}</p>
          <Link to="/inventory/items" className="btn btn-secondary btn-sm">
            Back to Items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-container">
      <nav className="inventory-nav" aria-label="Breadcrumb">
        <Link to={`/inventory/items/${id}`}>← Back to Item Detail</Link>
      </nav>

      <div className="inventory-header">
        <h1>Edit Inventory Item</h1>
      </div>

      <InventoryItemForm
        mode="edit"
        initialValues={item}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        serverFieldErrors={serverFieldErrors}
        serverErrorMessage={serverErrorMessage}
        submitting={submitting}
      />
    </div>
  );
}
