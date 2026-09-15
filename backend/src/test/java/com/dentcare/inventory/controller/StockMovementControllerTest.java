package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.AdjustmentDirection;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.InactiveInventoryItemException;
import com.dentcare.inventory.exception.InsufficientStockException;
import com.dentcare.inventory.exception.InvalidMovementException;
import com.dentcare.inventory.exception.InventoryExceptionHandler;
import com.dentcare.inventory.exception.InventoryItemNotFoundException;
import com.dentcare.inventory.service.StockMovementService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(StockMovementController.class)
@Import(InventoryExceptionHandler.class)
class StockMovementControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private StockMovementService stockMovementService;

    private final StockMovementResponse sampleResponse = new StockMovementResponse(
            10L,
            1L,
            "ITM-001",
            "Dental Mirror #4",
            StockMovementType.RECEIVED,
            null,
            10,
            10,
            30,
            LocalDateTime.now(),
            "Shipment received",
            101L,
            null,
            null,
            "LOT-A",
            null
    );

    @Test
    @DisplayName("AC-1 & AC-15: POST /api/inventory/items/{itemId}/movements returns 201 Created and Location header")
    void testRecordMovementSuccess() throws Exception {
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                10,
                "Shipment received",
                101L,
                "LOT-A",
                null,
                null
        );

        when(stockMovementService.recordMovement(eq(1L), any(RecordStockMovementRequest.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/inventory/items/1/movements/10")))
                .andExpect(jsonPath("$.id", is(10)))
                .andExpect(jsonPath("$.movementType", is("RECEIVED")))
                .andExpect(jsonPath("$.quantity", is(10)))
                .andExpect(jsonPath("$.resultingQuantity", is(30)));
    }

    @Test
    @DisplayName("AC-6 & AC-15: POST with quantity <= 0 returns 400 Bad Request")
    void testRecordMovementInvalidQuantity() throws Exception {
        RecordStockMovementRequest invalidRequest = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                0,
                null,
                101L,
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)));
    }

    @Test
    @DisplayName("AC-7 & AC-15: POST with insufficient stock returns 409 Conflict")
    void testRecordMovementInsufficientStock() throws Exception {
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.USED,
                null,
                50,
                "Overuse",
                101L,
                null,
                null,
                null
        );

        when(stockMovementService.recordMovement(eq(1L), any(RecordStockMovementRequest.class)))
                .thenThrow(new InsufficientStockException(1L, 50, 20));

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("Insufficient stock")));
    }

    @Test
    @DisplayName("AC-12 & AC-15: POST for inactive item returns 409 Conflict")
    void testRecordMovementInactiveItem() throws Exception {
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                10,
                null,
                101L,
                null,
                null,
                null
        );

        when(stockMovementService.recordMovement(eq(1L), any(RecordStockMovementRequest.class)))
                .thenThrow(new InactiveInventoryItemException(1L));

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.message", containsString("inactive inventory item")));
    }

    @Test
    @DisplayName("AC-5 & AC-15: POST with invalid ADJUSTED parameters returns 400 Bad Request")
    void testRecordMovementInvalidAdjusted() throws Exception {
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.ADJUSTED,
                null,
                5,
                "No direction",
                101L,
                null,
                null,
                null
        );

        when(stockMovementService.recordMovement(eq(1L), any(RecordStockMovementRequest.class)))
                .thenThrow(new InvalidMovementException("Adjustment direction is required"));

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", containsString("Adjustment direction is required")));
    }

    @Test
    @DisplayName("AC-15: POST for non-existent item returns 404 Not Found")
    void testRecordMovementItemNotFound() throws Exception {
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                5,
                null,
                101L,
                null,
                null,
                null
        );

        when(stockMovementService.recordMovement(eq(999L), any(RecordStockMovementRequest.class)))
                .thenThrow(new InventoryItemNotFoundException(999L));

        mockMvc.perform(post("/api/inventory/items/999/movements")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)));
    }

    @Test
    @DisplayName("AC-14 & AC-15: GET /api/inventory/items/{itemId}/movements returns 200 OK with paginated list")
    void testGetMovementHistory() throws Exception {
        PageImpl<StockMovementResponse> page = new PageImpl<>(
                List.of(sampleResponse),
                PageRequest.of(0, 20),
                1
        );

        when(stockMovementService.getItemMovementHistory(eq(1L), eq(null), any(Pageable.class)))
                .thenReturn(page);

        mockMvc.perform(get("/api/inventory/items/1/movements")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id", is(10)))
                .andExpect(jsonPath("$.content[0].movementType", is("RECEIVED")))
                .andExpect(jsonPath("$.totalElements", is(1)));
    }

    @Test
    @DisplayName("AC-19: POST /api/inventory/items/{itemId}/movements/{movementId}/reverse returns 201 Created")
    void testReverseMovementSuccess() throws Exception {
        com.dentcare.inventory.dto.ReverseStockMovementRequest request =
                new com.dentcare.inventory.dto.ReverseStockMovementRequest("Defective goods returned", 201L);

        StockMovementResponse reversalResponse = new StockMovementResponse(
                99L,
                1L,
                "ITM-001",
                "Dental Mirror #4",
                StockMovementType.ADJUSTED,
                com.dentcare.inventory.entity.AdjustmentDirection.DECREASE,
                10,
                -10,
                20,
                java.time.LocalDateTime.now(),
                "Defective goods returned",
                201L,
                10L,
                null,
                "LOT-A",
                null
        );

        when(stockMovementService.reverseMovement(eq(1L), eq(10L), any(com.dentcare.inventory.dto.ReverseStockMovementRequest.class)))
                .thenReturn(reversalResponse);

        mockMvc.perform(post("/api/inventory/items/1/movements/10/reverse")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/inventory/items/1/movements/99")))
                .andExpect(jsonPath("$.id", is(99)))
                .andExpect(jsonPath("$.movementType", is("ADJUSTED")))
                .andExpect(jsonPath("$.reversalOfMovementId", is(10)));
    }

    @Test
    @DisplayName("AC-19: POST reverse with duplicate reversal returns 409 Conflict")
    void testReverseMovementDuplicate() throws Exception {
        com.dentcare.inventory.dto.ReverseStockMovementRequest request =
                new com.dentcare.inventory.dto.ReverseStockMovementRequest("Duplicate attempt", 201L);

        when(stockMovementService.reverseMovement(eq(1L), eq(10L), any(com.dentcare.inventory.dto.ReverseStockMovementRequest.class)))
                .thenThrow(new com.dentcare.inventory.exception.DuplicateReversalException(10L));

        mockMvc.perform(post("/api/inventory/items/1/movements/10/reverse")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.message", containsString("already been reversed")));
    }

    @Test
    @DisplayName("AC-19: POST reverse with missing movement returns 404 Not Found")
    void testReverseMovementNotFound() throws Exception {
        com.dentcare.inventory.dto.ReverseStockMovementRequest request =
                new com.dentcare.inventory.dto.ReverseStockMovementRequest("Missing movement", 201L);

        when(stockMovementService.reverseMovement(eq(1L), eq(999L), any(com.dentcare.inventory.dto.ReverseStockMovementRequest.class)))
                .thenThrow(new com.dentcare.inventory.exception.StockMovementNotFoundException(999L));

        mockMvc.perform(post("/api/inventory/items/1/movements/999/reverse")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)));
    }

    @Test
    @DisplayName("AC-19: POST reverse with blank reason returns 400 Bad Request")
    void testReverseMovementBlankReason() throws Exception {
        com.dentcare.inventory.dto.ReverseStockMovementRequest request =
                new com.dentcare.inventory.dto.ReverseStockMovementRequest("   ", 201L);

        mockMvc.perform(post("/api/inventory/items/1/movements/10/reverse")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)));
    }

    @Test
    @DisplayName("AC-5: POST movement with authenticated staff user binds user ID from session context")
    void testRecordMovementAuthenticatedStaffBindsUserId() throws Exception {
        com.dentcare.security.model.DentCareUserDetails staff = new com.dentcare.security.model.DentCareUserDetails(
                55L, "assistant@dentcare.com", "hash", "Dental", "Assistant", null,
                com.dentcare.security.entity.Role.DENTAL_ASSISTANT, true
        );

        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                10,
                "Restock delivery",
                null, // client does NOT send user ID
                "LOT-B",
                null,
                null
        );

        org.mockito.ArgumentCaptor<RecordStockMovementRequest> captor =
                org.mockito.ArgumentCaptor.forClass(RecordStockMovementRequest.class);
        when(stockMovementService.recordMovement(eq(1L), captor.capture()))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(staff))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        org.assertj.core.api.Assertions.assertThat(captor.getValue().getResponsibleUserId()).isEqualTo(55L);
    }

    @Test
    @DisplayName("AC-10: POST movement unauthenticated without user ID returns 401 Unauthorized")
    void testRecordMovementUnauthenticatedReturns401() throws Exception {
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                10,
                "Anonymous attempt",
                null, // no user ID
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")));
    }

    @Test
    @DisplayName("AC-10: POST movement with PATIENT role returns 403 Forbidden")
    void testRecordMovementPatientRoleReturns403() throws Exception {
        com.dentcare.security.model.DentCareUserDetails patient = new com.dentcare.security.model.DentCareUserDetails(
                99L, "patient@example.com", "hash", "John", "Doe", null,
                com.dentcare.security.entity.Role.PATIENT, true
        );

        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                10,
                "Patient attempt",
                null,
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(patient))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")));
    }

    @Test
    @DisplayName("AC-5 & AC-6: POST reverse with authenticated staff user binds user ID from session context")
    void testReverseMovementAuthenticatedStaffBindsUserId() throws Exception {
        com.dentcare.security.model.DentCareUserDetails dentist = new com.dentcare.security.model.DentCareUserDetails(
                77L, "dentist@dentcare.com", "hash", "Doc", "Smith", null,
                com.dentcare.security.entity.Role.DENTIST, true
        );

        com.dentcare.inventory.dto.ReverseStockMovementRequest request =
                new com.dentcare.inventory.dto.ReverseStockMovementRequest("Damaged on arrival", null);

        org.mockito.ArgumentCaptor<com.dentcare.inventory.dto.ReverseStockMovementRequest> captor =
                org.mockito.ArgumentCaptor.forClass(com.dentcare.inventory.dto.ReverseStockMovementRequest.class);
        when(stockMovementService.reverseMovement(eq(1L), eq(10L), captor.capture()))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/inventory/items/1/movements/10/reverse")
                        .with(csrf())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(dentist))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        org.assertj.core.api.Assertions.assertThat(captor.getValue().getResponsibleUserId()).isEqualTo(77L);
    }

    @Test
    @DisplayName("AC-10: POST reverse unauthenticated without user ID returns 401 Unauthorized")
    void testReverseMovementUnauthenticatedReturns401() throws Exception {
        com.dentcare.inventory.dto.ReverseStockMovementRequest request =
                new com.dentcare.inventory.dto.ReverseStockMovementRequest("Reversal reason", null);

        mockMvc.perform(post("/api/inventory/items/1/movements/10/reverse")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.error", is("Unauthorized")));
    }

    @Test
    @DisplayName("AC-10: POST reverse with PATIENT role returns 403 Forbidden")
    void testReverseMovementPatientRoleReturns403() throws Exception {
        com.dentcare.security.model.DentCareUserDetails patient = new com.dentcare.security.model.DentCareUserDetails(
                99L, "patient@example.com", "hash", "John", "Doe", null,
                com.dentcare.security.entity.Role.PATIENT, true
        );

        com.dentcare.inventory.dto.ReverseStockMovementRequest request =
                new com.dentcare.inventory.dto.ReverseStockMovementRequest("Patient reversal", null);

        mockMvc.perform(post("/api/inventory/items/1/movements/10/reverse")
                        .with(csrf())
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(patient))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status", is(403)))
                .andExpect(jsonPath("$.error", is("Forbidden")));
    }
}
