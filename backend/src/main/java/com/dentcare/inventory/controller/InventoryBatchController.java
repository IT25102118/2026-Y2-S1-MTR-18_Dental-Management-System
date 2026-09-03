package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.InventoryBatchResponse;
import com.dentcare.inventory.service.InventoryBatchService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * REST controller for querying and searching inventory batches.
 */
@RestController
@RequestMapping("/api/inventory")
public class InventoryBatchController {

    private final InventoryBatchService inventoryBatchService;

    public InventoryBatchController(InventoryBatchService inventoryBatchService) {
        this.inventoryBatchService = inventoryBatchService;
    }

    @GetMapping("/batches")
    public ResponseEntity<Page<InventoryBatchResponse>> searchBatches(
            @RequestParam(required = false) Long itemId,
            @RequestParam(required = false) String batchNumber,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate expiryTo,
            @RequestParam(required = false, defaultValue = "false") boolean positiveStockOnly,
            @PageableDefault(size = 20, sort = "expiryDate", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<InventoryBatchResponse> response = inventoryBatchService.searchBatches(
                itemId,
                batchNumber,
                expiryFrom,
                expiryTo,
                positiveStockOnly,
                pageable
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/items/{itemId}/batches")
    public ResponseEntity<Page<InventoryBatchResponse>> getBatchesForItem(
            @PathVariable Long itemId,
            @RequestParam(required = false, defaultValue = "true") boolean positiveStockOnly,
            @PageableDefault(size = 50, sort = "expiryDate", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        Page<InventoryBatchResponse> response = inventoryBatchService.getBatchesForItem(
                itemId,
                positiveStockOnly,
                pageable
        );
        return ResponseEntity.ok(response);
    }
}
