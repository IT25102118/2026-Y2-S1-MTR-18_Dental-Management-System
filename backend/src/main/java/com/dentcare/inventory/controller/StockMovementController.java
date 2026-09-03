package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.service.StockMovementService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * REST controller for recording stock movements and viewing movement history for inventory items.
 */
@RestController
@RequestMapping("/api/inventory/items/{itemId}/movements")
public class StockMovementController {

    private final StockMovementService stockMovementService;

    public StockMovementController(StockMovementService stockMovementService) {
        this.stockMovementService = stockMovementService;
    }

    @PostMapping
    public ResponseEntity<StockMovementResponse> recordMovement(
            @PathVariable Long itemId,
            @Valid @RequestBody RecordStockMovementRequest request
    ) {
        StockMovementResponse response = stockMovementService.recordMovement(itemId, request);
        URI location = URI.create(String.format("/api/inventory/items/%d/movements/%d", itemId, response.id()));
        return ResponseEntity.created(location).body(response);
    }

    @GetMapping
    public ResponseEntity<Page<StockMovementResponse>> getMovementHistory(
            @PathVariable Long itemId,
            @RequestParam(required = false) StockMovementType movementType,
            @PageableDefault(size = 20, sort = "occurredAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(stockMovementService.getItemMovementHistory(itemId, movementType, pageable));
    }
}
