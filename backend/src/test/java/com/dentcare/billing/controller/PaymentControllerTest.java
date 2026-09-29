package com.dentcare.billing.controller;

import com.dentcare.billing.dto.PaymentResponse;
import com.dentcare.billing.dto.RecordPaymentRequest;
import com.dentcare.billing.dto.ReversePaymentRequest;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import com.dentcare.billing.exception.BillingExceptionHandler;
import com.dentcare.billing.exception.InvalidInvoiceStatusException;
import com.dentcare.billing.exception.InvalidPaymentStatusException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.exception.OverpaymentException;
import com.dentcare.billing.exception.PaymentNotFoundException;
import com.dentcare.billing.service.PaymentService;
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
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
@Import({SecurityConfig.class, BillingExceptionHandler.class})
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PaymentService paymentService;

    private final DentCareUserDetails mockStaffUser = new DentCareUserDetails(
            42L,
            "reception@dentcare.com",
            "hash",
            "Staff",
            "Member",
            "+1234567890",
            Role.RECEPTIONIST,
            true
    );

    private PaymentResponse createSamplePaymentResponse(Long id, Long invoiceId, PaymentStatus status) {
        return new PaymentResponse(
                id,
                invoiceId,
                "REC-2026-" + String.format("%04d", id),
                new BigDecimal("50.00"),
                PaymentMethod.CASH,
                "RECEIPT-REF-1",
                LocalDateTime.of(2026, 9, 15, 10, 30),
                status,
                null,
                null,
                42L,
                LocalDateTime.of(2026, 9, 15, 10, 30)
        );
    }

    @Test
    @DisplayName("1. POST /api/invoices/{invoiceId}/payments with valid request returns 201 Created and Location header")
    void testRecordPaymentSuccess() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH, "REF-100");
        PaymentResponse response = createSamplePaymentResponse(10L, 1L, PaymentStatus.RECORDED);

        when(paymentService.recordPayment(eq(1L), any(RecordPaymentRequest.class), eq(42L)))
                .thenReturn(response);

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/payments/10")))
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.invoiceId", is(1)))
                .andExpect(jsonPath("$.paymentNumber", is("REC-2026-0010")))
                .andExpect(jsonPath("$.amount", is(50.00)))
                .andExpect(jsonPath("$.paymentMethod", is("CASH")))
                .andExpect(jsonPath("$.status", is("RECORDED")))
                .andExpect(jsonPath("$.recordedBy", is(42)));
    }

    @Test
    @DisplayName("2, 3, 4. POST /api/invoices/{invoiceId}/payments delegates correct invoiceId, request DTO, and authenticated userId")
    void testRecordPaymentDelegationParameters() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("75.25"), PaymentMethod.CARD, "POS-99");
        PaymentResponse response = createSamplePaymentResponse(11L, 5L, PaymentStatus.RECORDED);

        when(paymentService.recordPayment(eq(5L), any(RecordPaymentRequest.class), eq(42L)))
                .thenReturn(response);

        mockMvc.perform(post("/api/invoices/5/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        verify(paymentService).recordPayment(
                eq(5L),
                argThat(dto -> dto.getAmount().compareTo(new BigDecimal("75.25")) == 0 &&
                               dto.getPaymentMethod() == PaymentMethod.CARD &&
                               "POS-99".equals(dto.getPaymentReference())),
                eq(42L)
        );
    }

    @Test
    @DisplayName("5. POST /api/invoices/{invoiceId}/payments rejects zero payment amount with 400 Bad Request")
    void testRecordPaymentZeroAmountRejected() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(BigDecimal.ZERO, PaymentMethod.CASH, null);

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("amount")));
    }

    @Test
    @DisplayName("6. POST /api/invoices/{invoiceId}/payments rejects negative payment amount with 400 Bad Request")
    void testRecordPaymentNegativeAmountRejected() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("-10.00"), PaymentMethod.CASH, null);

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("amount")));
    }

    @Test
    @DisplayName("7. POST /api/invoices/{invoiceId}/payments rejects missing payment method with 400 Bad Request")
    void testRecordPaymentMissingMethodRejected() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("20.00"), null, null);

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("paymentMethod")));
    }

    @Test
    @DisplayName("8. POST /api/invoices/{invoiceId}/payments maps OverpaymentException to 400 Bad Request")
    void testRecordPaymentOverpaymentMapped() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("150.00"), PaymentMethod.CASH, null);

        when(paymentService.recordPayment(eq(1L), any(RecordPaymentRequest.class), eq(42L)))
                .thenThrow(new OverpaymentException(new BigDecimal("150.00"), new BigDecimal("100.00")));

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("exceeds outstanding balance")));
    }

    @Test
    @DisplayName("9. POST /api/invoices/{invoiceId}/payments maps InvoiceNotFoundException to 404 Not Found")
    void testRecordPaymentMissingInvoiceNotFound() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH, null);

        when(paymentService.recordPayment(eq(999L), any(RecordPaymentRequest.class), eq(42L)))
                .thenThrow(new InvoiceNotFoundException(999L));

        mockMvc.perform(post("/api/invoices/999/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("10. POST /api/invoices/{invoiceId}/payments maps InvalidInvoiceStatusException to 400 Bad Request")
    void testRecordPaymentInvalidInvoiceStatusMapped() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH, null);

        when(paymentService.recordPayment(eq(1L), any(RecordPaymentRequest.class), eq(42L)))
                .thenThrow(new InvalidInvoiceStatusException(1L, InvoiceStatus.DRAFT, "Cannot pay draft"));

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("Invoice [1] in status [DRAFT] cannot be modified")));
    }

    @Test
    @DisplayName("11. GET /api/invoices/{invoiceId}/payments returns 200 OK and chronological list of payments")
    void testGetPaymentsForInvoiceSuccess() throws Exception {
        PaymentResponse pay1 = createSamplePaymentResponse(10L, 1L, PaymentStatus.RECORDED);
        PaymentResponse pay2 = createSamplePaymentResponse(11L, 1L, PaymentStatus.RECORDED);

        when(paymentService.getPaymentsForInvoice(1L)).thenReturn(List.of(pay1, pay2));

        mockMvc.perform(get("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", is(2)))
                .andExpect(jsonPath("$[0].id", is(10)))
                .andExpect(jsonPath("$[1].id", is(11)));
    }

    @Test
    @DisplayName("12. GET /api/invoices/{invoiceId}/payments preserves both RECORDED and REVERSED payments in history")
    void testGetPaymentsPreservesRecordedAndReversedHistory() throws Exception {
        PaymentResponse recorded = createSamplePaymentResponse(20L, 2L, PaymentStatus.RECORDED);
        PaymentResponse reversed = new PaymentResponse(
                21L,
                2L,
                "REC-2026-0021",
                new BigDecimal("50.00"),
                PaymentMethod.CASH,
                null,
                LocalDateTime.now(),
                PaymentStatus.REVERSED,
                20L,
                "Customer dispute",
                42L,
                LocalDateTime.now()
        );

        when(paymentService.getPaymentsForInvoice(2L)).thenReturn(List.of(recorded, reversed));

        mockMvc.perform(get("/api/invoices/2/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", is(2)))
                .andExpect(jsonPath("$[0].status", is("RECORDED")))
                .andExpect(jsonPath("$[1].status", is("REVERSED")))
                .andExpect(jsonPath("$[1].reversalOfPaymentId", is(20)))
                .andExpect(jsonPath("$[1].reversalReason", is("Customer dispute")));
    }

    @Test
    @DisplayName("13. GET /api/invoices/{invoiceId}/payments returns 404 Not Found for non-existent invoice")
    void testGetPaymentsForInvoiceNotFound() throws Exception {
        when(paymentService.getPaymentsForInvoice(999L)).thenThrow(new InvoiceNotFoundException(999L));

        mockMvc.perform(get("/api/invoices/999/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")));
    }

    @Test
    @DisplayName("14. POST /api/payments/{paymentId}/reverse reverses payment and returns 200 OK")
    void testReversePaymentSuccess() throws Exception {
        ReversePaymentRequest request = new ReversePaymentRequest("Customer entered wrong amount");
        PaymentResponse reversalResponse = new PaymentResponse(
                31L,
                1L,
                "REC-2026-0031",
                new BigDecimal("50.00"),
                PaymentMethod.CASH,
                null,
                LocalDateTime.now(),
                PaymentStatus.REVERSED,
                30L,
                "Customer entered wrong amount",
                42L,
                LocalDateTime.now()
        );

        when(paymentService.reversePayment(eq(30L), any(ReversePaymentRequest.class), eq(42L)))
                .thenReturn(reversalResponse);

        mockMvc.perform(post("/api/payments/30/reverse")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(31)))
                .andExpect(jsonPath("$.status", is("REVERSED")))
                .andExpect(jsonPath("$.reversalOfPaymentId", is(30)))
                .andExpect(jsonPath("$.reversalReason", is("Customer entered wrong amount")));
    }

    @Test
    @DisplayName("15, 16, 17. POST /api/payments/{paymentId}/reverse delegates paymentId, reason, and authenticated userId")
    void testReversePaymentDelegationParameters() throws Exception {
        ReversePaymentRequest request = new ReversePaymentRequest("Authoritative refund");
        PaymentResponse reversalResponse = createSamplePaymentResponse(40L, 1L, PaymentStatus.REVERSED);

        when(paymentService.reversePayment(eq(35L), any(ReversePaymentRequest.class), eq(42L)))
                .thenReturn(reversalResponse);

        mockMvc.perform(post("/api/payments/35/reverse")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(paymentService).reversePayment(
                eq(35L),
                argThat((ReversePaymentRequest dto) -> "Authoritative refund".equals(dto.getReason())),
                eq(42L)
        );
    }

    @Test
    @DisplayName("18. POST /api/payments/{paymentId}/reverse rejects blank reversal reason with 400 Bad Request")
    void testReversePaymentBlankReasonRejected() throws Exception {
        ReversePaymentRequest request = new ReversePaymentRequest("   ");

        mockMvc.perform(post("/api/payments/30/reverse")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("reason")));
    }

    @Test
    @DisplayName("19. POST /api/payments/{paymentId}/reverse maps PaymentNotFoundException to 404 Not Found")
    void testReversePaymentNotFound() throws Exception {
        ReversePaymentRequest request = new ReversePaymentRequest("Valid reason");

        when(paymentService.reversePayment(eq(999L), any(ReversePaymentRequest.class), eq(42L)))
                .thenThrow(new PaymentNotFoundException(999L));

        mockMvc.perform(post("/api/payments/999/reverse")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("20. POST /api/payments/{paymentId}/reverse maps InvalidPaymentStatusException to 400 Bad Request")
    void testReversePaymentInvalidStatusMapped() throws Exception {
        ReversePaymentRequest request = new ReversePaymentRequest("Already reversed");

        when(paymentService.reversePayment(eq(30L), any(ReversePaymentRequest.class), eq(42L)))
                .thenThrow(new InvalidPaymentStatusException(30L, PaymentStatus.REVERSED, "Only RECORDED payments can be reversed"));

        mockMvc.perform(post("/api/payments/30/reverse")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("Payment [30] in status [REVERSED] cannot be modified")));
    }

    @Test
    @DisplayName("21, 22, 23. Trust boundary: client cannot supply recordedBy or reversedBy via body or query param")
    void testTrustBoundaryAuditActorIgnored() throws Exception {
        // Body with attempted recordedBy injection
        String maliciousPayload = "{\"amount\": 50.00, \"paymentMethod\": \"CASH\", \"recordedBy\": 9999}";
        PaymentResponse response = createSamplePaymentResponse(50L, 1L, PaymentStatus.RECORDED);

        when(paymentService.recordPayment(eq(1L), any(RecordPaymentRequest.class), eq(42L)))
                .thenReturn(response);

        mockMvc.perform(post("/api/invoices/1/payments?recordedBy=9999&userId=9999")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousPayload))
                .andExpect(status().isCreated());

        // Verify service received the authenticated principal user ID (42L), NOT client injection (9999)
        verify(paymentService).recordPayment(eq(1L), any(RecordPaymentRequest.class), eq(42L));
    }

    @Test
    @DisplayName("24. Malformed JSON returns 400 Bad Request")
    void testMalformedJsonReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\": \"not-a-number\", \"paymentMethod\":}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("25. Contract: response strictly uses PaymentResponse structure")
    void testResponseBodyUsesPaymentResponseContract() throws Exception {
        PaymentResponse response = createSamplePaymentResponse(60L, 1L, PaymentStatus.RECORDED);

        when(paymentService.recordPayment(eq(1L), any(RecordPaymentRequest.class), eq(42L)))
                .thenReturn(response);

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.invoiceId").isNumber())
                .andExpect(jsonPath("$.paymentNumber").isString())
                .andExpect(jsonPath("$.amount").isNumber())
                .andExpect(jsonPath("$.paymentMethod").isString())
                .andExpect(jsonPath("$.status").isString())
                .andExpect(jsonPath("$.recordedBy").isNumber());
    }

    @Test
    @DisplayName("26. Contract: unsupported HTTP method DELETE on payment endpoints is rejected")
    void testUnsupportedDeleteMethodRejected() throws Exception {
        mockMvc.perform(delete("/api/invoices/1/payments")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser)))
                .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(delete("/api/payments/10/reverse")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser)))
                .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(delete("/api/payments/10")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser)))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isIn(404, 405));
    }

    @Test
    @DisplayName("27. Controller delegates execution to PaymentService without modifying state directly")
    void testControllerPureDelegation() throws Exception {
        when(paymentService.getPaymentsForInvoice(1L)).thenReturn(List.of());

        mockMvc.perform(get("/api/invoices/1/payments")
                        .with(SecurityMockMvcRequestPostProcessors.user(mockStaffUser)))
                .andExpect(status().isOk());

        verify(paymentService).getPaymentsForInvoice(1L);
    }

    @Test
    @DisplayName("28. Authenticated principal ID is used as audit actor")
    void testPrincipalIdUsedCorrectly() throws Exception {
        DentCareUserDetails customUser = new DentCareUserDetails(
                888L,
                "admin@dentcare.com",
                "hash",
                "Admin",
                "Boss",
                "+1234567890",
                Role.ADMINISTRATOR,
                true
        );

        when(paymentService.reversePayment(eq(70L), any(ReversePaymentRequest.class), eq(888L)))
                .thenReturn(createSamplePaymentResponse(71L, 1L, PaymentStatus.REVERSED));

        mockMvc.perform(post("/api/payments/70/reverse")
                        .with(csrf())
                        .with(SecurityMockMvcRequestPostProcessors.user(customUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReversePaymentRequest("Admin correction"))))
                .andExpect(status().isOk());

        verify(paymentService).reversePayment(eq(70L), any(ReversePaymentRequest.class), eq(888L));
    }

    @Test
    @DisplayName("29. Missing principal returns 401 Unauthorized")
    void testMissingPrincipalReturnsUnauthorized() throws Exception {
        RecordPaymentRequest request = new RecordPaymentRequest(new BigDecimal("50.00"), PaymentMethod.CASH, null);

        mockMvc.perform(post("/api/invoices/1/payments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/payments/1/reverse")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReversePaymentRequest("Reason"))))
                .andExpect(status().isUnauthorized());
    }
}