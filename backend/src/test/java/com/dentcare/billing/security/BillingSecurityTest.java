package com.dentcare.billing.security;

import com.dentcare.billing.controller.BillingReportController;
import com.dentcare.billing.controller.InvoiceController;
import com.dentcare.billing.controller.PaymentController;
import com.dentcare.billing.controller.ReceiptController;
import com.dentcare.billing.dto.CreateInvoiceRequest;
import com.dentcare.billing.dto.IncomeSummaryResponse;
import com.dentcare.billing.dto.InvoiceItemRequest;
import com.dentcare.billing.dto.InvoiceResponse;
import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.ReceiptResponse;
import com.dentcare.billing.dto.RecordPaymentRequest;
import com.dentcare.billing.dto.ReversePaymentRequest;
import com.dentcare.billing.dto.UpdateDraftInvoiceRequest;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import com.dentcare.billing.exception.BillingExceptionHandler;
import com.dentcare.billing.service.BillingReportService;
import com.dentcare.billing.service.InvoiceService;
import com.dentcare.billing.service.PaymentService;
import com.dentcare.billing.service.ReceiptService;
import com.dentcare.security.config.SecurityConfig;
import com.dentcare.security.entity.Role;
import com.dentcare.security.model.DentCareUserDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({
        InvoiceController.class,
        PaymentController.class,
        ReceiptController.class,
        BillingReportController.class
})
@Import({SecurityConfig.class, BillingExceptionHandler.class})
class BillingSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private InvoiceService invoiceService;

    @MockitoBean
    private PaymentService paymentService;

    @MockitoBean
    private ReceiptService receiptService;

    @MockitoBean
    private BillingReportService billingReportService;

    private final DentCareUserDetails adminUser = new DentCareUserDetails(
            1L, "admin@dentcare.com", "hash", "Admin", "User", "+1234567890", Role.ADMINISTRATOR, true
    );

    private final DentCareUserDetails receptionistUser = new DentCareUserDetails(
            2L, "reception@dentcare.com", "hash", "Reception", "User", "+1234567891", Role.RECEPTIONIST, true
    );

    private final DentCareUserDetails dentistUser = new DentCareUserDetails(
            3L, "dentist@dentcare.com", "hash", "Dentist", "User", "+1234567892", Role.DENTIST, true
    );

    private final DentCareUserDetails assistantUser = new DentCareUserDetails(
            4L, "assistant@dentcare.com", "hash", "Assistant", "User", "+1234567893", Role.DENTAL_ASSISTANT, true
    );

    private final DentCareUserDetails patientUser = new DentCareUserDetails(
            5L, "patient@dentcare.com", "hash", "Patient", "User", "+1234567894", Role.PATIENT, true
    );

    private InvoiceResponse sampleInvoiceResponse(Long id) {
        return new InvoiceResponse(
                id,
                "INV-2026-0001",
                100L,
                null,
                LocalDate.of(2026, 9, 15),
                Collections.emptyList(),
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                new BigDecimal("100.00"),
                InvoiceStatus.UNPAID,
                "Standard checkup",
                LocalDateTime.of(2026, 9, 15, 10, 0),
                LocalDateTime.of(2026, 9, 15, 9, 30),
                LocalDateTime.of(2026, 9, 15, 9, 30),
                1L,
                Collections.emptyList()
        );
    }

    private PaymentResponse samplePaymentResponse(Long id) {
        return new PaymentResponse(
                id, 1L, "REC-2026-0001", new BigDecimal("50.00"), PaymentMethod.CASH,
                "REF", LocalDateTime.now(), PaymentStatus.RECORDED, null, null, 1L, LocalDateTime.now()
        );
    }

    private ReceiptResponse sampleReceiptResponse(Long paymentId) {
        return new ReceiptResponse(
                paymentId, "REC-2026-0001", 1L, "INV-2026-0001", 100L,
                new BigDecimal("50.00"), PaymentMethod.CASH, "REF",
                LocalDateTime.now(), new BigDecimal("100.00"), new BigDecimal("50.00"), 1L
        );
    }

    private IncomeSummaryResponse sampleIncomeSummaryResponse() {
        return new IncomeSummaryResponse(
                LocalDate.of(2026, 9, 15), LocalDate.of(2026, 9, 16),
                new BigDecimal("100.00"), Collections.emptyMap()
        );
    }

    // ==========================================
    // 1. UNAUTHENTICATED CALLERS RECEIVE 401
    // ==========================================

    @Test
    @DisplayName("1. Unauthenticated read invoice returns 401")
    void testUnauthenticatedReadInvoiceReturns401() throws Exception {
        mockMvc.perform(get("/api/invoices/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("2. Unauthenticated create invoice returns 401")
    void testUnauthenticatedCreateInvoiceReturns401() throws Exception {
        mockMvc.perform(post("/api/invoices")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("3. Unauthenticated payment record returns 401")
    void testUnauthenticatedPaymentRecordReturns401() throws Exception {
        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("4. Unauthenticated receipt retrieval returns 401")
    void testUnauthenticatedReceiptReturns401() throws Exception {
        mockMvc.perform(get("/api/payments/1/receipt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("5. Unauthenticated report query returns 401")
    void testUnauthenticatedReportReturns401() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/daily?date=2026-09-15"))
                .andExpect(status().isUnauthorized());
    }

    // ==========================================
    // 2. ADMINISTRATOR HAS FULL ACCESS
    // ==========================================

    @Test
    @DisplayName("6. ADMINISTRATOR can create draft invoice")
    void testAdminCanCreateInvoice() throws Exception {
        CreateInvoiceRequest request = new CreateInvoiceRequest(
                100L, null, LocalDate.of(2026, 9, 15),
                List.of(new InvoiceItemRequest("Cleaning", 1, new BigDecimal("100.00"))),
                BigDecimal.ZERO, "Notes"
        );
        when(invoiceService.createDraft(any())).thenReturn(sampleInvoiceResponse(1L));

        mockMvc.perform(post("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("7. ADMINISTRATOR can update draft invoice")
    void testAdminCanUpdateDraft() throws Exception {
        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest(
                List.of(new InvoiceItemRequest("Exam", 1, new BigDecimal("80.00"))),
                BigDecimal.ZERO, "Updated"
        );
        when(invoiceService.updateDraft(eq(1L), any())).thenReturn(sampleInvoiceResponse(1L));

        mockMvc.perform(put("/api/invoices/1")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("8. ADMINISTRATOR can issue invoice")
    void testAdminCanIssueInvoice() throws Exception {
        when(invoiceService.issueInvoice(1L)).thenReturn(sampleInvoiceResponse(1L));

        mockMvc.perform(post("/api/invoices/1/issue")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("9. ADMINISTRATOR can cancel invoice")
    void testAdminCanCancelInvoice() throws Exception {
        when(invoiceService.cancelInvoice(1L)).thenReturn(sampleInvoiceResponse(1L));

        mockMvc.perform(post("/api/invoices/1/cancel")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("10. ADMINISTRATOR can read invoice by id")
    void testAdminCanReadInvoice() throws Exception {
        when(invoiceService.getInvoice(1L)).thenReturn(sampleInvoiceResponse(1L));

        mockMvc.perform(get("/api/invoices/1")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("11. ADMINISTRATOR can record payment")
    void testAdminCanRecordPayment() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH, "REF");
        when(paymentService.recordPayment(eq(1L), any(), eq(1L))).thenReturn(samplePaymentResponse(10L));

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("12. ADMINISTRATOR can reverse payment")
    void testAdminCanReversePayment() throws Exception {
        ReversePaymentRequest request = new ReversePaymentRequest("Wrong amount");
        when(paymentService.reversePayment(eq(10L), any(ReversePaymentRequest.class), eq(1L))).thenReturn(samplePaymentResponse(10L));

        mockMvc.perform(post("/api/payments/10/reverse")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("13. ADMINISTRATOR can read payment history")
    void testAdminCanReadPaymentHistory() throws Exception {
        when(paymentService.getPaymentsForInvoice(1L)).thenReturn(List.of(samplePaymentResponse(10L)));

        mockMvc.perform(get("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("14. ADMINISTRATOR can read receipt")
    void testAdminCanReadReceipt() throws Exception {
        when(receiptService.getReceiptForPayment(10L)).thenReturn(sampleReceiptResponse(10L));

        mockMvc.perform(get("/api/payments/10/receipt")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("15. ADMINISTRATOR can read daily and monthly reports")
    void testAdminCanReadReports() throws Exception {
        when(billingReportService.getDailyIncomeSummary(any())).thenReturn(sampleIncomeSummaryResponse());
        when(billingReportService.getMonthlyIncomeSummary(any())).thenReturn(sampleIncomeSummaryResponse());

        mockMvc.perform(get("/api/billing/reports/income/daily?date=2026-09-15")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/billing/reports/income/monthly?month=2026-09")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser)))
                .andExpect(status().isOk());
    }

    // ==========================================
    // 3. RECEPTIONIST HAS OPERATIONAL BILLING ACCESS
    // ==========================================

    @Test
    @DisplayName("16. RECEPTIONIST can perform operational billing actions")
    void testReceptionistCanPerformOperationalBilling() throws Exception {
        CreateInvoiceRequest createRequest = new CreateInvoiceRequest(
                100L, null, LocalDate.of(2026, 9, 15),
                List.of(new InvoiceItemRequest("Cleaning", 1, new BigDecimal("100.00"))),
                BigDecimal.ZERO, "Notes"
        );
        RecordPaymentRequest payRequest = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH, "REF");
        when(invoiceService.createDraft(any())).thenReturn(sampleInvoiceResponse(1L));
        when(invoiceService.getInvoice(1L)).thenReturn(sampleInvoiceResponse(1L));
        when(invoiceService.issueInvoice(1L)).thenReturn(sampleInvoiceResponse(1L));
        when(invoiceService.cancelInvoice(1L)).thenReturn(sampleInvoiceResponse(1L));
        when(paymentService.recordPayment(eq(1L), any(), eq(2L))).thenReturn(samplePaymentResponse(10L));
        when(paymentService.getPaymentsForInvoice(1L)).thenReturn(List.of(samplePaymentResponse(10L)));
        when(receiptService.getReceiptForPayment(10L)).thenReturn(sampleReceiptResponse(10L));
        when(billingReportService.getDailyIncomeSummary(any())).thenReturn(sampleIncomeSummaryResponse());

        mockMvc.perform(post("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(receptionistUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/invoices/1")
                        .with(SecurityMockMvcRequestPostProcessors.user(receptionistUser)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/invoices/1/issue")
                        .with(SecurityMockMvcRequestPostProcessors.user(receptionistUser))
                        .with(csrf()))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(receptionistUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payRequest)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/payments/10/receipt")
                        .with(SecurityMockMvcRequestPostProcessors.user(receptionistUser)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/billing/reports/income/daily?date=2026-09-15")
                        .with(SecurityMockMvcRequestPostProcessors.user(receptionistUser)))
                .andExpect(status().isOk());
    }

    // ==========================================
    // 4. DENTIST IS DENIED BILLING ACCESS (403)
    // ==========================================

    @Test
    @DisplayName("17. DENTIST is denied invoice mutation")
    void testDentistDeniedInvoiceMutation() throws Exception {
        mockMvc.perform(post("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(dentistUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/invoices/1/issue")
                        .with(SecurityMockMvcRequestPostProcessors.user(dentistUser))
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("18. DENTIST is denied payment mutation")
    void testDentistDeniedPaymentMutation() throws Exception {
        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(dentistUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/payments/1/reverse")
                        .with(SecurityMockMvcRequestPostProcessors.user(dentistUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("19. DENTIST is denied report queries")
    void testDentistDeniedReports() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/daily?date=2026-09-15")
                        .with(SecurityMockMvcRequestPostProcessors.user(dentistUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("20. DENTIST is denied billing reads")
    void testDentistDeniedBillingReads() throws Exception {
        mockMvc.perform(get("/api/invoices/1")
                        .with(SecurityMockMvcRequestPostProcessors.user(dentistUser)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/payments/1/receipt")
                        .with(SecurityMockMvcRequestPostProcessors.user(dentistUser)))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 5. DENTAL_ASSISTANT IS DENIED BILLING ACCESS (403)
    // ==========================================

    @Test
    @DisplayName("21. DENTAL_ASSISTANT is denied invoice mutation")
    void testAssistantDeniedInvoiceMutation() throws Exception {
        mockMvc.perform(post("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(assistantUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("22. DENTAL_ASSISTANT is denied payment mutation")
    void testAssistantDeniedPaymentMutation() throws Exception {
        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(assistantUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("23. DENTAL_ASSISTANT is denied reports")
    void testAssistantDeniedReports() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/monthly?month=2026-09")
                        .with(SecurityMockMvcRequestPostProcessors.user(assistantUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("24. DENTAL_ASSISTANT is denied billing reads")
    void testAssistantDeniedBillingReads() throws Exception {
        mockMvc.perform(get("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(assistantUser)))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 6. PATIENT IS DENIED BILLING WRITES & REPORTS (403)
    // ==========================================

    @Test
    @DisplayName("25. PATIENT cannot create invoice")
    void testPatientCannotCreateInvoice() throws Exception {
        mockMvc.perform(post("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("26. PATIENT cannot update invoice")
    void testPatientCannotUpdateInvoice() throws Exception {
        mockMvc.perform(put("/api/invoices/1")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("27. PATIENT cannot issue invoice")
    void testPatientCannotIssueInvoice() throws Exception {
        mockMvc.perform(post("/api/invoices/1/issue")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser))
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("28. PATIENT cannot cancel invoice")
    void testPatientCannotCancelInvoice() throws Exception {
        mockMvc.perform(post("/api/invoices/1/cancel")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser))
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("29. PATIENT cannot record payment")
    void testPatientCannotRecordPayment() throws Exception {
        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("30. PATIENT cannot reverse payment")
    void testPatientCannotReversePayment() throws Exception {
        mockMvc.perform(post("/api/payments/1/reverse")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("31. PATIENT cannot access reports")
    void testPatientCannotAccessReports() throws Exception {
        mockMvc.perform(get("/api/billing/reports/income/daily?date=2026-09-15")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/billing/reports/income/monthly?month=2026-09")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser)))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 7. PATIENT READ ACCESS SAFEGUARD
    // (Without authoritative user->patient mapping, generic reads must be denied to prevent cross-patient data exposure)
    // ==========================================

    @Test
    @DisplayName("32. PATIENT is denied generic GET /api/invoices/{id} pending MF-01 ownership mapping")
    void testPatientDeniedGenericInvoiceRead() throws Exception {
        mockMvc.perform(get("/api/invoices/1")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("33. PATIENT is denied generic GET /api/invoices/by-number/{number}")
    void testPatientDeniedGenericInvoiceByNumberRead() throws Exception {
        mockMvc.perform(get("/api/invoices/by-number/INV-2026-0001")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("34. PATIENT is denied generic GET /api/invoices/{id}/payments")
    void testPatientDeniedGenericInvoicePaymentsRead() throws Exception {
        mockMvc.perform(get("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("35. PATIENT is denied generic GET /api/payments/{id}/receipt")
    void testPatientDeniedGenericReceiptRead() throws Exception {
        mockMvc.perform(get("/api/payments/1/receipt")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser)))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 8. ROUTE SECURITY & MATCHER PRECEDENCE
    // ==========================================

    @Test
    @DisplayName("36. Matcher precedence: nested payment endpoint cannot be bypassed by PATIENT")
    void testNestedPaymentEndpointPrecedence() throws Exception {
        mockMvc.perform(post("/api/invoices/99/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("37. Missing CSRF on mutating request by ADMINISTRATOR returns 403 Forbidden")
    void testAdminRequestWithoutCsrfIsRejected() throws Exception {
        mockMvc.perform(post("/api/invoices/1/issue")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser)))
                .andExpect(status().isForbidden());
    }

    // ==========================================
    // 9. INVOICE LISTING (UI-BIL-01) AUTHORIZATION
    // ==========================================

    @Test
    @DisplayName("38. Unauthenticated list invoices returns 401 Unauthorized")
    void testUnauthenticatedListInvoicesReturns401() throws Exception {
        mockMvc.perform(get("/api/invoices"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("39. ADMINISTRATOR can list invoices")
    void testAdminCanListInvoices() throws Exception {
        when(invoiceService.getInvoices(any(), any(), any(), any())).thenReturn(List.of(sampleInvoiceResponse(1L)));

        mockMvc.perform(get("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(adminUser)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("40. RECEPTIONIST can list invoices")
    void testReceptionistCanListInvoices() throws Exception {
        when(invoiceService.getInvoices(any(), any(), any(), any())).thenReturn(List.of(sampleInvoiceResponse(1L)));

        mockMvc.perform(get("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(receptionistUser)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("41. PATIENT is denied generic GET /api/invoices list")
    void testPatientDeniedInvoiceList() throws Exception {
        mockMvc.perform(get("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(patientUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("42. DENTIST is denied GET /api/invoices list")
    void testDentistDeniedInvoiceList() throws Exception {
        mockMvc.perform(get("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(dentistUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("43. DENTAL_ASSISTANT is denied GET /api/invoices list")
    void testDentalAssistantDeniedInvoiceList() throws Exception {
        mockMvc.perform(get("/api/invoices")
                        .with(SecurityMockMvcRequestPostProcessors.user(assistantUser)))
                .andExpect(status().isForbidden());
    }
}
