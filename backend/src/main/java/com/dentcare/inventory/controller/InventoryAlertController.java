package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.ExpiryAlertResponse;
import com.dentcare.inventory.dto.LowStockAlertResponse;
import com.dentcare.inventory.service.InventoryAlertService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

//  Spring Boot that this class is a REST API controller.
@RestController
@RequestMapping("/api/inventory/alerts")
public class InventoryAlertController {

    private final InventoryAlertService inventoryAlertService;

    // constructor dependency injection.
    public InventoryAlertController(InventoryAlertService inventoryAlertService) {
        this.inventoryAlertService = inventoryAlertService;
    }

    // This method creates the low-stock alert API endpoint
    @GetMapping("/low-stock")
    // Get low stock Alerts
    public ResponseEntity<Page<LowStockAlertResponse>> getLowStockAlerts(
            @RequestParam(required = false) String category,
            @PageableDefault(size = 20, sort = "currentQuantity", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(inventoryAlertService.getLowStockAlerts(category, pageable));
    }

    // This method creates the expiry alert API endpoint.
    @GetMapping("/expiry")
    // Get Expiry Alerts
    public ResponseEntity<Page<ExpiryAlertResponse>> getExpiryAlerts(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate through,
            @PageableDefault(size = 20, sort = "expiryDate", direction = Sort.Direction.ASC) Pageable pageable) {
        return ResponseEntity.ok(inventoryAlertService.getExpiryAlerts(through, pageable));
    }
}
