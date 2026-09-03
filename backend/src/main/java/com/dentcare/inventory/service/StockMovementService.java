package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.StockMovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for recording stock movements and retrieving movement audit history.
 */
public interface StockMovementService {

    /**
     * Atomically records a stock movement against an inventory item, applying balance mutations and pessimistic locking.
     *
     * @param itemId  ID of the inventory item
     * @param request movement details
     * @return response representing the recorded movement and resulting balance
     */
    StockMovementResponse recordMovement(Long itemId, RecordStockMovementRequest request);

    /**
     * Retrieves paginated stock movement history for an inventory item in reverse chronological order.
     *
     * @param itemId       ID of the inventory item
     * @param movementType optional movement type filter
     * @param pageable     pagination information
     * @return page of stock movement responses
     */
    Page<StockMovementResponse> getItemMovementHistory(Long itemId, StockMovementType movementType, Pageable pageable);
}
