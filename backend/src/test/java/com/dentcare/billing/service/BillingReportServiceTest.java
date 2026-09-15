package com.dentcare.billing.service;

import com.dentcare.billing.dto.IncomeSummaryResponse;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingReportServiceTest {

    @Mock
    private PaymentRepository paymentRepository;

    private BillingCalculationService billingCalculationService;
    private BillingReportServiceImpl billingReportService;

    @BeforeEach
    void setUp() {
        billingCalculationService = new BillingCalculationService();
        billingReportService = new BillingReportServiceImpl(paymentRepository, billingCalculationService);
    }

    @Test
    @DisplayName("1. Daily income summary calculates total and method breakdown for recorded payments")
    void testDailySummaryWithRecordedPayments() {
        LocalDate date = LocalDate.of(2026, 9, 15);
        LocalDateTime start = LocalDateTime.of(2026, 9, 15, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 9, 16, 0, 0, 0);

        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end))
                .thenReturn(new BigDecimal("350.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CASH, start, end))
                .thenReturn(new BigDecimal("200.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CARD, start, end))
                .thenReturn(new BigDecimal("150.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.BANK_TRANSFER, start, end))
                .thenReturn(null);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.OTHER, start, end))
                .thenReturn(null);

        IncomeSummaryResponse summary = billingReportService.getDailyIncomeSummary(date);

        assertThat(summary).isNotNull();
        assertThat(summary.startDate()).isEqualTo(date);
        assertThat(summary.endDate()).isEqualTo(date);
        assertThat(summary.totalIncome()).isEqualByComparingTo(new BigDecimal("350.00"));

        Map<PaymentMethod, BigDecimal> breakdown = summary.breakdownByMethod();
        assertThat(breakdown.get(PaymentMethod.CASH)).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(breakdown.get(PaymentMethod.CARD)).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(breakdown.get(PaymentMethod.BANK_TRANSFER)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(breakdown.get(PaymentMethod.OTHER)).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("2. Daily income summary boundary: start is inclusive at 00:00:00")
    void testDailySummaryStartInclusive() {
        LocalDate date = LocalDate.of(2026, 5, 20);
        LocalDateTime expectedStart = LocalDateTime.of(2026, 5, 20, 0, 0, 0);
        LocalDateTime expectedEnd = LocalDateTime.of(2026, 5, 21, 0, 0, 0);

        billingReportService.getDailyIncomeSummary(date);

        verify(paymentRepository).sumRecordedPaymentsInPeriod(eq(expectedStart), eq(expectedEnd));
    }

    @Test
    @DisplayName("3. Daily income summary boundary: next day is exclusive at nextDay 00:00:00")
    void testDailySummaryNextDayExclusive() {
        LocalDate date = LocalDate.of(2026, 12, 31);
        LocalDateTime expectedStart = LocalDateTime.of(2026, 12, 31, 0, 0, 0);
        LocalDateTime expectedEnd = LocalDateTime.of(2027, 1, 1, 0, 0, 0);

        billingReportService.getDailyIncomeSummary(date);

        verify(paymentRepository).sumRecordedPaymentsInPeriod(eq(expectedStart), eq(expectedEnd));
    }

    @Test
    @DisplayName("4. Daily income summary for empty day returns zero total and zero for all methods")
    void testDailySummaryEmptyDayZero() {
        LocalDate date = LocalDate.of(2026, 1, 10);
        LocalDateTime start = LocalDateTime.of(2026, 1, 10, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 1, 11, 0, 0, 0);

        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end)).thenReturn(null);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(any(), eq(start), eq(end))).thenReturn(null);

        IncomeSummaryResponse summary = billingReportService.getDailyIncomeSummary(date);

        assertThat(summary.totalIncome()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.breakdownByMethod().get(PaymentMethod.CASH)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.breakdownByMethod().get(PaymentMethod.CARD)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.breakdownByMethod().get(PaymentMethod.BANK_TRANSFER)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.breakdownByMethod().get(PaymentMethod.OTHER)).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("5. Daily income summary queries repository which strictly excludes REVERSED payments")
    void testDailySummaryReversedPaymentsExcluded() {
        LocalDate date = LocalDate.of(2026, 7, 4);
        LocalDateTime start = LocalDateTime.of(2026, 7, 4, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 7, 5, 0, 0, 0);

        // Repo method guarantees status = RECORDED
        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end)).thenReturn(new BigDecimal("100.00"));

        IncomeSummaryResponse summary = billingReportService.getDailyIncomeSummary(date);

        assertThat(summary.totalIncome()).isEqualByComparingTo(new BigDecimal("100.00"));
        verify(paymentRepository).sumRecordedPaymentsInPeriod(start, end);
    }

    @Test
    @DisplayName("6. Monthly income summary aggregates total and method breakdown for recorded payments")
    void testMonthlySummaryTotalWithRecordedPayments() {
        YearMonth month = YearMonth.of(2026, 9);
        LocalDateTime start = LocalDateTime.of(2026, 9, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 10, 1, 0, 0, 0);

        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end))
                .thenReturn(new BigDecimal("5000.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CASH, start, end))
                .thenReturn(new BigDecimal("2000.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CARD, start, end))
                .thenReturn(new BigDecimal("2500.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.BANK_TRANSFER, start, end))
                .thenReturn(new BigDecimal("500.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.OTHER, start, end))
                .thenReturn(null);

        IncomeSummaryResponse summary = billingReportService.getMonthlyIncomeSummary(month);

        assertThat(summary).isNotNull();
        assertThat(summary.startDate()).isEqualTo(LocalDate.of(2026, 9, 1));
        assertThat(summary.endDate()).isEqualTo(LocalDate.of(2026, 9, 30));
        assertThat(summary.totalIncome()).isEqualByComparingTo(new BigDecimal("5000.00"));

        Map<PaymentMethod, BigDecimal> breakdown = summary.breakdownByMethod();
        assertThat(breakdown.get(PaymentMethod.CASH)).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(breakdown.get(PaymentMethod.CARD)).isEqualByComparingTo(new BigDecimal("2500.00"));
        assertThat(breakdown.get(PaymentMethod.BANK_TRANSFER)).isEqualByComparingTo(new BigDecimal("500.00"));
        assertThat(breakdown.get(PaymentMethod.OTHER)).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("7. Monthly income summary boundary: first day of month is inclusive at day 1 00:00:00")
    void testMonthlySummaryFirstDayInclusive() {
        YearMonth month = YearMonth.of(2026, 3);
        LocalDateTime expectedStart = LocalDateTime.of(2026, 3, 1, 0, 0, 0);
        LocalDateTime expectedEnd = LocalDateTime.of(2026, 4, 1, 0, 0, 0);

        billingReportService.getMonthlyIncomeSummary(month);

        verify(paymentRepository).sumRecordedPaymentsInPeriod(eq(expectedStart), eq(expectedEnd));
    }

    @Test
    @DisplayName("8. Monthly income summary boundary: next month is exclusive at next month day 1 00:00:00")
    void testMonthlySummaryNextMonthExclusive() {
        YearMonth month = YearMonth.of(2026, 11);
        LocalDateTime expectedStart = LocalDateTime.of(2026, 11, 1, 0, 0, 0);
        LocalDateTime expectedEnd = LocalDateTime.of(2026, 12, 1, 0, 0, 0);

        billingReportService.getMonthlyIncomeSummary(month);

        verify(paymentRepository).sumRecordedPaymentsInPeriod(eq(expectedStart), eq(expectedEnd));
    }

    @Test
    @DisplayName("9. Monthly income summary for empty month returns zero total and zero for all methods")
    void testMonthlySummaryEmptyMonthZero() {
        YearMonth month = YearMonth.of(2026, 2);
        LocalDateTime start = LocalDateTime.of(2026, 2, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 3, 1, 0, 0, 0);

        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end)).thenReturn(null);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(any(), eq(start), eq(end))).thenReturn(null);

        IncomeSummaryResponse summary = billingReportService.getMonthlyIncomeSummary(month);

        assertThat(summary.totalIncome()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.breakdownByMethod().get(PaymentMethod.CASH)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.breakdownByMethod().get(PaymentMethod.CARD)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.breakdownByMethod().get(PaymentMethod.BANK_TRANSFER)).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(summary.breakdownByMethod().get(PaymentMethod.OTHER)).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("10. Monthly income summary correctly handles year-boundary month crossing (December to January)")
    void testMonthlySummaryYearBoundaryMonthCrossing() {
        YearMonth month = YearMonth.of(2026, 12);
        LocalDateTime expectedStart = LocalDateTime.of(2026, 12, 1, 0, 0, 0);
        LocalDateTime expectedEnd = LocalDateTime.of(2027, 1, 1, 0, 0, 0);

        IncomeSummaryResponse summary = billingReportService.getMonthlyIncomeSummary(month);

        assertThat(summary.startDate()).isEqualTo(LocalDate.of(2026, 12, 1));
        assertThat(summary.endDate()).isEqualTo(LocalDate.of(2026, 12, 31));
        verify(paymentRepository).sumRecordedPaymentsInPeriod(eq(expectedStart), eq(expectedEnd));
    }

    @Test
    @DisplayName("11. Breakdown per method guarantees all four payment methods are present in the map")
    void testBreakdownPerMethodAllFourMethodsPresent() {
        LocalDate date = LocalDate.of(2026, 6, 15);

        IncomeSummaryResponse summary = billingReportService.getDailyIncomeSummary(date);

        Map<PaymentMethod, BigDecimal> breakdown = summary.breakdownByMethod();
        assertThat(breakdown).hasSize(4);
        assertThat(breakdown).containsOnlyKeys(
                PaymentMethod.CASH,
                PaymentMethod.CARD,
                PaymentMethod.BANK_TRANSFER,
                PaymentMethod.OTHER
        );
    }

    @Test
    @DisplayName("12. Zero-method handling: methods with null repository results are mapped to BigDecimal.ZERO")
    void testZeroMethodHandlingNonEmptyDay() {
        LocalDate date = LocalDate.of(2026, 8, 1);
        LocalDateTime start = LocalDateTime.of(2026, 8, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 8, 2, 0, 0, 0);

        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end))
                .thenReturn(new BigDecimal("100.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CASH, start, end))
                .thenReturn(new BigDecimal("100.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CARD, start, end))
                .thenReturn(null);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.BANK_TRANSFER, start, end))
                .thenReturn(null);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.OTHER, start, end))
                .thenReturn(null);

        IncomeSummaryResponse summary = billingReportService.getDailyIncomeSummary(date);

        Map<PaymentMethod, BigDecimal> breakdown = summary.breakdownByMethod();
        assertThat(breakdown.get(PaymentMethod.CARD)).isNotNull().isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(breakdown.get(PaymentMethod.BANK_TRANSFER)).isNotNull().isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(breakdown.get(PaymentMethod.OTHER)).isNotNull().isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("13. Method breakdown amounts sum up to the total income")
    void testBreakdownSumEqualsTotalIncome() {
        YearMonth month = YearMonth.of(2026, 5);
        LocalDateTime start = LocalDateTime.of(2026, 5, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 6, 1, 0, 0, 0);

        BigDecimal cash = new BigDecimal("1200.50");
        BigDecimal card = new BigDecimal("800.25");
        BigDecimal transfer = new BigDecimal("450.00");
        BigDecimal other = new BigDecimal("50.00");
        BigDecimal total = cash.add(card).add(transfer).add(other);

        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end)).thenReturn(total);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CASH, start, end)).thenReturn(cash);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CARD, start, end)).thenReturn(card);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.BANK_TRANSFER, start, end)).thenReturn(transfer);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.OTHER, start, end)).thenReturn(other);

        IncomeSummaryResponse summary = billingReportService.getMonthlyIncomeSummary(month);

        BigDecimal sumOfBreakdown = summary.breakdownByMethod().values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(sumOfBreakdown).isEqualByComparingTo(summary.totalIncome());
    }

    @Test
    @DisplayName("14. Null date validation for daily summary throws BillingValidationException")
    void testDailySummaryNullDateThrowsValidationException() {
        assertThatThrownBy(() -> billingReportService.getDailyIncomeSummary(null))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Date is required");
    }

    @Test
    @DisplayName("15. Null month validation for monthly summary throws BillingValidationException")
    void testMonthlySummaryNullMonthThrowsValidationException() {
        assertThatThrownBy(() -> billingReportService.getMonthlyIncomeSummary(null))
                .isInstanceOf(BillingValidationException.class)
                .hasMessageContaining("Month is required");
    }

    @Test
    @DisplayName("16. Read-only verification: no save or delete repository calls are ever performed")
    void testReadOnlyVerificationNoSaveOrDelete() {
        LocalDate date = LocalDate.of(2026, 9, 15);
        YearMonth month = YearMonth.of(2026, 9);

        billingReportService.getDailyIncomeSummary(date);
        billingReportService.getMonthlyIncomeSummary(month);

        verify(paymentRepository, never()).save(any());
        verify(paymentRepository, never()).delete(any());
        verify(paymentRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("17. Precision preservation: exact BigDecimal values preserved without scale alteration or rounding")
    void testPrecisionPreservationBigDecimalExact() {
        LocalDate date = LocalDate.of(2026, 9, 15);
        LocalDateTime start = LocalDateTime.of(2026, 9, 15, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 9, 16, 0, 0, 0);

        BigDecimal preciseAmount = new BigDecimal("1234.56789");
        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end)).thenReturn(preciseAmount);
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CASH, start, end)).thenReturn(preciseAmount);

        IncomeSummaryResponse summary = billingReportService.getDailyIncomeSummary(date);

        assertThat(summary.totalIncome()).isEqualTo(preciseAmount);
        assertThat(summary.breakdownByMethod().get(PaymentMethod.CASH)).isEqualTo(preciseAmount);
    }

    @Test
    @DisplayName("18. Leap year February monthly summary boundary handling (e.g. 2024-02)")
    void testMonthlySummaryLeapYearHandling() {
        YearMonth leapFeb = YearMonth.of(2024, 2);
        LocalDateTime expectedStart = LocalDateTime.of(2024, 2, 1, 0, 0, 0);
        LocalDateTime expectedEnd = LocalDateTime.of(2024, 3, 1, 0, 0, 0);

        IncomeSummaryResponse summary = billingReportService.getMonthlyIncomeSummary(leapFeb);

        assertThat(summary.startDate()).isEqualTo(LocalDate.of(2024, 2, 1));
        assertThat(summary.endDate()).isEqualTo(LocalDate.of(2024, 2, 29));
        verify(paymentRepository).sumRecordedPaymentsInPeriod(eq(expectedStart), eq(expectedEnd));
    }

    @Test
    @DisplayName("19. Month end date matching in response for months of varying lengths")
    void testMonthlySummaryMonthEndDateMatching() {
        // 30-day month
        IncomeSummaryResponse april = billingReportService.getMonthlyIncomeSummary(YearMonth.of(2026, 4));
        assertThat(april.endDate()).isEqualTo(LocalDate.of(2026, 4, 30));

        // 31-day month
        IncomeSummaryResponse jan = billingReportService.getMonthlyIncomeSummary(YearMonth.of(2026, 1));
        assertThat(jan.endDate()).isEqualTo(LocalDate.of(2026, 1, 31));

        // Non-leap 28-day Feb
        IncomeSummaryResponse feb2026 = billingReportService.getMonthlyIncomeSummary(YearMonth.of(2026, 2));
        assertThat(feb2026.endDate()).isEqualTo(LocalDate.of(2026, 2, 28));
    }

    @Test
    @DisplayName("20. Multiple payment methods mixed in daily summary")
    void testMultiplePaymentMethodsMixedDailySummary() {
        LocalDate date = LocalDate.of(2026, 10, 5);
        LocalDateTime start = LocalDateTime.of(2026, 10, 5, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 10, 6, 0, 0, 0);

        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end))
                .thenReturn(new BigDecimal("775.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CASH, start, end))
                .thenReturn(new BigDecimal("100.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CARD, start, end))
                .thenReturn(new BigDecimal("250.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.BANK_TRANSFER, start, end))
                .thenReturn(new BigDecimal("400.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.OTHER, start, end))
                .thenReturn(new BigDecimal("25.00"));

        IncomeSummaryResponse summary = billingReportService.getDailyIncomeSummary(date);

        assertThat(summary.totalIncome()).isEqualByComparingTo(new BigDecimal("775.00"));
        assertThat(summary.breakdownByMethod().get(PaymentMethod.CASH)).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(summary.breakdownByMethod().get(PaymentMethod.CARD)).isEqualByComparingTo(new BigDecimal("250.00"));
        assertThat(summary.breakdownByMethod().get(PaymentMethod.BANK_TRANSFER)).isEqualByComparingTo(new BigDecimal("400.00"));
        assertThat(summary.breakdownByMethod().get(PaymentMethod.OTHER)).isEqualByComparingTo(new BigDecimal("25.00"));
    }

    @Test
    @DisplayName("21. Multiple payment methods mixed in monthly summary")
    void testMultiplePaymentMethodsMixedMonthlySummary() {
        YearMonth month = YearMonth.of(2026, 8);
        LocalDateTime start = LocalDateTime.of(2026, 8, 1, 0, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 9, 1, 0, 0, 0);

        when(paymentRepository.sumRecordedPaymentsInPeriod(start, end))
                .thenReturn(new BigDecimal("10000.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CASH, start, end))
                .thenReturn(new BigDecimal("3000.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.CARD, start, end))
                .thenReturn(new BigDecimal("4500.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.BANK_TRANSFER, start, end))
                .thenReturn(new BigDecimal("2000.00"));
        when(paymentRepository.sumRecordedPaymentsByMethodInPeriod(PaymentMethod.OTHER, start, end))
                .thenReturn(new BigDecimal("500.00"));

        IncomeSummaryResponse summary = billingReportService.getMonthlyIncomeSummary(month);

        assertThat(summary.totalIncome()).isEqualByComparingTo(new BigDecimal("10000.00"));
        assertThat(summary.breakdownByMethod().get(PaymentMethod.CASH)).isEqualByComparingTo(new BigDecimal("3000.00"));
        assertThat(summary.breakdownByMethod().get(PaymentMethod.CARD)).isEqualByComparingTo(new BigDecimal("4500.00"));
        assertThat(summary.breakdownByMethod().get(PaymentMethod.BANK_TRANSFER)).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(summary.breakdownByMethod().get(PaymentMethod.OTHER)).isEqualByComparingTo(new BigDecimal("500.00"));
    }

    @Test
    @DisplayName("22. Returned breakdownByMethod map is unmodifiable to protect data integrity")
    void testBreakdownMapIsUnmodifiable() {
        LocalDate date = LocalDate.of(2026, 9, 15);

        IncomeSummaryResponse summary = billingReportService.getDailyIncomeSummary(date);

        Map<PaymentMethod, BigDecimal> breakdown = summary.breakdownByMethod();
        assertThatThrownBy(() -> breakdown.put(PaymentMethod.CASH, BigDecimal.TEN))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("23. Daily summary startDate and endDate are both equal to the query date")
    void testDailySummaryDateFields() {
        LocalDate date = LocalDate.of(2026, 11, 23);

        IncomeSummaryResponse summary = billingReportService.getDailyIncomeSummary(date);

        assertThat(summary.startDate()).isEqualTo(date);
        assertThat(summary.endDate()).isEqualTo(date);
    }

    @Test
    @DisplayName("24. Monthly summary startDate is month.atDay(1) and endDate is month.atEndOfMonth()")
    void testMonthlySummaryDateFields() {
        YearMonth month = YearMonth.of(2026, 6);

        IncomeSummaryResponse summary = billingReportService.getMonthlyIncomeSummary(month);

        assertThat(summary.startDate()).isEqualTo(LocalDate.of(2026, 6, 1));
        assertThat(summary.endDate()).isEqualTo(LocalDate.of(2026, 6, 30));
    }

    @Test
    @DisplayName("25. Repository methods are invoked with exact start and end LocalDateTime parameters")
    void testRepositoryMethodExactLocalDateTimeParameters() {
        LocalDate date = LocalDate.of(2026, 9, 15);
        LocalDateTime expectedStart = LocalDateTime.of(2026, 9, 15, 0, 0, 0);
        LocalDateTime expectedEnd = LocalDateTime.of(2026, 9, 16, 0, 0, 0);

        billingReportService.getDailyIncomeSummary(date);

        verify(paymentRepository).sumRecordedPaymentsInPeriod(expectedStart, expectedEnd);
        for (PaymentMethod method : PaymentMethod.values()) {
            verify(paymentRepository).sumRecordedPaymentsByMethodInPeriod(method, expectedStart, expectedEnd);
        }
    }
}