import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getExpiryAlerts } from '../api/alertApi';
import InventoryPagination from './InventoryPagination';

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultHorizonString(daysAhead = 30) {
  const target = new Date();
  target.setDate(target.getDate() + daysAhead);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ExpiryAlertsTable() {
  const todayStr = getTodayString();
  const [throughDate, setThroughDate] = useState(() => getDefaultHorizonString(30));
  const [dateInput, setDateInput] = useState(() => getDefaultHorizonString(30));
  const [dateValidationError, setDateValidationError] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    number: 0,
    size: 20,
    totalPages: 0,
    totalElements: 0,
    first: true,
    last: true,
    empty: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async (cutoffDate, pageNum = 0) => {
    if (!cutoffDate || cutoffDate < todayStr) {
      setDateValidationError('Cutoff date must be today or later.');
      setLoading(false);
      return;
    }
    setDateValidationError(null);
    setLoading(true);
    setError(null);

    try {
      const data = await getExpiryAlerts({
        through: cutoffDate,
        page: pageNum,
        size: 20,
        sort: 'expiryDate,asc'
      });
      setAlerts(data.content);
      setPageInfo({
        number: data.number,
        size: data.size,
        totalPages: data.totalPages,
        totalElements: data.totalElements,
        first: data.first,
        last: data.last,
        empty: data.empty
      });
    } catch (err) {
      setError(err.message || 'Failed to load expiry alerts.');
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    fetchAlerts(throughDate, 0);
  }, [fetchAlerts, throughDate]);

  const handleDateSubmit = (e) => {
    e.preventDefault();
    if (!dateInput) {
      setDateValidationError('Please select an expiry cutoff date.');
      return;
    }
    if (dateInput < todayStr) {
      setDateValidationError('Cutoff date must be today or later.');
      return;
    }
    setDateValidationError(null);
    setThroughDate(dateInput);
  };

  const handlePageChange = (newPage) => {
    fetchAlerts(throughDate, newPage);
  };

  const handleRetry = () => {
    fetchAlerts(throughDate, pageInfo.number);
  };

  return (
    <div className="alerts-table-container" data-testid="expiry-alerts-section">
      <div className="alerts-toolbar">
        <form onSubmit={handleDateSubmit} className="alerts-filter-form" aria-label="Expiry horizon selector">
          <label htmlFor="expiry-through-date" className="filter-label">
            Expiry Cutoff Date (through):
          </label>
          <input
            id="expiry-through-date"
            type="date"
            min={todayStr}
            className="form-control form-control-sm"
            value={dateInput}
            onChange={(e) => {
              setDateInput(e.target.value);
              if (dateValidationError) setDateValidationError(null);
            }}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
            Update Horizon
          </button>
        </form>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleRetry}
          disabled={loading}
        >
          Refresh Alerts
        </button>
      </div>

      {dateValidationError && (
        <div className="error-alert" role="region" aria-label="Date validation error">
          <p>{dateValidationError}</p>
        </div>
      )}

      {error && (
        <div className="error-alert" role="region" aria-label="Expiry alerts error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state" role="status">
          Loading expiry alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <p>
            No active batches are expired or expiring on or before{' '}
            <strong>{throughDate}</strong>.
          </p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="inventory-table alerts-table" aria-label="Expiry inventory alerts">
              <thead>
                <tr>
                  <th scope="col">Batch Number</th>
                  <th scope="col">Item Code & Name</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Expiry Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Days Remaining</th>
                  <th scope="col">Supplier Reference</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((batch) => {
                  const isExpired = batch.status === 'EXPIRED';
                  const days = batch.daysRemaining;

                  let daysText = '—';
                  if (days !== null && days !== undefined) {
                    if (days < 0) {
                      daysText = `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
                    } else if (days === 0) {
                      daysText = 'Expiring today';
                    } else {
                      daysText = `${days} day${days === 1 ? '' : 's'} remaining`;
                    }
                  }

                  return (
                    <tr key={batch.batchId}>
                      <td>
                        {batch.batchNumber ? (
                          <strong>{batch.batchNumber}</strong>
                        ) : (
                          <span className="unbatched-badge">Unbatched Stock</span>
                        )}
                      </td>
                      <td>
                        {batch.itemId ? (
                          <Link to={`/inventory/items/${batch.itemId}`} className="item-link">
                            <strong>{batch.itemName}</strong> ({batch.itemCode})
                          </Link>
                        ) : (
                          `${batch.itemName || '—'} (${batch.itemCode || '—'})`
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {batch.quantityOnHand} {batch.unit || ''}
                      </td>
                      <td>{batch.expiryDate || 'No expiry'}</td>
                      <td>
                        {isExpired ? (
                          <span className="expiry-alert-badge badge-expired-status">
                            [EXPIRED] Expired
                          </span>
                        ) : (
                          <span className="expiry-alert-badge badge-expiring-status">
                            [EXPIRING] Expiring Soon
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={isExpired ? 'days-expired' : 'days-expiring'}>
                          {daysText}
                        </span>
                      </td>
                      <td>{batch.supplierReference || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <InventoryPagination
            pageInfo={pageInfo}
            onPageChange={handlePageChange}
            disabled={loading}
          />
        </>
      )}
    </div>
  );
}
