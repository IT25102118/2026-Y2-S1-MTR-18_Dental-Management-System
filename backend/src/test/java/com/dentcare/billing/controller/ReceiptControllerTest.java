package com.dentcare.billing.controller;

import com.dentcare.billing.dto.ReceiptResponse;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.exception.BillingExceptionHandler;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.exception.PaymentNotFoundException;
import com.dentcare.billing.service.ReceiptService;
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
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReceiptController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(BillingExceptionHandler.class)
class ReceiptControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReceiptService receiptService;

    private ReceiptResponse createSampleReceiptResponse(Long paymentId, Long invoiceId, String ref) {
        return new ReceiptResponse(
                paymentId,
                "REC-2026-" + String.format("%04d", paymentId),
                invoiceId,
                "INV-2026-0001",
                100L,
                new BigDecimal("150.00"),
                PaymentMethod.CARD,
                ref,
                LocalDateTime.of(2026, 9, 15, 14, 30, 0),
                new BigDecimal("500.00"),
                new BigDecimal("350.00"),
                42L
        );
    }

    @Test
    @DisplayName("1. GET receipt for existing RECORDED payment returns 200 OK")
    void testGetReceiptForExistingPaymentReturns200() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "CARD-AUTH-999");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("2. Service receives the exact paymentId passed as path variable")
    void testServiceReceivesCorrectPaymentId() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(55L, 2L, "REF-55");
        when(receiptService.getReceiptForPayment(55L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 55L))
                .andExpect(status().isOk());

        verify(receiptService).getReceiptForPayment(eq(55L));
        verifyNoMoreInteractions(receiptService);
    }

    @Test
    @DisplayName("3. Response contains payment ID matching receipt")
    void testResponseContainsPaymentId() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentId", is(10)));
    }

    @Test
    @DisplayName("4. Response contains human-readable payment number")
    void testResponseContainsPaymentNumber() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentNumber", is("REC-2026-0010")));
    }

    @Test
    @DisplayName("5. Response contains invoice ID and invoice number")
    void testResponseContainsInvoiceIdAndNumber() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invoiceId", is(1)))
                .andExpect(jsonPath("$.invoiceNumber", is("INV-2026-0001")));
    }

    @Test
    @DisplayName("6. Response contains patientId exposed by DTO")
    void testResponseContainsPatientId() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientId", is(100)));
    }

    @Test
    @DisplayName("7. Response contains payment amount")
    void testResponseContainsPaymentAmount() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentAmount", is(150.00)));
    }

    @Test
    @DisplayName("8. Response contains payment method")
    void testResponseContainsPaymentMethod() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentMethod", is("CARD")));
    }

    @Test
    @DisplayName("9. Response contains optional payment reference when present")
    void testResponseContainsPaymentReference() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "AUTH-TX-445566");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentReference", is("AUTH-TX-445566")));
    }

    @Test
    @DisplayName("10. Response contains paidAt timestamp")
    void testResponseContainsPaidAt() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paidAt", is("2026-09-15T14:30:00")));
    }

    @Test
    @DisplayName("11. Response contains recordedBy staff identifier exposed by DTO")
    void testResponseContainsRecordedBy() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recordedBy", is(42)));
    }

    @Test
    @DisplayName("12. Response contains invoice total amount")
    void testResponseContainsInvoiceTotalAmount() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invoiceTotalAmount", is(500.00)));
    }

    @Test
    @DisplayName("13. Response contains remaining balance")
    void testResponseContainsRemainingBalance() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.remainingBalance", is(350.00)));
    }

    @Test
    @DisplayName("14. BigDecimal JSON values remain numeric")
    void testBigDecimalValuesRemainNumeric() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, "REF-10");
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentAmount").isNumber())
                .andExpect(jsonPath("$.invoiceTotalAmount").isNumber())
                .andExpect(jsonPath("$.remainingBalance").isNumber());
    }

    @Test
    @DisplayName("15. Null optional payment reference serializes safely as null")
    void testNullOptionalPaymentReferenceSerializesSafely() throws Exception {
        ReceiptResponse response = createSampleReceiptResponse(10L, 1L, null);
        when(receiptService.getReceiptForPayment(10L)).thenReturn(response);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentReference", nullValue()));
    }

    @Test
    @DisplayName("16. Historical REVERSED payment receipt remains retrievable according to service contract")
    void testHistoricalReversedPaymentReceiptRetrievable() throws Exception {
        // ReceiptService contract specifies that historical receipts for reversed payments remain available
        ReceiptResponse historicalReceipt = new ReceiptResponse(
                20L,
                "REC-2026-0020",
                1L,
                "INV-2026-0001",
                100L,
                new BigDecimal("100.00"),
                PaymentMethod.CASH,
                null,
                LocalDateTime.of(2026, 9, 10, 9, 0, 0),
                new BigDecimal("500.00"),
                new BigDecimal("500.00"), // balance reverted back
                42L
        );
        when(receiptService.getReceiptForPayment(20L)).thenReturn(historicalReceipt);

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 20L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentId", is(20)))
                .andExpect(jsonPath("$.paymentNumber", is("REC-2026-0020")))
                .andExpect(jsonPath("$.paymentAmount", is(100.00)))
                .andExpect(jsonPath("$.remainingBalance", is(500.00)));

        verify(receiptService).getReceiptForPayment(20L);
    }

    @Test
    @DisplayName("17. Missing payment returns 404 Not Found via BillingExceptionHandler")
    void testMissingPaymentReturns404() throws Exception {
        when(receiptService.getReceiptForPayment(999L))
                .thenThrow(new PaymentNotFoundException(999L));

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", is("Payment not found with id: 999")));
    }

    @Test
    @DisplayName("18. Missing parent invoice returns 404 Not Found if service raises InvoiceNotFoundException")
    void testMissingParentInvoiceReturns404() throws Exception {
        when(receiptService.getReceiptForPayment(12L))
                .thenThrow(new InvoiceNotFoundException(888L));

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 12L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", is("Invoice not found with id: 888")));
    }

    @Test
    @DisplayName("19. BillingValidationException returns 400 Bad Request via BillingExceptionHandler")
    void testBillingValidationExceptionReturns400() throws Exception {
        when(receiptService.getReceiptForPayment(12L))
                .thenThrow(new BillingValidationException("Payment is not associated with a valid invoice"));

        mockMvc.perform(get("/api/payments/{paymentId}/receipt", 12L))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", is("Payment is not associated with a valid invoice")));
    }

    @Test
    @DisplayName("20. Unsupported HTTP methods (POST, PUT, DELETE) on receipt endpoint are not mapped (405)")
    void testUnsupportedMethodsNotMapped() throws Exception {
        mockMvc.perform(post("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(put("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(delete("/api/payments/{paymentId}/receipt", 10L))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("21. Controller exposes ReceiptResponse and does not expose JPA Payment or Invoice entities")
    void testControllerExposesReceiptResponseNotJpaEntities() throws NoSuchMethodException {
        Method method = ReceiptController.class.getMethod("getReceiptForPayment", Long.class);

        // Verify return type is ResponseEntity<ReceiptResponse>
        assertThat(method.getReturnType()).isEqualTo(ResponseEntity.class);
        assertThat(method.getGenericReturnType().getTypeName())
                .contains(ReceiptResponse.class.getName());
        assertThat(method.getGenericReturnType().getTypeName())
                .doesNotContain("com.dentcare.billing.entity.Payment")
                .doesNotContain("com.dentcare.billing.entity.Invoice");
    }

    @Test
    @DisplayName("22. Controller delegates only to ReceiptService with no other repository/service dependencies")
    void testControllerDelegatesOnlyToReceiptService() {
        Field[] fields = ReceiptController.class.getDeclaredFields();
        assertThat(fields).hasSize(1);
        assertThat(fields[0].getType()).isEqualTo(ReceiptService.class);
    }
}
