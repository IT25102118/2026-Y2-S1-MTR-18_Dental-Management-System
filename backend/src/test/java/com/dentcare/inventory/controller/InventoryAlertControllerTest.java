package com.dentcare.inventory.controller;

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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

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
}
