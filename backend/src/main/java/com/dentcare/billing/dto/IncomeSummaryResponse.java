package com.dentcare.billing.dto;

import com.dentcare.billing.entity.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Map;

/**
 * Response contract representing aggregated income for a specified reporting period (FR-BIL-08).
 * Pure data contract; no calculations performed in DTO.
 */
public record IncomeSummaryResponse(
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal totalIncome,
        Map<PaymentMethod, BigDecimal> breakdownByMethod
) {
    public IncomeSummaryResponse(LocalDate startDate, LocalDate endDate, BigDecimal totalIncome) {
        this(startDate, endDate, totalIncome, Collections.emptyMap());
    }
}
