package com.dentcare.billing.controller;

import com.dentcare.billing.dto.CreateInvoiceRequest;
import com.dentcare.billing.dto.InvoiceItemRequest;
import com.dentcare.billing.dto.InvoiceItemResponse;
import com.dentcare.billing.dto.InvoiceResponse;
import com.dentcare.billing.dto.UpdateDraftInvoiceRequest;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.exception.BillingExceptionHandler;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvalidInvoiceStatusException;
import com.dentcare.billing.exception.InvoiceNotFoundException;
import com.dentcare.billing.service.InvoiceService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InvoiceController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(BillingExceptionHandler.class)
class InvoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private InvoiceService invoiceService;

    private InvoiceResponse createSampleInvoiceResponse(Long id, InvoiceStatus invoiceStatus) {
        InvoiceItemResponse item = new InvoiceItemResponse(
                10L,
                null,
                "Dental Consultation",
                1,
                new BigDecimal("100.00"),
                new BigDecimal("100.00")
        );

        return new InvoiceResponse(
                id,
                "INV-2026-" + String.format("%04d", id),
                101L,
                null,
                LocalDate.of(2026, 9, 15),
                List.of(item),
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                new BigDecimal("100.00"),
                invoiceStatus,
                "Standard checkup",
                invoiceStatus == InvoiceStatus.DRAFT ? null : LocalDateTime.of(2026, 9, 15, 10, 0),
                LocalDateTime.of(2026, 9, 15, 9, 30),
                LocalDateTime.of(2026, 9, 15, 9, 30),
                1L,
                Collections.emptyList()
        );
    }

    @Test
    @DisplayName("1. POST /api/invoices with valid draft request returns 201 Created with Location header and response body")
    void testCreateDraftSuccess() throws Exception {
        CreateInvoiceRequest request = new CreateInvoiceRequest(
                101L,
                null,
                LocalDate.of(2026, 9, 15),
                List.of(new InvoiceItemRequest("Dental Consultation", 1, new BigDecimal("100.00"))),
                BigDecimal.ZERO,
                "Standard checkup"
        );

        InvoiceResponse response = createSampleInvoiceResponse(1L, InvoiceStatus.DRAFT);
        when(invoiceService.createDraft(any(CreateInvoiceRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/invoices/1")))
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.invoiceNumber", is("INV-2026-0001")))
                .andExpect(jsonPath("$.patientId", is(101)))
                .andExpect(jsonPath("$.status", is("DRAFT")))
                .andExpect(jsonPath("$.subtotal", is(100.00)))
                .andExpect(jsonPath("$.totalAmount", is(100.00)))
                .andExpect(jsonPath("$.balanceAmount", is(100.00)));
    }

    @Test
    @DisplayName("2. POST /api/invoices delegates to invoiceService.createDraft with expected DTO")
    void testCreateDraftDelegatesToService() throws Exception {
        CreateInvoiceRequest request = new CreateInvoiceRequest(
                202L,
                55L,
                LocalDate.of(2026, 9, 15),
                List.of(new InvoiceItemRequest("Scaling", 2, new BigDecimal("75.00"))),
                new BigDecimal("10.00"),
                "VIP Patient"
        );

        InvoiceResponse response = createSampleInvoiceResponse(2L, InvoiceStatus.DRAFT);
        when(invoiceService.createDraft(any(CreateInvoiceRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        verify(invoiceService).createDraft(argThat(dto ->
                dto.getPatientId().equals(202L) &&
                dto.getTreatmentPlanId().equals(55L) &&
                dto.getItems().size() == 1 &&
                dto.getDiscountAmount().compareTo(new BigDecimal("10.00")) == 0
        ));
    }

    @Test
    @DisplayName("3. POST /api/invoices with null patientId is rejected with 400 Bad Request")
    void testCreateDraftInvalidPatientIdRejected() throws Exception {
        CreateInvoiceRequest request = new CreateInvoiceRequest(
                null,
                null,
                LocalDate.now(),
                List.of(new InvoiceItemRequest("Filling", 1, new BigDecimal("50.00"))),
                BigDecimal.ZERO,
                null
        );

        mockMvc.perform(post("/api/invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("patientId")));
    }

    @Test
    @DisplayName("4. POST /api/invoices with blank nested item description is rejected with 400 Bad Request")
    void testCreateDraftInvalidNestedDescriptionRejected() throws Exception {
        CreateInvoiceRequest request = new CreateInvoiceRequest(
                101L,
                null,
                LocalDate.now(),
                List.of(new InvoiceItemRequest("", 1, new BigDecimal("50.00"))),
                BigDecimal.ZERO,
                null
        );

        mockMvc.perform(post("/api/invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("items[0].description")));
    }

    @Test
    @DisplayName("5. POST /api/invoices with zero/negative quantity is rejected with 400 Bad Request")
    void testCreateDraftInvalidQuantityRejected() throws Exception {
        CreateInvoiceRequest request = new CreateInvoiceRequest(
                101L,
                null,
                LocalDate.now(),
                List.of(new InvoiceItemRequest("Filling", 0, new BigDecimal("50.00"))),
                BigDecimal.ZERO,
                null
        );

        mockMvc.perform(post("/api/invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("items[0].quantity")));
    }

    @Test
    @DisplayName("6. POST /api/invoices with negative unit price is rejected with 400 Bad Request")
    void testCreateDraftNegativeUnitPriceRejected() throws Exception {
        CreateInvoiceRequest request = new CreateInvoiceRequest(
                101L,
                null,
                LocalDate.now(),
                List.of(new InvoiceItemRequest("Filling", 1, new BigDecimal("-20.00"))),
                BigDecimal.ZERO,
                null
        );

        mockMvc.perform(post("/api/invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("items[0].unitPrice")));
    }

    @Test
    @DisplayName("7. PUT /api/invoices/{id} with valid draft update succeeds and returns 200 OK")
    void testUpdateDraftSuccess() throws Exception {
        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest(
                List.of(new InvoiceItemRequest("Root Canal", 1, new BigDecimal("350.00"))),
                new BigDecimal("20.00"),
                "Updated procedure"
        );

        InvoiceResponse response = createSampleInvoiceResponse(1L, InvoiceStatus.DRAFT);
        when(invoiceService.updateDraft(eq(1L), any(UpdateDraftInvoiceRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/invoices/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("DRAFT")));
    }

    @Test
    @DisplayName("8. PUT /api/invoices/{id} with negative discount amount returns 400 Bad Request")
    void testUpdateDraftInvalidDiscountRejected() throws Exception {
        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest(
                List.of(new InvoiceItemRequest("Filling", 1, new BigDecimal("50.00"))),
                new BigDecimal("-5.00"),
                null
        );

        mockMvc.perform(put("/api/invoices/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("discountAmount")));
    }

    @Test
    @DisplayName("9. PUT /api/invoices/{id} maps service InvalidInvoiceStatusException to 400 Bad Request")
    void testUpdateDraftLifecycleExceptionMapped() throws Exception {
        UpdateDraftInvoiceRequest request = new UpdateDraftInvoiceRequest(
                List.of(new InvoiceItemRequest("Filling", 1, new BigDecimal("50.00"))),
                BigDecimal.ZERO,
                null
        );

        when(invoiceService.updateDraft(eq(1L), any(UpdateDraftInvoiceRequest.class)))
                .thenThrow(new InvalidInvoiceStatusException(1L, InvoiceStatus.PAID, "Invoice is not editable"));

        mockMvc.perform(put("/api/invoices/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("Invoice [1] in status [PAID] cannot be modified")));
    }

    @Test
    @DisplayName("10. GET /api/invoices/{id} returns 200 OK for existing invoice")
    void testGetInvoiceByIdSuccess() throws Exception {
        InvoiceResponse response = createSampleInvoiceResponse(1L, InvoiceStatus.UNPAID);
        when(invoiceService.getInvoice(1L)).thenReturn(response);

        mockMvc.perform(get("/api/invoices/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.invoiceNumber", is("INV-2026-0001")))
                .andExpect(jsonPath("$.patientId", is(101)));
    }

    @Test
    @DisplayName("11. GET /api/invoices/{id} returns 404 Not Found for missing invoice")
    void testGetInvoiceByIdNotFound() throws Exception {
        when(invoiceService.getInvoice(999L)).thenThrow(new InvoiceNotFoundException(999L));

        mockMvc.perform(get("/api/invoices/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("12. GET /api/invoices/by-number/{invoiceNumber} returns 200 OK for existing invoice")
    void testGetInvoiceByNumberSuccess() throws Exception {
        InvoiceResponse response = createSampleInvoiceResponse(1L, InvoiceStatus.UNPAID);
        when(invoiceService.getInvoiceByNumber("INV-2026-0001")).thenReturn(response);

        mockMvc.perform(get("/api/invoices/by-number/INV-2026-0001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.invoiceNumber", is("INV-2026-0001")));
    }

    @Test
    @DisplayName("13. GET /api/invoices/by-number/{invoiceNumber} returns 404 Not Found for missing invoice number")
    void testGetInvoiceByNumberNotFound() throws Exception {
        when(invoiceService.getInvoiceByNumber("INV-9999-9999"))
                .thenThrow(new InvoiceNotFoundException("INV-9999-9999"));

        mockMvc.perform(get("/api/invoices/by-number/INV-9999-9999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("INV-9999-9999")));
    }

    @Test
    @DisplayName("14. POST /api/invoices/{id}/issue transitions DRAFT invoice to UNPAID and returns 200 OK")
    void testIssueInvoiceSuccess() throws Exception {
        InvoiceResponse response = createSampleInvoiceResponse(1L, InvoiceStatus.UNPAID);
        when(invoiceService.issueInvoice(1L)).thenReturn(response);

        mockMvc.perform(post("/api/invoices/1/issue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("UNPAID")));
    }

    @Test
    @DisplayName("15. POST /api/invoices/{id}/issue maps InvalidInvoiceStatusException to 400 Bad Request")
    void testIssueInvoiceInvalidStatusMapped() throws Exception {
        when(invoiceService.issueInvoice(1L))
                .thenThrow(new InvalidInvoiceStatusException(1L, InvoiceStatus.UNPAID, "Only DRAFT invoices can be issued"));

        mockMvc.perform(post("/api/invoices/1/issue"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("Invoice [1] in status [UNPAID] cannot be modified")));
    }

    @Test
    @DisplayName("16. POST /api/invoices/{id}/issue maps BR-09 line item validation error to 400 Bad Request")
    void testIssueInvoiceBR09ValidationErrorMapped() throws Exception {
        when(invoiceService.issueInvoice(1L))
                .thenThrow(new BillingValidationException("Invoice must contain at least one line item before issuance"));

        mockMvc.perform(post("/api/invoices/1/issue"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("at least one line item")));
    }

    @Test
    @DisplayName("17. POST /api/invoices/{id}/cancel cancels eligible invoice and returns 200 OK")
    void testCancelInvoiceSuccess() throws Exception {
        InvoiceResponse response = createSampleInvoiceResponse(1L, InvoiceStatus.CANCELLED);
        when(invoiceService.cancelInvoice(1L)).thenReturn(response);

        mockMvc.perform(post("/api/invoices/1/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.status", is("CANCELLED")));
    }

    @Test
    @DisplayName("18. POST /api/invoices/{id}/cancel maps lifecycle exception when cancelling ineligible invoice to 400 Bad Request")
    void testCancelInvoiceLifecycleExceptionMapped() throws Exception {
        when(invoiceService.cancelInvoice(1L))
                .thenThrow(new InvalidInvoiceStatusException(1L, InvoiceStatus.PAID, "PAID invoices cannot be cancelled directly"));

        mockMvc.perform(post("/api/invoices/1/cancel"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")))
                .andExpect(jsonPath("$.message", containsString("PAID invoices cannot be cancelled directly")));
    }

    @Test
    @DisplayName("19. POST /api/invoices/{id}/cancel returns 404 Not Found for missing invoice")
    void testCancelInvoiceNotFound() throws Exception {
        when(invoiceService.cancelInvoice(999L)).thenThrow(new InvoiceNotFoundException(999L));

        mockMvc.perform(post("/api/invoices/999/cancel"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("20. Contract: response body strictly uses InvoiceResponse structure")
    void testResponseBodyUsesInvoiceResponseContract() throws Exception {
        InvoiceResponse response = createSampleInvoiceResponse(1L, InvoiceStatus.DRAFT);
        when(invoiceService.getInvoice(1L)).thenReturn(response);

        mockMvc.perform(get("/api/invoices/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.invoiceNumber").exists())
                .andExpect(jsonPath("$.patientId").exists())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.subtotal").isNumber())
                .andExpect(jsonPath("$.discountAmount").isNumber())
                .andExpect(jsonPath("$.totalAmount").isNumber())
                .andExpect(jsonPath("$.paidAmount").isNumber())
                .andExpect(jsonPath("$.balanceAmount").isNumber())
                .andExpect(jsonPath("$.status").isString())
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    @DisplayName("21. Contract: malformed JSON request body returns 400 Bad Request")
    void testMalformedJsonReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/invoices")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"patientId\": \"not-a-number\", \"items\": [}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("22. Contract: unsupported HTTP method returns 405 Method Not Allowed")
    void testUnsupportedMethodReturnsMethodNotAllowed() throws Exception {
        mockMvc.perform(delete("/api/invoices/1"))
                .andExpect(status().isMethodNotAllowed());
    }
}