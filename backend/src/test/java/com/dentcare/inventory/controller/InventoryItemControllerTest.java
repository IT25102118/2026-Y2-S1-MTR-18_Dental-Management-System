package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.CreateInventoryItemRequest;
import com.dentcare.inventory.dto.InventoryItemResponse;
import com.dentcare.inventory.dto.StockStatusFilter;
import com.dentcare.inventory.dto.UpdateInventoryItemRequest;
import com.dentcare.inventory.dto.UpdateInventoryItemStatusRequest;
import com.dentcare.inventory.exception.DuplicateItemCodeException;
import com.dentcare.inventory.exception.InventoryExceptionHandler;
import com.dentcare.inventory.exception.InventoryItemNotFoundException;
import com.dentcare.inventory.service.InventoryItemService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
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
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InventoryItemController.class)
@Import(InventoryExceptionHandler.class)
class InventoryItemControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private InventoryItemService inventoryItemService;

    private final InventoryItemResponse sampleResponse = new InventoryItemResponse(
            1L,
            "ITM-001",
            "Dental Mirror #4",
            "Diagnostic",
            "piece",
            10,
            25,
            true,
            "DentSupplies",
            false,
            LocalDateTime.now(),
            LocalDateTime.now()
    );

    @Test
    @DisplayName("AC-1: POST /api/inventory/items returns 201 Created and Location header")
    void testCreateItemSuccess() throws Exception {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "ITM-001",
                "Dental Mirror #4",
                "Diagnostic",
                "piece",
                10,
                "DentSupplies"
        );

        when(inventoryItemService.createItem(any(CreateInventoryItemRequest.class)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post("/api/inventory/items")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/inventory/items/1")))
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.itemCode", is("ITM-001")))
                .andExpect(jsonPath("$.name", is("Dental Mirror #4")))
                .andExpect(jsonPath("$.currentQuantity", is(25)))
                .andExpect(jsonPath("$.active", is(true)));
    }

    @Test
    @DisplayName("AC-3: POST /api/inventory/items with invalid inputs returns 400 Bad Request with field errors")
    void testCreateItemValidationFailure() throws Exception {
        CreateInventoryItemRequest invalidRequest = new CreateInventoryItemRequest(
                "",
                "",
                "Diagnostic",
                "",
                -5,
                null
        );

        mockMvc.perform(post("/api/inventory/items")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("itemCode")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("name")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("unit")))
                .andExpect(jsonPath("$.fieldErrors", hasKey("reorderLevel")));
    }

    @Test
    @DisplayName("AC-2: POST /api/inventory/items with duplicate code returns 409 Conflict")
    void testCreateItemDuplicateCodeConflict() throws Exception {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "ITM-DUP",
                "Composite Syringe",
                "Restorative",
                "syringe",
                5,
                null
        );

        when(inventoryItemService.createItem(any(CreateInventoryItemRequest.class)))
                .thenThrow(new DuplicateItemCodeException("ITM-DUP"));

        mockMvc.perform(post("/api/inventory/items")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("ITM-DUP")));
    }

    @Test
    @DisplayName("AC-4: GET /api/inventory/items/{id} returns 200 OK for existing item")
    void testGetItemByIdSuccess() throws Exception {
        when(inventoryItemService.getItemById(1L)).thenReturn(sampleResponse);

        mockMvc.perform(get("/api/inventory/items/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.itemCode", is("ITM-001")))
                .andExpect(jsonPath("$.name", is("Dental Mirror #4")));
    }

    @Test
    @DisplayName("AC-4: GET /api/inventory/items/{id} returns 404 Not Found for missing item")
    void testGetItemByIdNotFound() throws Exception {
        when(inventoryItemService.getItemById(999L))
                .thenThrow(new InventoryItemNotFoundException(999L));

        mockMvc.perform(get("/api/inventory/items/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.error", is("Not Found")))
                .andExpect(jsonPath("$.message", containsString("999")));
    }

    @Test
    @DisplayName("AC-5 & AC-6: PUT /api/inventory/items/{id} updates catalog fields and returns 200 OK")
    void testUpdateItemSuccess() throws Exception {
        UpdateInventoryItemRequest request = new UpdateInventoryItemRequest(
                "Dental Mirror #4 Deluxe",
                "Diagnostic",
                "piece",
                15,
                "NewDent"
        );

        InventoryItemResponse updatedResponse = new InventoryItemResponse(
                1L,
                "ITM-001",
                "Dental Mirror #4 Deluxe",
                "Diagnostic",
                "piece",
                15,
                25,
                true,
                "NewDent",
                false,
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(inventoryItemService.updateItem(eq(1L), any(UpdateInventoryItemRequest.class)))
                .thenReturn(updatedResponse);

        mockMvc.perform(put("/api/inventory/items/1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.name", is("Dental Mirror #4 Deluxe")))
                .andExpect(jsonPath("$.reorderLevel", is(15)));
    }

    @Test
    @DisplayName("AC-7: PATCH /api/inventory/items/{id}/status toggles active status and returns 200 OK")
    void testUpdateItemStatusSuccess() throws Exception {
        UpdateInventoryItemStatusRequest request = new UpdateInventoryItemStatusRequest(false);

        InventoryItemResponse deactivatedResponse = new InventoryItemResponse(
                1L,
                "ITM-001",
                "Dental Mirror #4",
                "Diagnostic",
                "piece",
                10,
                25,
                false,
                "DentSupplies",
                false,
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(inventoryItemService.updateItemStatus(1L, false))
                .thenReturn(deactivatedResponse);

        mockMvc.perform(patch("/api/inventory/items/1/status")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.active", is(false)));
    }

    @Test
    @DisplayName("AC-3 & AC-7: PATCH /api/inventory/items/{id}/status with null active returns 400 Bad Request")
    void testUpdateItemStatusNullActive() throws Exception {
        UpdateInventoryItemStatusRequest request = new UpdateInventoryItemStatusRequest(null);

        mockMvc.perform(patch("/api/inventory/items/1/status")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.fieldErrors", hasKey("active")));
    }

    @Test
    @DisplayName("AC-8 & AC-9: GET /api/inventory/items returns paginated 200 OK response")
    void testSearchItems() throws Exception {
        PageImpl<InventoryItemResponse> page = new PageImpl<>(
                List.of(sampleResponse),
                PageRequest.of(0, 20),
                1
        );

        when(inventoryItemService.searchItems(
                eq("mirror"),
                eq("Diagnostic"),
                eq(true),
                eq(StockStatusFilter.IN_STOCK),
                any(Pageable.class)
        )).thenReturn(page);

        mockMvc.perform(get("/api/inventory/items")
                        .param("search", "mirror")
                        .param("category", "Diagnostic")
                        .param("active", "true")
                        .param("stockStatus", "IN_STOCK")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id", is(1)))
                .andExpect(jsonPath("$.content[0].itemCode", is("ITM-001")))
                .andExpect(jsonPath("$.totalElements", is(1)));
    }

    @Test
    @DisplayName("AC-2: POST /api/inventory/items on database unique constraint collision returns 409 Conflict")
    void testCreateItemDataIntegrityViolationConflict() throws Exception {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "ITM-DUP",
                "Composite Syringe",
                "Restorative",
                "syringe",
                5,
                null
        );

        when(inventoryItemService.createItem(any(CreateInventoryItemRequest.class)))
                .thenThrow(new DataIntegrityViolationException("Unique index or primary key violation: item_code"));

        mockMvc.perform(post("/api/inventory/items")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status", is(409)))
                .andExpect(jsonPath("$.error", is("Conflict")))
                .andExpect(jsonPath("$.message", containsString("already exists")));
    }

    @Test
    @DisplayName("AC-2: POST /api/inventory/items with malformed JSON body returns 400 Bad Request")
    void testCreateItemMalformedJsonReturns400() throws Exception {
        mockMvc.perform(post("/api/inventory/items")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{invalid-json-body"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("AC-3: GET /api/inventory/items with invalid stockStatus returns 400 Bad Request")
    void testSearchItemsInvalidStockStatusReturns400() throws Exception {
        mockMvc.perform(get("/api/inventory/items")
                        .param("stockStatus", "NOT_A_VALID_STATUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }
}

