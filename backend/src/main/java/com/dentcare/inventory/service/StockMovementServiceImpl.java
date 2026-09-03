package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.AdjustmentDirection;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.entity.StockMovement;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.InactiveInventoryItemException;
import com.dentcare.inventory.exception.InsufficientStockException;
import com.dentcare.inventory.exception.InvalidMovementException;
import com.dentcare.inventory.exception.InventoryItemNotFoundException;
import com.dentcare.inventory.repository.InventoryItemRepository;
import com.dentcare.inventory.repository.StockMovementRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Implementation of {@link StockMovementService} managing transactional stock ledger movements and locking.
 */
@Service
@Transactional(readOnly = true)
public class StockMovementServiceImpl implements StockMovementService {

    private final InventoryItemRepository inventoryItemRepository;
    private final StockMovementRepository stockMovementRepository;

    public StockMovementServiceImpl(InventoryItemRepository inventoryItemRepository,
                                    StockMovementRepository stockMovementRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.stockMovementRepository = stockMovementRepository;
    }

    @Override
    @Transactional
    public StockMovementResponse recordMovement(Long itemId, RecordStockMovementRequest request) {
        // 1. Acquire exclusive pessimistic write lock on the inventory item
        InventoryItem item = inventoryItemRepository.findByIdForUpdate(itemId)
                .orElseThrow(() -> new InventoryItemNotFoundException(itemId));

        // 2. Enforce active status invariant
        if (!item.isActive()) {
            throw new InactiveInventoryItemException(itemId);
        }

        // 3. Validate movement parameters
        StockMovementType type = request.getMovementType();
        if (type == null) {
            throw new InvalidMovementException("Movement type is required");
        }
        int quantity = request.getQuantity();
        if (quantity <= 0) {
            throw new InvalidMovementException("Quantity must be strictly greater than zero");
        }

        AdjustmentDirection adjustmentDirection = request.getAdjustmentDirection();
        if (type == StockMovementType.ADJUSTED) {
            if (adjustmentDirection == null) {
                throw new InvalidMovementException("Adjustment direction (INCREASE or DECREASE) is required for ADJUSTED movements");
            }
            if (request.getReason() == null || request.getReason().trim().isEmpty()) {
                throw new InvalidMovementException("A detailed reason is required for ADJUSTED movements");
            }
        } else {
            adjustmentDirection = null; // Ensure direction is only populated for ADJUSTED
        }

        // 4. Verify stock availability for stock deductions
        int currentStock = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
        boolean isStockOut = (type == StockMovementType.USED || type == StockMovementType.DAMAGED || type == StockMovementType.EXPIRED)
                || (type == StockMovementType.ADJUSTED && adjustmentDirection == AdjustmentDirection.DECREASE);

        if (isStockOut && quantity > currentStock) {
            throw new InsufficientStockException(itemId, quantity, currentStock);
        }

        // 5. Apply balance mutation to entity
        if (type == StockMovementType.RECEIVED || (type == StockMovementType.ADJUSTED && adjustmentDirection == AdjustmentDirection.INCREASE)) {
            item.increaseQuantity(quantity);
        } else {
            item.decreaseQuantity(quantity);
        }

        // 6. Persist movement audit record
        String reason = (request.getReason() != null && !request.getReason().trim().isEmpty())
                ? request.getReason().trim()
                : null;
        String batchNumber = (request.getBatchNumber() != null && !request.getBatchNumber().trim().isEmpty())
                ? request.getBatchNumber().trim()
                : null;

        StockMovement movement = new StockMovement(
                item,
                type,
                adjustmentDirection,
                quantity,
                LocalDateTime.now(),
                reason,
                request.getResponsibleUserId(),
                null,
                request.getTreatmentProcedureId(),
                batchNumber,
                request.getExpiryDate()
        );

        StockMovement savedMovement = stockMovementRepository.save(movement);
        inventoryItemRepository.save(item);

        return StockMovementResponse.fromEntity(savedMovement, item.getCurrentQuantity());
    }

    @Override
    public Page<StockMovementResponse> getItemMovementHistory(Long itemId, StockMovementType movementType, Pageable pageable) {
        if (!inventoryItemRepository.existsById(itemId)) {
            throw new InventoryItemNotFoundException(itemId);
        }

        Page<StockMovement> page;
        if (movementType != null) {
            page = stockMovementRepository.findByInventoryItemIdAndMovementType(itemId, movementType, pageable);
        } else {
            page = stockMovementRepository.findByInventoryItemId(itemId, pageable);
        }

        return page.map(movement -> StockMovementResponse.fromEntity(movement, null));
    }
}
