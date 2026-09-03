package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.InventoryBatchResponse;
import com.dentcare.inventory.exception.InventoryExceptionHandler;
import com.dentcare.inventory.service.InventoryBatchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
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

@WebMvcTest(InventoryBatchController.class)
@Import(InventoryExceptionHandler.class)
class InventoryBatchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InventoryBatchService inventoryBatchService;

    @Test
    @DisplayName("AC-32 & AC-34: GET /api/inventory/batches returns 200 OK with paginated list")
    void testSearchBatches() throws Exception {
        InventoryBatchResponse response = new InventoryBatchResponse(
                10L,
                1L,
                "ITM-001",
                "Composite A2",
                "LOT-ABC",
                LocalDate.of(2027, 12, 31),
                15,
                LocalDate.of(2026, 1, 15),
                "SupplierX"
        );

        when(inventoryBatchService.searchBatches(any(), any(), any(), any(), eq(false), any()))
                .thenReturn(new PageImpl<>(List.of(response), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/inventory/batches")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id", is(10)))
                .andExpect(jsonPath("$.content[0].batchNumber", is("LOT-ABC")))
                .andExpect(jsonPath("$.content[0].quantityOnHand", is(15)))
                .andExpect(jsonPath("$.totalElements", is(1)));
    }

    @Test
    @DisplayName("AC-33: GET /api/inventory/items/{itemId}/batches returns 200 OK with item batches")
    void testGetBatchesForItem() throws Exception {
        InventoryBatchResponse response = new InventoryBatchResponse(
                11L,
                1L,
                "ITM-001",
                "Composite A2",
                "LOT-DEF",
                LocalDate.of(2027, 6, 30),
                8,
                LocalDate.of(2026, 2, 10),
                "SupplierY"
        );

        when(inventoryBatchService.getBatchesForItem(eq(1L), eq(true), any()))
                .thenReturn(new PageImpl<>(List.of(response), PageRequest.of(0, 50), 1));

        mockMvc.perform(get("/api/inventory/items/1/batches"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id", is(11)))
                .andExpect(jsonPath("$.content[0].batchNumber", is("LOT-DEF")))
                .andExpect(jsonPath("$.content[0].quantityOnHand", is(8)));
    }

    @Test
    @DisplayName("AC-32: GET /api/inventory/batches with invalid date range returns 400 Bad Request")
    void testSearchBatchesInvalidDateRange() throws Exception {
        when(inventoryBatchService.searchBatches(any(), any(), eq(LocalDate.of(2027, 6, 1)), eq(LocalDate.of(2027, 1, 1)), eq(false), any()))
                .thenThrow(new IllegalArgumentException("expiryFrom cannot be after expiryTo"));

        mockMvc.perform(get("/api/inventory/batches")
                        .param("expiryFrom", "2027-06-01")
                        .param("expiryTo", "2027-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.message", is("expiryFrom cannot be after expiryTo")));
    }
}
