package com.dentcare.inventory.security;

import com.dentcare.inventory.controller.InventoryAlertController;
import com.dentcare.inventory.controller.InventoryBatchController;
import com.dentcare.inventory.controller.InventoryItemController;
import com.dentcare.inventory.controller.StockMovementController;
import com.dentcare.inventory.dto.CreateInventoryItemRequest;
import com.dentcare.inventory.dto.InventoryBatchResponse;
import com.dentcare.inventory.dto.InventoryItemResponse;
import com.dentcare.inventory.dto.LowStockAlertResponse;
import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.ReverseStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.dto.UpdateInventoryItemRequest;
import com.dentcare.inventory.dto.UpdateInventoryItemStatusRequest;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.InventoryExceptionHandler;
import com.dentcare.inventory.service.InventoryAlertService;
import com.dentcare.inventory.service.InventoryBatchService;
import com.dentcare.inventory.service.InventoryItemService;
import com.dentcare.inventory.service.StockMovementService;
import com.dentcare.security.config.SecurityConfig;
import com.dentcare.security.entity.Role;
import com.dentcare.security.model.DentCareUserDetails;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Security integration tests verifying role authorization and authenticated principal binding
 * across all /api/inventory endpoints.
 */
@WebMvcTest({
        InventoryItemController.class,
        InventoryBatchController.class,
        InventoryAlertController.class,
        StockMovementController.class
})
@Import({SecurityConfig.class, InventoryExceptionHandler.class})
class InventorySecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private InventoryItemService inventoryItemService;

    @MockitoBean
    private InventoryBatchService inventoryBatchService;

    @MockitoBean
    private InventoryAlertService inventoryAlertService;

    @MockitoBean
    private StockMovementService stockMovementService;

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

    private final InventoryItemResponse sampleItemResponse = new InventoryItemResponse(
            1L, "ITM-001", "Dental Mirror #4", "Diagnostic", "piece", 10, 25, true,
            "DentSupplies", false, LocalDateTime.now(), LocalDateTime.now()
    );

    private final StockMovementResponse sampleMovementResponse = new StockMovementResponse(
            10L, 1L, "ITM-001", "Dental Mirror #4", StockMovementType.RECEIVED, null,
            10, 10, 35, LocalDateTime.now(), "Restock", 3L, null, null, "LOT-A", null
    );

    // =========================================================================
    // AC-1: Anonymous Access to Protected Inventory Endpoints is Rejected (401)
    // =========================================================================

    @Test
    @DisplayName("AC-1: Anonymous GET /api/inventory/items returns 401 Unauthorized")
    void testAnonymousGetItemsReturns401() throws Exception {
        mockMvc.perform(get("/api/inventory/items"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("AC-1: Anonymous GET /api/inventory/items/{id} returns 401 Unauthorized")
    void testAnonymousGetItemByIdReturns401() throws Exception {
        mockMvc.perform(get("/api/inventory/items/1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("AC-1: Anonymous POST /api/inventory/items returns 401 Unauthorized")
    void testAnonymousPostItemReturns401() throws Exception {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "ITM-NEW", "Explorer Probe", "Diagnostic", "piece", 5, "Vendor"
        );
        mockMvc.perform(post("/api/inventory/items")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("AC-1: Anonymous PUT /api/inventory/items/{id} returns 401 Unauthorized")
    void testAnonymousPutItemReturns401() throws Exception {
        UpdateInventoryItemRequest request = new UpdateInventoryItemRequest(
                "Updated Mirror", "Diagnostic", "piece", 15, "Vendor"
        );
        mockMvc.perform(put("/api/inventory/items/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("AC-1: Anonymous PATCH /api/inventory/items/{id}/status returns 401 Unauthorized")
    void testAnonymousPatchItemStatusReturns401() throws Exception {
        UpdateInventoryItemStatusRequest request = new UpdateInventoryItemStatusRequest(false);
        mockMvc.perform(patch("/api/inventory/items/1/status")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("AC-1: Anonymous GET /api/inventory/batches returns 401 Unauthorized")
    void testAnonymousGetBatchesReturns401() throws Exception {
        mockMvc.perform(get("/api/inventory/batches"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("AC-1: Anonymous GET /api/inventory/alerts/low-stock returns 401 Unauthorized")
    void testAnonymousGetLowStockAlertsReturns401() throws Exception {
        mockMvc.perform(get("/api/inventory/alerts/low-stock"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("AC-1: Anonymous GET /api/inventory/alerts/expiry returns 401 Unauthorized")
    void testAnonymousGetExpiryAlertsReturns401() throws Exception {
        mockMvc.perform(get("/api/inventory/alerts/expiry?through=2026-12-31"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("AC-1: Anonymous GET /api/inventory/items/{id}/movements returns 401 Unauthorized")
    void testAnonymousGetMovementsReturns401() throws Exception {
        mockMvc.perform(get("/api/inventory/items/1/movements"))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // AC-2: Permitted Authenticated Staff Roles Can Access Inventory
    // =========================================================================

    @Test
    @DisplayName("AC-2: ADMINISTRATOR can search inventory items")
    void testAdminCanSearchItems() throws Exception {
        when(inventoryItemService.searchItems(any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(sampleItemResponse), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/inventory/items")
                        .with(user(adminUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].itemCode").value("ITM-001"));
    }

    @Test
    @DisplayName("AC-2: RECEPTIONIST can view inventory catalog items")
    void testReceptionistCanSearchItems() throws Exception {
        when(inventoryItemService.searchItems(any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(sampleItemResponse), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/inventory/items")
                        .with(user(receptionistUser)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("AC-2: DENTIST can retrieve item by ID")
    void testDentistCanGetItemById() throws Exception {
        when(inventoryItemService.getItemById(1L)).thenReturn(sampleItemResponse);

        mockMvc.perform(get("/api/inventory/items/1")
                        .with(user(dentistUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.itemCode").value("ITM-001"));
    }

    @Test
    @DisplayName("AC-2: DENTAL_ASSISTANT can record a stock movement")
    void testAssistantCanRecordMovement() throws Exception {
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 10, "Restock", null, "LOT-A", null, null
        );

        when(stockMovementService.recordMovement(eq(1L), any(RecordStockMovementRequest.class)))
                .thenReturn(sampleMovementResponse);

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .with(user(assistantUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    // =========================================================================
    // AC-3: Non-Authorized Role (PATIENT) is Rejected with 403 Forbidden
    // =========================================================================

    @Test
    @DisplayName("AC-3: PATIENT role cannot search inventory items (403 Forbidden)")
    void testPatientCannotSearchItems() throws Exception {
        mockMvc.perform(get("/api/inventory/items")
                        .with(user(patientUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AC-3: PATIENT role cannot create inventory items (403 Forbidden)")
    void testPatientCannotCreateItem() throws Exception {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "ITM-P", "Item", "Category", "piece", 5, null
        );
        mockMvc.perform(post("/api/inventory/items")
                        .with(csrf())
                        .with(user(patientUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AC-3: PATIENT role cannot record stock movements (403 Forbidden)")
    void testPatientCannotRecordMovement() throws Exception {
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.USED, null, 1, "Patient attempt", null, null, null, null
        );
        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .with(user(patientUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AC-3: PATIENT role cannot reverse stock movements (403 Forbidden)")
    void testPatientCannotReverseMovement() throws Exception {
        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Reversal", null);
        mockMvc.perform(post("/api/inventory/items/1/movements/10/reverse")
                        .with(csrf())
                        .with(user(patientUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("AC-3: PATIENT role cannot view low stock alerts (403 Forbidden)")
    void testPatientCannotViewAlerts() throws Exception {
        mockMvc.perform(get("/api/inventory/alerts/low-stock")
                        .with(user(patientUser)))
                .andExpect(status().isForbidden());
    }

    // =========================================================================
    // AC-4: Anonymous Caller Cannot Record Movement with Forged responsibleUserId
    // =========================================================================

    @Test
    @DisplayName("AC-4: Anonymous caller sending forged responsibleUserId returns 401 Unauthorized")
    void testAnonymousWithForgedUserIdReturns401() throws Exception {
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 10, "Forged attempt", 1L, "LOT-FORGE", null, null
        );
        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    // =========================================================================
    // AC-5: Authenticated Principal Authoritatively Binds responsibleUserId
    // =========================================================================

    @Test
    @DisplayName("AC-5: Authenticated Dentist (ID 3) cannot forge responsibleUserId=999; principal ID 3 is authoritatively bound")
    void testAuthenticatedUserCannotForgeResponsibleUserId() throws Exception {
        // Request payload specifies forged responsibleUserId = 999
        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 10, "Delivery", 999L, "LOT-X", null, null
        );

        ArgumentCaptor<RecordStockMovementRequest> captor = ArgumentCaptor.forClass(RecordStockMovementRequest.class);
        when(stockMovementService.recordMovement(eq(1L), captor.capture()))
                .thenReturn(sampleMovementResponse);

        mockMvc.perform(post("/api/inventory/items/1/movements")
                        .with(csrf())
                        .with(user(dentistUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Verifies the service received the authenticated dentist's user ID (3L), NOT the forged 999L
        assertThat(captor.getValue().getResponsibleUserId()).isEqualTo(3L);
    }

    // =========================================================================
    // AC-6: Stock Movement Reversal Follows Same Authenticated Principal Rule
    // =========================================================================

    @Test
    @DisplayName("AC-6: Anonymous caller sending forged responsibleUserId for reversal returns 401 Unauthorized")
    void testAnonymousReversalWithForgedUserIdReturns401() throws Exception {
        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Reversal", 1L);
        mockMvc.perform(post("/api/inventory/items/1/movements/10/reverse")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("AC-6: Authenticated Assistant (ID 4) cannot forge reversal responsibleUserId=888; principal ID 4 is authoritatively bound")
    void testAuthenticatedReversalCannotForgeResponsibleUserId() throws Exception {
        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Reversal reason", 888L);

        ArgumentCaptor<ReverseStockMovementRequest> captor = ArgumentCaptor.forClass(ReverseStockMovementRequest.class);
        when(stockMovementService.reverseMovement(eq(1L), eq(10L), captor.capture()))
                .thenReturn(sampleMovementResponse);

        mockMvc.perform(post("/api/inventory/items/1/movements/10/reverse")
                        .with(csrf())
                        .with(user(assistantUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        // Verifies the service received the authenticated assistant's user ID (4L), NOT the forged 888L
        assertThat(captor.getValue().getResponsibleUserId()).isEqualTo(4L);
    }
}
