package com.dentcare.inventory.controller;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.ReverseStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.InventoryErrorResponse;
import com.dentcare.inventory.service.StockMovementService;
import com.dentcare.security.entity.Role;
import com.dentcare.security.model.DentCareUserDetails;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.function.Consumer;

/**
 * REST controller for recording stock movements and viewing movement history for inventory items.
 * Movements and reversals are authoritatively associated with the authenticated acting user.
 */
@RestController
@RequestMapping("/api/inventory/items/{itemId}/movements")
public class StockMovementController {

    private final StockMovementService stockMovementService;

    public StockMovementController(StockMovementService stockMovementService) {
        this.stockMovementService = stockMovementService;
    }

    @PostMapping
    public ResponseEntity<?> recordMovement(
            @PathVariable Long itemId,
            @Valid @RequestBody RecordStockMovementRequest request,
            @AuthenticationPrincipal DentCareUserDetails userDetails
    ) {
        ResponseEntity<?> authError = authorizeAndBindUser(userDetails, request.getResponsibleUserId(), request::setResponsibleUserId);
        if (authError != null) {
            return authError;
        }
        StockMovementResponse response = stockMovementService.recordMovement(itemId, request);
        URI location = URI.create(String.format("/api/inventory/items/%d/movements/%d", itemId, response.id()));
        return ResponseEntity.created(location).body(response);
    }

    @PostMapping("/{movementId}/reverse")
    public ResponseEntity<?> reverseMovement(
            @PathVariable Long itemId,
            @PathVariable Long movementId,
            @Valid @RequestBody ReverseStockMovementRequest request,
            @AuthenticationPrincipal DentCareUserDetails userDetails
    ) {
        ResponseEntity<?> authError = authorizeAndBindUser(userDetails, request.getResponsibleUserId(), request::setResponsibleUserId);
        if (authError != null) {
            return authError;
        }
        StockMovementResponse response = stockMovementService.reverseMovement(itemId, movementId, request);
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

    private ResponseEntity<?> authorizeAndBindUser(
            DentCareUserDetails userDetails,
            Long requestResponsibleUserId,
            Consumer<Long> userIdConsumer
    ) {
        if (userDetails != null) {
            if (userDetails.getRole() == Role.PATIENT) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(InventoryErrorResponse.of(HttpStatus.FORBIDDEN.value(), "Forbidden", "Patients are not authorized to perform stock movements"));
            }
            userIdConsumer.accept(userDetails.getId());
            return null;
        }

        if (requestResponsibleUserId != null) {
            userIdConsumer.accept(requestResponsibleUserId);
            return null;
        }

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(InventoryErrorResponse.of(HttpStatus.UNAUTHORIZED.value(), "Unauthorized", "Authentication required to perform stock movements"));
    }
}
