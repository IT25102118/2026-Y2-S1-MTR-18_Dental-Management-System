package com.dentcare.billing.controller;

import com.dentcare.billing.dto.IncomeSummaryResponse;
import com.dentcare.billing.service.BillingReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * REST controller providing daily and monthly clinic income summaries (MF-05 / FR-BIL-08).
 * Thin, read-only controller layer: delegates reporting aggregation to {@link BillingReportService}.
 */
@RestController
@RequestMapping("/api/billing/reports")
public class BillingReportController {

    private final BillingReportService billingReportService;

    public BillingReportController(BillingReportService billingReportService) {
        this.billingReportService = billingReportService;
    }

    @GetMapping({"/income/daily", "/daily-summary"})
    public ResponseEntity<IncomeSummaryResponse> getDailyIncomeSummary(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(billingReportService.getDailyIncomeSummary(date));
    }

    @GetMapping({"/income/monthly", "/monthly-summary"})
    public ResponseEntity<IncomeSummaryResponse> getMonthlyIncomeSummary(
            @RequestParam("month") @DateTimeFormat(pattern = "yyyy-MM") YearMonth month
    ) {
        return ResponseEntity.ok(billingReportService.getMonthlyIncomeSummary(month));
    }
}
