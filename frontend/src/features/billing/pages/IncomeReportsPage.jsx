import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDailyIncomeSummary, getMonthlyIncomeSummary, BillingApiError } from '../api/billingApi';
import '../billing.css';

/**
 * Format numeric amount safely to 2 decimal places without inventing currency codes/symbols.
 */
function formatAmount(val) {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0.00';
  }
  return Number(val).toFixed(2);
}

/**
 * MF-05 UI-BIL-05 Staff Daily & Monthly Income Reports Page.
 * Consumes authoritative daily and monthly income summary APIs without client-side recalculation.
 * Exposes totals and payment-method breakdowns for ADMINISTRATOR and RECEPTIONIST.
 */
export default function IncomeReportsPage() {
  const [mode, setMode] = useState('daily'); // 'daily' | 'monthly'

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDailyReport = async (dateToFetch) => {
    if (!dateToFetch) {
      setError('Please select a valid report date.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getDailyIncomeSummary(dateToFetch);
      setReport(data);
    } catch (err) {
      if (err instanceof BillingApiError) {
        setError(err.message || 'Failed to load daily income report.');
      } else {
        setError(err?.message || 'Failed to load daily income report. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async (monthToFetch) => {
    if (!monthToFetch) {
      setError('Please select a valid report month.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getMonthlyIncomeSummary(monthToFetch);
      setReport(data);
    } catch (err) {
      if (err instanceof BillingApiError) {
        setError(err.message || 'Failed to load monthly income report.');
      } else {
        setError(err?.message || 'Failed to load monthly income report. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load on mount
  useEffect(() => {
    fetchDailyReport(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setReport(null); // Clear previous report data to prevent displaying stale values
    setError(null);

    if (newMode === 'daily') {
      fetchDailyReport(selectedDate);
    } else {
      fetchMonthlyReport(selectedMonth);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'daily') {
      fetchDailyReport(selectedDate);
    } else {
      fetchMonthlyReport(selectedMonth);
    }
  };

  return (
    <div className="billing-container" data-testid="income-reports-page">
      <nav className="billing-nav" aria-label="Breadcrumb">
        <Link to="/billing/invoices">← Back to Invoices</Link>
      </nav>

      <div className="billing-header">
        <div>
          <h1>Income Reports</h1>
          <p className="text-muted">
            Authoritative revenue summaries from recorded payments
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="report-mode-toggle" role="group" aria-label="Report Mode">
        <button
          type="button"
          className={`btn ${mode === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleModeChange('daily')}
          aria-pressed={mode === 'daily'}
          data-testid="mode-daily-btn"
        >
          Daily Report
        </button>
        <button
          type="button"
          className={`btn ${mode === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => handleModeChange('monthly')}
          aria-pressed={mode === 'monthly'}
          data-testid="mode-monthly-btn"
        >
          Monthly Report
        </button>
      </div>

      {/* Filter / Selection Form */}
      <div className="filter-card" style={{ marginTop: '1rem' }}>
        <form onSubmit={handleSubmit} className="filter-form">
          {mode === 'daily' ? (
            <div className="form-group">
              <label htmlFor="report-date">Report Date</label>
              <input
                type="date"
                id="report-date"
                name="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="report-month">Report Month</label>
              <input
                type="month"
                id="report-month"
                name="month"
                className="form-input"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                disabled={loading}
                required
              />
            </div>
          )}

          <div className="filter-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              data-testid="generate-report-btn"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </form>
      </div>

      {/* Error Feedback */}
      {error && (
        <div className="error-alert" role="alert" data-testid="reports-error">
          <p>{error}</p>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="loading-state" role="status" data-testid="reports-loading">
          Loading report...
        </div>
      )}

      {/* Report Presentation */}
      {!loading && report && (
        <div data-testid="report-results">
          {/* Period & Total Summary Card */}
          <div className="detail-card" style={{ marginTop: '1.5rem' }}>
            <h2>{mode === 'daily' ? 'Daily Income Summary' : 'Monthly Income Summary'}</h2>
            
            <div className="detail-grid" style={{ marginBottom: '1.25rem' }}>
              {report.startDate && (
                <div className="detail-item">
                  <span className="detail-label">Period Start</span>
                  <span className="detail-value" data-testid="report-start-date">{report.startDate}</span>
                </div>
              )}
              {report.endDate && (
                <div className="detail-item">
                  <span className="detail-label">Period End</span>
                  <span className="detail-value" data-testid="report-end-date">{report.endDate}</span>
                </div>
              )}
            </div>

            <div className="financial-summary-grid">
              <div className="financial-stat-card">
                <span className="stat-label">Total Income</span>
                <span className="stat-value" data-testid="report-total-income">
                  {formatAmount(report.totalIncome)}
                </span>
              </div>
            </div>

            {Number(report.totalIncome) === 0 && (
              <p className="text-muted" data-testid="zero-income-message" style={{ fontStyle: 'italic', marginTop: '1rem', marginBottom: 0 }}>
                No recorded income for this reporting period.
              </p>
            )}
          </div>

          {/* Payment Method Breakdown Card */}
          <div className="detail-card">
            <h2>Payment Method Breakdown</h2>
            <div className="table-responsive">
              <table className="billing-table" aria-label="Payment method breakdown table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '60%' }}>Payment Method</th>
                    <th scope="col" className="amount-header" style={{ width: '40%' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <span style={{ fontWeight: 600 }}>Cash</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                        (CASH)
                      </span>
                    </td>
                    <td className="amount-cell" data-testid="method-amount-CASH">
                      {formatAmount(report.breakdownByMethod?.CASH ?? 0)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span style={{ fontWeight: 600 }}>Card</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                        (CARD)
                      </span>
                    </td>
                    <td className="amount-cell" data-testid="method-amount-CARD">
                      {formatAmount(report.breakdownByMethod?.CARD ?? 0)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span style={{ fontWeight: 600 }}>Bank Transfer</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                        (BANK_TRANSFER)
                      </span>
                    </td>
                    <td className="amount-cell" data-testid="method-amount-BANK_TRANSFER">
                      {formatAmount(report.breakdownByMethod?.BANK_TRANSFER ?? 0)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span style={{ fontWeight: 600 }}>Other</span>
                      <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                        (OTHER)
                      </span>
                    </td>
                    <td className="amount-cell" data-testid="method-amount-OTHER">
                      {formatAmount(report.breakdownByMethod?.OTHER ?? 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
