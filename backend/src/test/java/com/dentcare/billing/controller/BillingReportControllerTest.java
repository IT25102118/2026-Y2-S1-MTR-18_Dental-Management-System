package com.dentcare.billing.controller;

import com.dentcare.billing.dto.IncomeSummaryResponse;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.exception.BillingExceptionHandler;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.service.BillingReportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(BillingReportController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(BillingExceptionHandler.class)
class BillingReportControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private BillingReportService billingReportService;

    private Map<PaymentMethod, BigDecimal> createSampleBreakdown() {
        Map<PaymentMethod, BigDecimal> breakdown = new EnumMap<>(PaymentMethod.class);
        breakdown.put(PaymentMethod.CASH, new BigDecimal("200.00"));
        breakdown.put(PaymentMethod.CARD, new BigDecimal("350.50"));
        breakdown.put(PaymentMethod.BANK_TRANSFER, new BigDecimal("100.00"));
        breakdown.put(PaymentMethod.OTHER, new BigDecimal("0.00"));
        return breakdown;
    }

    private Map<PaymentMethod, BigDecimal> createZeroBreakdown() {
        Map<PaymentMethod, BigDecimal> breakdown = new EnumMap<>(PaymentMethod.class);
        breakdown.put(PaymentMethod.CASH, BigDecimal.ZERO);
        breakdown.put(PaymentMethod.CARD, BigDecimal.ZERO);
        breakdown.put(PaymentMethod.BANK_TRANSFER, BigDecimal.ZERO);
        breakdown.put(PaymentMethod.OTHER, BigDecimal.ZERO);
        return breakdown;
    }

    // ==========================================
    // DAILY INCOME TESTS (1 - 13)
    // ==========================================

    @Test
    @DisplayName("1. Valid date=2026-09-15 returns 200 OK")
    void testValidDailyDateReturns200() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("650.50"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("2. Service receives exact LocalDate parameter")
    void testDailyServiceReceivesExactLocalDate() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("650.50"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk());

        verify(billingReportService).getDailyIncomeSummary(eq(date));
        verifyNoMoreInteractions(billingReportService);
    }

    @Test
    @DisplayName("3. Daily response contains correct startDate")
    void testDailyResponseContainsStartDate() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("650.50"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startDate", is("2026-09-15")));
    }

    @Test
    @DisplayName("4. Daily response contains correct endDate (next day boundary)")
    void testDailyResponseContainsEndDate() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("650.50"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endDate", is("2026-09-16")));
    }

    @Test
    @DisplayName("5. Daily response totalIncome is numeric")
    void testDailyResponseTotalIncomeNumeric() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("650.50"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").isNumber())
                .andExpect(jsonPath("$.totalIncome", is(650.50)));
    }

    @Test
    @DisplayName("6. Daily response includes CASH breakdown")
    void testDailyResponseIncludesCashBreakdown() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("650.50"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.breakdownByMethod.CASH", is(200.00)));
    }

    @Test
    @DisplayName("7. Daily response includes CARD breakdown")
    void testDailyResponseIncludesCardBreakdown() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("650.50"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.breakdownByMethod.CARD", is(350.50)));
    }

    @Test
    @DisplayName("8. Daily response includes BANK_TRANSFER breakdown")
    void testDailyResponseIncludesBankTransferBreakdown() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("650.50"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.breakdownByMethod.BANK_TRANSFER", is(100.00)));
    }

    @Test
    @DisplayName("9. Daily response includes OTHER breakdown")
    void testDailyResponseIncludesOtherBreakdown() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("650.50"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.breakdownByMethod.OTHER", is(0.00)));
    }

    @Test
    @DisplayName("10. Zero daily summary returns 200 with zero values")
    void testZeroDailySummaryReturns200() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), BigDecimal.ZERO, createZeroBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome", is(0)))
                .andExpect(jsonPath("$.breakdownByMethod.CASH", is(0)))
                .andExpect(jsonPath("$.breakdownByMethod.CARD", is(0)));
    }

    @Test
    @DisplayName("11. Missing date parameter returns 400 Bad Request")
    void testMissingDateReturns400() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/daily"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("12. Malformed date (15-09-2026) returns 400 Bad Request")
    void testMalformedDateReturns400() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "15-09-2026"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("13. Impossible date (2026-02-30) returns 400 Bad Request")
    void testImpossibleDateReturns400() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-02-30"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    // ==========================================
    // MONTHLY INCOME TESTS (14 - 23)
    // ==========================================

    @Test
    @DisplayName("14. Valid month=2026-09 returns 200 OK")
    void testValidMonthReturns200() throws Exception {
        YearMonth month = YearMonth.of(2026, 9);
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                start, end, new BigDecimal("12500.00"), createSampleBreakdown()
        );
        when(billingReportService.getMonthlyIncomeSummary(month)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/monthly")
                        .param("month", "2026-09")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("15. Monthly service receives exact YearMonth parameter")
    void testMonthlyServiceReceivesExactYearMonth() throws Exception {
        YearMonth month = YearMonth.of(2026, 9);
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                start, end, new BigDecimal("12500.00"), createSampleBreakdown()
        );
        when(billingReportService.getMonthlyIncomeSummary(month)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/monthly")
                        .param("month", "2026-09"))
                .andExpect(status().isOk());

        verify(billingReportService).getMonthlyIncomeSummary(eq(month));
        verifyNoMoreInteractions(billingReportService);
    }

    @Test
    @DisplayName("16. Monthly startDate serialized correctly")
    void testMonthlyStartDateSerializedCorrectly() throws Exception {
        YearMonth month = YearMonth.of(2026, 9);
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                start, end, new BigDecimal("12500.00"), createSampleBreakdown()
        );
        when(billingReportService.getMonthlyIncomeSummary(month)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/monthly")
                        .param("month", "2026-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startDate", is("2026-09-01")));
    }

    @Test
    @DisplayName("17. Monthly endDate serialized correctly")
    void testMonthlyEndDateSerializedCorrectly() throws Exception {
        YearMonth month = YearMonth.of(2026, 9);
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                start, end, new BigDecimal("12500.00"), createSampleBreakdown()
        );
        when(billingReportService.getMonthlyIncomeSummary(month)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/monthly")
                        .param("month", "2026-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.endDate", is("2026-10-01")));
    }

    @Test
    @DisplayName("18. Monthly totalIncome numeric")
    void testMonthlyTotalIncomeNumeric() throws Exception {
        YearMonth month = YearMonth.of(2026, 9);
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                start, end, new BigDecimal("12500.00"), createSampleBreakdown()
        );
        when(billingReportService.getMonthlyIncomeSummary(month)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/monthly")
                        .param("month", "2026-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").isNumber())
                .andExpect(jsonPath("$.totalIncome", is(12500.00)));
    }

    @Test
    @DisplayName("19. Method breakdown serialized correctly in monthly report")
    void testMonthlyMethodBreakdownSerializedCorrectly() throws Exception {
        YearMonth month = YearMonth.of(2026, 9);
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                start, end, new BigDecimal("12500.00"), createSampleBreakdown()
        );
        when(billingReportService.getMonthlyIncomeSummary(month)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/monthly")
                        .param("month", "2026-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.breakdownByMethod.CASH", is(200.00)))
                .andExpect(jsonPath("$.breakdownByMethod.CARD", is(350.50)))
                .andExpect(jsonPath("$.breakdownByMethod.BANK_TRANSFER", is(100.00)))
                .andExpect(jsonPath("$.breakdownByMethod.OTHER", is(0.00)));
    }

    @Test
    @DisplayName("20. Zero monthly summary returns 200 with zeros")
    void testZeroMonthlySummaryReturns200() throws Exception {
        YearMonth month = YearMonth.of(2026, 9);
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                start, end, BigDecimal.ZERO, createZeroBreakdown()
        );
        when(billingReportService.getMonthlyIncomeSummary(month)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/monthly")
                        .param("month", "2026-09"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome", is(0)))
                .andExpect(jsonPath("$.breakdownByMethod.CASH", is(0)));
    }

    @Test
    @DisplayName("21. Missing month parameter returns 400 Bad Request")
    void testMissingMonthReturns400() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/monthly"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("22. Malformed month (09/2026) returns 400 Bad Request")
    void testMalformedMonthReturns400() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/monthly")
                        .param("month", "09/2026"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("23. Invalid month 13 (2026-13) returns 400 Bad Request")
    void testInvalidMonth13Returns400() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/monthly")
                        .param("month", "2026-13"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    // ==========================================
    // CONTRACT & DELEGATION TESTS (24 - 30)
    // ==========================================

    @Test
    @DisplayName("24. Response uses IncomeSummaryResponse structure")
    void testResponseUsesIncomeSummaryResponseStructure() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("100.00"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.startDate").exists())
                .andExpect(jsonPath("$.endDate").exists())
                .andExpect(jsonPath("$.totalIncome").exists())
                .andExpect(jsonPath("$.breakdownByMethod").isMap());
    }

    @Test
    @DisplayName("25. BigDecimal precision remains numeric and unaltered")
    void testBigDecimalPrecisionUnaltered() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        IncomeSummaryResponse response = new IncomeSummaryResponse(
                date, date.plusDays(1), new BigDecimal("1234.56"), createSampleBreakdown()
        );
        when(billingReportService.getDailyIncomeSummary(date)).thenReturn(response);

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncome").isNumber())
                .andExpect(jsonPath("$.totalIncome", is(1234.56)));
    }

    @Test
    @DisplayName("26. Controller delegates only to BillingReportService")
    void testControllerDelegatesOnlyToBillingReportService() {
        Field[] fields = BillingReportController.class.getDeclaredFields();
        assertThat(fields).hasSize(1);
        assertThat(fields[0].getType()).isEqualTo(BillingReportService.class);
    }

    @Test
    @DisplayName("27. Unsupported POST daily endpoint returns 405 Method Not Allowed")
    void testUnsupportedPostDailyReturns405() throws Exception {
        mockMvc.perform(post("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("28. Unsupported DELETE monthly endpoint returns 405 Method Not Allowed")
    void testUnsupportedDeleteMonthlyReturns405() throws Exception {
        mockMvc.perform(delete("/api/billing/reports/income/monthly")
                        .param("month", "2026-09"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("29. No repository or calculation dependency in controller")
    void testNoRepositoryDependencyInController() {
        for (Field field : BillingReportController.class.getDeclaredFields()) {
            assertThat(field.getType().getName())
                    .doesNotContain("Repository")
                    .doesNotContain("BillingCalculationService");
        }
    }

    @Test
    @DisplayName("30. BillingValidationException from service returns 400 Bad Request")
    void testBillingValidationExceptionReturns400() throws Exception {
        LocalDate date = LocalDate.of(2026, 9, 15);
        when(billingReportService.getDailyIncomeSummary(date))
                .thenThrow(new BillingValidationException("Target date is required"));

        mockMvc.perform(get("/api/billing/reports/income/daily")
                        .param("date", "2026-09-15"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", is("Target date is required")));
    }
}
