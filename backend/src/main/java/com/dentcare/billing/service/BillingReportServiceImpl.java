package com.dentcare.billing.service;

import com.dentcare.billing.dto.IncomeSummaryResponse;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;

/**
 * Production implementation of {@link BillingReportService} providing authoritative
 * daily and monthly income summaries (FR-BIL-08).
 * Strictly read-only: aggregates clinic income directly from valid RECORDED payments.
 */
@Service
@Transactional(readOnly = true)
public class BillingReportServiceImpl implements BillingReportService {

    private final PaymentRepository paymentRepository;
    private final BillingCalculationService billingCalculationService;

    public BillingReportServiceImpl(PaymentRepository paymentRepository,
                                   BillingCalculationService billingCalculationService) {
        this.paymentRepository = paymentRepository;
        this.billingCalculationService = billingCalculationService;
    }

    @Override
    public IncomeSummaryResponse getDailyIncomeSummary(LocalDate date) {
        if (date == null) {
            throw new BillingValidationException("Date is required for daily income summary");
        }

        LocalDateTime startDateTime = date.atStartOfDay();
        LocalDateTime endDateTime = date.plusDays(1).atStartOfDay();

        return computeSummary(date, date, startDateTime, endDateTime);
    }

    @Override
    public IncomeSummaryResponse getMonthlyIncomeSummary(YearMonth month) {
        if (month == null) {
            throw new BillingValidationException("Month is required for monthly income summary");
        }

        LocalDate startDate = month.atDay(1);
        LocalDate endDate = month.atEndOfMonth();
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = month.plusMonths(1).atDay(1).atStartOfDay();

        return computeSummary(startDate, endDate, startDateTime, endDateTime);
    }

    private IncomeSummaryResponse computeSummary(LocalDate startDate,
                                                 LocalDate endDate,
                                                 LocalDateTime startDateTime,
                                                 LocalDateTime endDateTime) {
        BigDecimal rawTotal = paymentRepository.sumRecordedPaymentsInPeriod(startDateTime, endDateTime);
        BigDecimal totalIncome = billingCalculationService.normalizePaidAmount(rawTotal);

        Map<PaymentMethod, BigDecimal> breakdown = new EnumMap<>(PaymentMethod.class);
        for (PaymentMethod method : PaymentMethod.values()) {
            BigDecimal rawMethodSum = paymentRepository.sumRecordedPaymentsByMethodInPeriod(method, startDateTime, endDateTime);
            breakdown.put(method, billingCalculationService.normalizePaidAmount(rawMethodSum));
        }

        return new IncomeSummaryResponse(
                startDate,
                endDate,
                totalIncome,
                Collections.unmodifiableMap(breakdown)
        );
    }
}