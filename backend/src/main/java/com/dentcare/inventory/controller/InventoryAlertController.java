package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.LowStockAlertResponse;
import com.dentcare.inventory.service.InventoryAlertService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for retrieving operational inventory alerts.
 */
@RestController
@RequestMapping("/api/inventory/alerts")
public class InventoryAlertController {

    private final InventoryAlertService inventoryAlertService;

    public InventoryAlertController(InventoryAlertService inventoryAlertService) {
        this.inventoryAlertService = inventoryAlertService;
    }

    @GetMapping("/low-stock")
    public ResponseEntity<Page<LowStockAlertResponse>> getLowStockAlerts(
            @RequestParam(required = false) String category,
            @PageableDefault(size = 20, sort = "currentQuantity", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ResponseEntity.ok(inventoryAlertService.getLowStockAlerts(category, pageable));
    }
}
