package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.CreateInventoryItemRequest;
import com.dentcare.inventory.dto.InventoryItemResponse;
import com.dentcare.inventory.dto.StockStatusFilter;
import com.dentcare.inventory.dto.UpdateInventoryItemRequest;
import com.dentcare.inventory.dto.UpdateInventoryItemStatusRequest;
import com.dentcare.inventory.service.InventoryItemService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * REST controller managing inventory catalog items and lifecycle operations.
 */
@RestController
@RequestMapping("/api/inventory/items")
public class InventoryItemController {

    private final InventoryItemService inventoryItemService;

    public InventoryItemController(InventoryItemService inventoryItemService) {
        this.inventoryItemService = inventoryItemService;
    }

    @PostMapping
    public ResponseEntity<InventoryItemResponse> createItem(@Valid @RequestBody CreateInventoryItemRequest request) {
        InventoryItemResponse created = inventoryItemService.createItem(request);
        URI location = URI.create("/api/inventory/items/" + created.id());
        return ResponseEntity.created(location).body(created);
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryItemResponse> getItemById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryItemService.getItemById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<InventoryItemResponse> updateItem(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInventoryItemRequest request
    ) {
        return ResponseEntity.ok(inventoryItemService.updateItem(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<InventoryItemResponse> updateItemStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInventoryItemStatusRequest request
    ) {
        return ResponseEntity.ok(inventoryItemService.updateItemStatus(id, request.getActive()));
    }

    @GetMapping
    public ResponseEntity<Page<InventoryItemResponse>> searchItems(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) StockStatusFilter stockStatus,
            @PageableDefault(size = 20, sort = "name", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ResponseEntity.ok(inventoryItemService.searchItems(search, category, active, stockStatus, pageable));
    }
}
