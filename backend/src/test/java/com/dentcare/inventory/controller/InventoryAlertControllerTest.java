package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.ExpiryAlertResponse;
import com.dentcare.inventory.dto.LowStockAlertResponse;
import com.dentcare.inventory.exception.InventoryExceptionHandler;
import com.dentcare.inventory.service.InventoryAlertService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InventoryAlertController.class)
@Import(InventoryExceptionHandler.class)
@WithMockUser(roles = "DENTAL_ASSISTANT")
class InventoryAlertControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InventoryAlertService inventoryAlertService;

    @Test
    @DisplayName("AC-20 & AC-24: GET /api/inventory/alerts/low-stock returns 200 OK with paginated alerts")
    void testGetLowStockAlerts() throws Exception {
        LowStockAlertResponse alert = new LowStockAlertResponse(
                1L,
                "ITM-001",
                "Dental Mirror",
                "Diagnostic",
                "piece",
                2,
                10,
                8,
                false,
                "MirrorDirect"
        );

        when(inventoryAlertService.getLowStockAlerts(eq(null), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(alert), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/inventory/alerts/low-stock")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].itemCode", is("ITM-001")))
                .andExpect(jsonPath("$.content[0].currentQuantity", is(2)))
                .andExpect(jsonPath("$.content[0].reorderLevel", is(10)))
                .andExpect(jsonPath("$.content[0].deficit", is(8)))
                .andExpect(jsonPath("$.content[0].outOfStock", is(false)))
                .andExpect(jsonPath("$.totalElements", is(1)));
    }

    @Test
    @DisplayName("AC-27, AC-29 & AC-34: GET /api/inventory/alerts/expiry returns 200 OK with paginated expiry alerts")
    void testGetExpiryAlerts() throws Exception {
        LocalDate expDate = LocalDate.now().plusDays(10);
        ExpiryAlertResponse alert = new ExpiryAlertResponse(
                5L,
                1L,
                "ITM-001",
                "Dental Mirror",
                "Diagnostic",
                "piece",
                "LOT-EXP-1",
                12,
                expDate,
                "EXPIRING",
                10L,
                "MirrorDirect"
        );

        when(inventoryAlertService.getExpiryAlerts(any(LocalDate.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(alert), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/inventory/alerts/expiry")
                        .param("through", expDate.toString())
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].batchId", is(5)))
                .andExpect(jsonPath("$.content[0].batchNumber", is("LOT-EXP-1")))
                .andExpect(jsonPath("$.content[0].quantityOnHand", is(12)))
                .andExpect(jsonPath("$.content[0].status", is("EXPIRING")))
                .andExpect(jsonPath("$.totalElements", is(1)));
    }

    @Test
    @DisplayName("AC-31: GET /api/inventory/alerts/expiry with past through date returns 400 Bad Request")
    void testGetExpiryAlertsPastDateReturns400() throws Exception {
        LocalDate pastDate = LocalDate.now().minusDays(1);
        when(inventoryAlertService.getExpiryAlerts(eq(pastDate), any(Pageable.class)))
                .thenThrow(new IllegalArgumentException("through date must not be in the past: " + pastDate));

        mockMvc.perform(get("/api/inventory/alerts/expiry")
                        .param("through", pastDate.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", is("through date must not be in the past: " + pastDate)));
    }
}
