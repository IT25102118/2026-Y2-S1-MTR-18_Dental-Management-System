import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IncomeReportsPage from '../pages/IncomeReportsPage';
import * as billingApi from '../api/billingApi';
import * as authApi from '../../auth/api/authApi';
import App from '../../../App';

vi.mock('../api/billingApi', async () => {
  const actual = await vi.importActual('../api/billingApi');
  return {
    ...actual,
    getDailyIncomeSummary: vi.fn(),
    getMonthlyIncomeSummary: vi.fn(),
    getInvoicePayments: vi.fn()
  };
});

vi.mock('../../auth/api/authApi', async () => {
  const actual = await vi.importActual('../../auth/api/authApi');
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    getCsrfToken: vi.fn().mockResolvedValue({ token: 'test-csrf', headerName: 'X-XSRF-TOKEN' }),
    login: vi.fn(),
    logout: vi.fn().mockResolvedValue(true)
  };
});

describe('Staff Daily & Monthly Income Reports UI (UI-BIL-05)', () => {
  const sampleDailySummary = {
    startDate: '2026-09-15',
    endDate: '2026-09-15',
    totalIncome: 450.00,
    breakdownByMethod: {
      CASH: 200.00,
      CARD: 150.00,
      BANK_TRANSFER: 100.00,
      OTHER: 0.00
    }
  };

  const sampleZeroDailySummary = {
    startDate: '2026-09-16',
    endDate: '2026-09-16',
    totalIncome: 0.00,
    breakdownByMethod: {
      CASH: 0.00,
      CARD: 0.00,
      BANK_TRANSFER: 0.00,
      OTHER: 0.00
    }
  };

  const sampleMonthlySummary = {
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    totalIncome: 3500.00,
    breakdownByMethod: {
      CASH: 1200.00,
      CARD: 1500.00,
      BANK_TRANSFER: 700.00,
      OTHER: 100.00
    }
  };

  const sampleZeroMonthlySummary = {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    totalIncome: 0.00,
    breakdownByMethod: {
      CASH: 0.00,
      CARD: 0.00,
      BANK_TRANSFER: 0.00,
      OTHER: 0.00
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    billingApi.getDailyIncomeSummary.mockReset();
    billingApi.getMonthlyIncomeSummary.mockReset();
    billingApi.getInvoicePayments.mockReset();
  });

  // ==========================================
  // ROUTING & ROLE ACCESS (1-6)
  // ==========================================
  describe('ROUTING & ROLE ACCESS', () => {
    it('1. staff report route renders for authenticated staff', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: 'ADMINISTRATOR',
        email: 'admin@dentcare.com'
      });
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter initialEntries={['/billing/reports']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('income-reports-page')).toBeInTheDocument();
      });
    });

    it('2. ADMINISTRATOR allowed to access reports route', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: 'ADMINISTRATOR',
        email: 'admin@dentcare.com'
      });
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter initialEntries={['/billing/reports']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Income Reports/i)).toBeInTheDocument();
      });
    });

    it('3. RECEPTIONIST allowed to access reports route', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 2,
        role: 'RECEPTIONIST',
        email: 'reception@dentcare.com'
      });
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter initialEntries={['/billing/reports']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Income Reports/i)).toBeInTheDocument();
      });
    });

    it('4. PATIENT denied access and redirected away', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 5,
        role: 'PATIENT',
        email: 'patient@dentcare.com'
      });

      render(
        <MemoryRouter initialEntries={['/billing/reports']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('patient-dashboard')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('income-reports-page')).not.toBeInTheDocument();
    });

    it('5. DENTIST denied access and redirected away', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 3,
        role: 'DENTIST',
        email: 'dentist@dentcare.com'
      });

      render(
        <MemoryRouter initialEntries={['/billing/reports']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Dental Practice Management System/i)).toBeInTheDocument();
      });
      expect(screen.queryByTestId('income-reports-page')).not.toBeInTheDocument();
    });

    it('6. DENTAL_ASSISTANT denied access and redirected away', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 4,
        role: 'DENTAL_ASSISTANT',
        email: 'assistant@dentcare.com'
      });

      render(
        <MemoryRouter initialEntries={['/billing/reports']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Dental Practice Management System/i)).toBeInTheDocument();
      });
      expect(screen.queryByTestId('income-reports-page')).not.toBeInTheDocument();
    });
  });

  // ==========================================
  // DAILY INCOME REPORT (7-20)
  // ==========================================
  describe('DAILY INCOME REPORT', () => {
    it('7. daily mode button available and active by default', () => {
      billingApi.getDailyIncomeSummary.mockReturnValueOnce(new Promise(() => {}));

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      const dailyBtn = screen.getByTestId('mode-daily-btn');
      expect(dailyBtn).toBeInTheDocument();
      expect(dailyBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('8. daily date input renders with label "Report Date"', () => {
      billingApi.getDailyIncomeSummary.mockReturnValueOnce(new Promise(() => {}));

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/report date/i)).toBeInTheDocument();
    });

    it('9-10. valid date calls getDailyIncomeSummary(date) with exact YYYY-MM-DD string', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('report-total-income')).toBeInTheDocument();
      });

      const dateInput = screen.getByLabelText(/report date/i);
      fireEvent.change(dateInput, { target: { value: '2026-09-15' } });

      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      fireEvent.click(screen.getByTestId('generate-report-btn'));

      await waitFor(() => {
        expect(billingApi.getDailyIncomeSummary).toHaveBeenCalledWith('2026-09-15');
      });
    });

    it('11. total income renders correctly', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('report-total-income')).toHaveTextContent('450.00');
      });
    });

    it('12. start date renders if DTO exposes it', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('report-start-date')).toHaveTextContent('2026-09-15');
      });
    });

    it('13. end date renders if DTO exposes it', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('report-end-date')).toHaveTextContent('2026-09-15');
      });
    });

    it('14. CASH value renders in breakdown', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('method-amount-CASH')).toHaveTextContent('200.00');
      });
    });

    it('15. CARD value renders in breakdown', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('method-amount-CARD')).toHaveTextContent('150.00');
      });
    });

    it('16. BANK_TRANSFER value renders in breakdown', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('method-amount-BANK_TRANSFER')).toHaveTextContent('100.00');
      });
    });

    it('17. OTHER value renders in breakdown', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('method-amount-OTHER')).toHaveTextContent('0.00');
      });
    });

    it('18. zero daily summary displays correctly with zero message and amounts', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleZeroDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('report-total-income')).toHaveTextContent('0.00');
      });
      expect(screen.getByTestId('zero-income-message')).toBeInTheDocument();
      expect(screen.getByTestId('method-amount-CASH')).toHaveTextContent('0.00');
    });

    it('19. loading state displays while fetching daily report', async () => {
      billingApi.getDailyIncomeSummary.mockReturnValueOnce(new Promise(() => {}));

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      expect(screen.getByTestId('reports-loading')).toBeInTheDocument();
    });

    it('20. daily API failure displays safe error message without crashing', async () => {
      const err = new Error('Daily report endpoint unavailable');
      billingApi.getDailyIncomeSummary.mockRejectedValueOnce(err);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('reports-error')).toHaveTextContent(/daily report endpoint unavailable/i);
      });
    });
  });

  // ==========================================
  // MONTHLY INCOME REPORT (21-30)
  // ==========================================
  describe('MONTHLY INCOME REPORT', () => {
    it('21. monthly mode available and selectable', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockResolvedValueOnce(sampleMonthlySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mode-monthly-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      expect(screen.getByTestId('mode-monthly-btn')).toHaveAttribute('aria-pressed', 'true');
    });

    it('22. month input renders with label "Report Month"', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockResolvedValueOnce(sampleMonthlySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      await waitFor(() => {
        expect(screen.getByLabelText(/report month/i)).toBeInTheDocument();
      });
    });

    it('23-24. valid month calls getMonthlyIncomeSummary(month) with exact YYYY-MM string', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockResolvedValueOnce(sampleMonthlySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      await waitFor(() => {
        expect(screen.getByLabelText(/report month/i)).toBeInTheDocument();
        expect(screen.getByTestId('report-total-income')).toBeInTheDocument();
      });

      const monthInput = screen.getByLabelText(/report month/i);
      fireEvent.change(monthInput, { target: { value: '2026-09' } });

      billingApi.getMonthlyIncomeSummary.mockResolvedValueOnce(sampleMonthlySummary);
      fireEvent.click(screen.getByTestId('generate-report-btn'));

      await waitFor(() => {
        expect(billingApi.getMonthlyIncomeSummary).toHaveBeenCalledWith('2026-09');
      });
    });

    it('25. total income renders in monthly mode', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockResolvedValueOnce(sampleMonthlySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('report-total-income')).toHaveTextContent('3500.00');
      });
    });

    it('26. start/end dates render if exposed in monthly DTO', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockResolvedValueOnce(sampleMonthlySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('report-start-date')).toHaveTextContent('2026-09-01');
      });
      expect(screen.getByTestId('report-end-date')).toHaveTextContent('2026-09-30');
    });

    it('27. all four payment methods render in monthly breakdown', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockResolvedValueOnce(sampleMonthlySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('method-amount-CASH')).toHaveTextContent('1200.00');
      });
      expect(screen.getByTestId('method-amount-CARD')).toHaveTextContent('1500.00');
      expect(screen.getByTestId('method-amount-BANK_TRANSFER')).toHaveTextContent('700.00');
      expect(screen.getByTestId('method-amount-OTHER')).toHaveTextContent('100.00');
    });

    it('28. zero monthly summary displays correctly', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockResolvedValueOnce(sampleZeroMonthlySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('report-total-income')).toHaveTextContent('0.00');
      });
      expect(screen.getByTestId('zero-income-message')).toBeInTheDocument();
    });

    it('29. loading state displays while monthly report is pending', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockReturnValueOnce(new Promise(() => {}));

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mode-monthly-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      expect(screen.getByTestId('reports-loading')).toBeInTheDocument();
    });

    it('30. monthly API failure displays safe error', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      const err = new Error('Failed to load monthly income report');
      billingApi.getMonthlyIncomeSummary.mockRejectedValueOnce(err);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mode-monthly-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('reports-error')).toHaveTextContent(/failed to load monthly income report/i);
      });
    });
  });

  // ==========================================
  // MODE SWITCHING & STATE ISOLATION (31-32)
  // ==========================================
  describe('MODE SWITCHING', () => {
    it('31. switching daily -> monthly does not display stale daily values', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockReturnValueOnce(new Promise(() => {})); // pending monthly

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('report-total-income')).toHaveTextContent('450.00');
      });

      // Switch to monthly
      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      // Daily 450.00 must NOT be visible under monthly mode
      expect(screen.queryByTestId('report-total-income')).not.toBeInTheDocument();
      expect(screen.getByTestId('reports-loading')).toBeInTheDocument();
    });

    it('32. switching monthly -> daily does not display stale monthly values', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      billingApi.getMonthlyIncomeSummary.mockResolvedValueOnce(sampleMonthlySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      // Switch to monthly
      fireEvent.click(screen.getByTestId('mode-monthly-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('report-total-income')).toHaveTextContent('3500.00');
      });

      // Switch back to daily while daily is pending
      billingApi.getDailyIncomeSummary.mockReturnValueOnce(new Promise(() => {}));
      fireEvent.click(screen.getByTestId('mode-daily-btn'));

      // Monthly 3500.00 must NOT be visible
      expect(screen.queryByTestId('report-total-income')).not.toBeInTheDocument();
      expect(screen.getByTestId('reports-loading')).toBeInTheDocument();
    });
  });

  // ==========================================
  // BOUNDARIES & CONSTRAINTS (33-42)
  // ==========================================
  describe('BOUNDARIES & CONSTRAINTS', () => {
    it('33. no custom date-range inputs present', () => {
      billingApi.getDailyIncomeSummary.mockReturnValueOnce(new Promise(() => {}));

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      expect(screen.queryByLabelText(/custom start date/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/custom end date/i)).not.toBeInTheDocument();
    });

    it('34-36. no export buttons present (CSV, PDF, Excel)', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('income-reports-page')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /export csv/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /export pdf/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /export excel/i })).not.toBeInTheDocument();
    });

    it('37. does not call getInvoicePayments to aggregate history locally', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('income-reports-page')).toBeInTheDocument();
      });

      expect(billingApi.getInvoicePayments).not.toHaveBeenCalled();
    });

    it('38. does not invoke direct global fetch outside repository API client', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('income-reports-page')).toBeInTheDocument();
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('39. does not perform local financial summing: passes backend DTO total directly', async () => {
      const customReport = {
        startDate: '2026-09-15',
        endDate: '2026-09-15',
        totalIncome: 999.99,
        breakdownByMethod: {
          CASH: 10.00,
          CARD: 20.00,
          BANK_TRANSFER: 30.00,
          OTHER: 40.00
        }
      };
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(customReport);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('report-total-income')).toHaveTextContent('999.99');
      });
    });

    it('40. does not invent currency symbol or code', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('report-total-income')).toHaveTextContent(/^450\.00$/);
      });
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/USD/)).not.toBeInTheDocument();
      expect(screen.queryByText(/LKR/)).not.toBeInTheDocument();
    });

    it('41. does not render Patient reporting controls or data', async () => {
      billingApi.getDailyIncomeSummary.mockResolvedValueOnce(sampleDailySummary);

      render(
        <MemoryRouter>
          <IncomeReportsPage />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('income-reports-page')).toBeInTheDocument();
      });

      expect(screen.queryByText(/patient statement/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/patient report/i)).not.toBeInTheDocument();
    });

    it('42. does not introduce chart dependencies', () => {
      expect(window).not.toHaveProperty('Chart');
      expect(window).not.toHaveProperty('Recharts');
    });
  });

  // ==========================================
  // NAVIGATION (43-44)
  // ==========================================
  describe('NAVIGATION', () => {
    it('43. staff navigation shows Income Reports link for ADMINISTRATOR / RECEPTIONIST', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 1,
        role: 'ADMINISTRATOR',
        email: 'admin@dentcare.com',
        firstName: 'Admin',
        lastName: 'User'
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /income reports/i })).toBeInTheDocument();
      });
    });

    it('44. non-staff navigation hides Income Reports link for PATIENT', async () => {
      authApi.getCurrentUser.mockResolvedValueOnce({
        id: 5,
        role: 'PATIENT',
        email: 'patient@dentcare.com',
        firstName: 'Patient',
        lastName: 'User'
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/My Account/i)).toBeInTheDocument();
      });

      expect(screen.queryByRole('link', { name: /income reports/i })).not.toBeInTheDocument();
    });
  });
});
