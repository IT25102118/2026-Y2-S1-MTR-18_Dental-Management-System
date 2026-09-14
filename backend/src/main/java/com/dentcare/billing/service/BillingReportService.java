package com.dentcare.billing.service;

import com.dentcare.billing.dto.IncomeSummaryResponse;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Service interface governing daily and monthly clinic income summaries and financial reporting (MF-05 / FR-BIL-08).
 */
public interface BillingReportService {

    /**
     * Aggregates clinic income for a specific calendar day [startOfDay, nextDayStartOfDay).
     * Income is derived strictly from valid RECORDED payments; REVERSED payments are excluded.
     *
     * @param date target calendar date
     * @return income summary response with total and payment method breakdown
     */
    IncomeSummaryResponse getDailyIncomeSummary(LocalDate date);

    /**
     * Aggregates clinic income for a specific calendar month [startOfMonth, nextMonthStartOfMonth).
     * Income is derived strictly from valid RECORDED payments; REVERSED payments are excluded.
     *
     * @param month target calendar year-month
     * @return income summary response with total and payment method breakdown
     */
    IncomeSummaryResponse getMonthlyIncomeSummary(YearMonth month);
}
