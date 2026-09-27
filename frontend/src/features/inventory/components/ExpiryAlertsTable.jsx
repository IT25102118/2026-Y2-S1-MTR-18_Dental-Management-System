import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Calendar,
  Package,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Building2
} from 'lucide-react';
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

  const handlePresetSelect = (days) => {
    const newDate = getDefaultHorizonString(days);
    setDateInput(newDate);
    setDateValidationError(null);
    setThroughDate(newDate);
  };

  const handlePageChange = (newPage) => {
    fetchAlerts(throughDate, newPage);
  };

  const handleRetry = () => {
    fetchAlerts(throughDate, pageInfo.number);
  };

  const expiredCount = alerts.filter((b) => b.status === 'EXPIRED').length;
  const expiringCount = alerts.filter((b) => b.status !== 'EXPIRED').length;

  return (
    <div className="alerts-table-container" data-testid="expiry-alerts-section">
      {/* Alert Summary Snapshot when alerts exist */}
      {!loading && !error && alerts.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '1rem',
            padding: '0.625rem 0.875rem',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '0.8125rem'
          }}
        >
          <span style={{ fontWeight: 600, color: '#475569' }}>Batch Expiry Status:</span>
          {expiredCount > 0 && (
            <span className="expiry-alert-badge badge-expired-status">
              {expiredCount} {expiredCount === 1 ? 'Batch' : 'Batches'} Expired
            </span>
          )}
          {expiringCount > 0 && (
            <span className="expiry-alert-badge badge-expiring-status">
              {expiringCount} {expiringCount === 1 ? 'Batch' : 'Batches'} Expiring Soon
            </span>
          )}
          <span style={{ marginLeft: 'auto', color: '#64748b' }}>
            Horizon Cutoff: <strong style={{ color: '#0f172a' }}>{throughDate}</strong>
          </span>
        </div>
      )}

      <div className="alerts-toolbar">
        <div className="expiry-controls-wrapper">
          <div className="expiry-presets-group" role="group" aria-label="Expiry horizon presets">
            <span className="presets-label">Horizon:</span>
            {[7, 30, 60, 90].map((days) => {
              const presetDate = getDefaultHorizonString(days);
              const isActive = throughDate === presetDate;
              return (
                <button
                  key={days}
                  type="button"
                  className={`preset-btn ${isActive ? 'active' : ''}`}
                  onClick={() => handlePresetSelect(days)}
                  disabled={loading}
                  aria-pressed={isActive}
                >
                  {days} Days
                </button>
              );
            })}
          </div>

          <form onSubmit={handleDateSubmit} className="alerts-filter-form" aria-label="Expiry horizon selector">
            <label htmlFor="expiry-through-date" className="filter-label">
              Expiry Cutoff Date (through):
            </label>
            <div className="alerts-filter-input-wrap">
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
                style={{ minWidth: '150px' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              Update Horizon
            </button>
          </form>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleRetry}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
        >
          <RefreshCw size={13} className={loading ? 'spin-icon' : ''} aria-hidden="true" />
          <span>Refresh Alerts</span>
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
        <div className="alerts-empty-state-modern empty-state">
          <div className="empty-state-icon-box icon-healthy" aria-hidden="true">
            <ShieldCheck size={28} />
          </div>
          <h3 className="alerts-empty-title">All Batches Within Safe Dates</h3>
          <p className="alerts-empty-desc">
            No active batches are expired or expiring on or before{' '}
            <strong>{throughDate}</strong>.
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              fontSize: '0.8125rem',
              fontWeight: 600
            }}
          >
            <span>✓ 100% Shelf-Life Compliant</span>
          </div>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="inventory-table alerts-table" aria-label="Expiry inventory alerts">
              <thead>
                <tr>
                  <th scope="col">Batch Number</th>
                  <th scope="col">Item Code & Name</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Quantity</th>
                  <th scope="col">Expiry Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Days Remaining</th>
                  <th scope="col">Supplier Reference</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
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

                  const daysClass = isExpired
                    ? 'days-expired'
                    : days === 0
                    ? 'days-expiring-today'
                    : 'days-expiring';

                  return (
                    <tr key={batch.batchId}>
                      <td>
                        {batch.batchNumber ? (
                          <strong className="inv-mono inv-mono-badge">{batch.batchNumber}</strong>
                        ) : (
                          <span className="unbatched-badge">Unbatched Stock</span>
                        )}
                      </td>
                      <td>
                        {batch.itemId ? (
                          <Link to={`/inventory/items/${batch.itemId}`} className="item-link">
                            <div className="item-link-wrap">
                              <div className="item-icon-box" aria-hidden="true">
                                <Package size={16} />
                              </div>
                              <div>
                                <strong className="item-title-text">{batch.itemName}</strong>{' '}
                                <span className="inv-mono inv-mono-badge">({batch.itemCode})</span>
                              </div>
                            </div>
                          </Link>
                        ) : (
                          <div className="item-link-wrap">
                            <div className="item-icon-box" aria-hidden="true">
                              <Package size={16} />
                            </div>
                            <div>
                              <span>{batch.itemName || '—'}</span>{' '}
                              <span className="inv-mono inv-mono-badge">({batch.itemCode || '—'})</span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ fontWeight: 600, textAlign: 'right' }} className="tabular-nums">
                        {batch.quantityOnHand} {batch.unit || ''}
                      </td>
                      <td className="tabular-nums">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Calendar size={13} style={{ color: '#94a3b8' }} aria-hidden="true" />
                          <span>{batch.expiryDate || 'No expiry'}</span>
                        </span>
                      </td>
                      <td>
                        {isExpired ? (
                          <span className="expiry-alert-badge badge-expired-status">
                            [EXPIRED] Expired
                          </span>
                        ) : days === 0 ? (
                          <span className="expiry-alert-badge badge-expiring-today-status">
                            [EXPIRING] Expiring Today
                          </span>
                        ) : (
                          <span className="expiry-alert-badge badge-expiring-status">
                            [EXPIRING] Expiring Soon
                          </span>
                        )}
                      </td>
                      <td className="tabular-nums">
                        <span className={daysClass}>
                          {daysText}
                        </span>
                      </td>
                      <td>
                        {batch.supplierReference ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#475569', fontSize: '0.8125rem' }}>
                            <Building2 size={13} style={{ color: '#94a3b8' }} aria-hidden="true" />
                            <span>{batch.supplierReference}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {batch.itemId && (
                          <Link
                            to={`/inventory/items/${batch.itemId}`}
                            className="btn btn-secondary btn-sm"
                            aria-label={`View details for ${batch.itemName}`}
                          >
                            View Item
                          </Link>
                        )}
                      </td>
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
