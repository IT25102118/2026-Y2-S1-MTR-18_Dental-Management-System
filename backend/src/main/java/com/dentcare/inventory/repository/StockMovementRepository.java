package com.dentcare.inventory.repository;

import com.dentcare.inventory.entity.StockMovement;
import com.dentcare.inventory.entity.StockMovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA repository for {@link StockMovement} entity.
 */
@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    /**
     * Retrieves all stock movements for a given inventory item in reverse chronological order.
     */
    List<StockMovement> findByInventoryItemIdOrderByOccurredAtDesc(Long inventoryItemId);

    /**
     * Retrieves all stock movements for a given inventory item in reverse chronological order with secondary ID ordering.
     */
    List<StockMovement> findByInventoryItemIdOrderByOccurredAtDescIdDesc(Long inventoryItemId);

    /**
     * Retrieves paginated stock movements for a given inventory item.
     */
    Page<StockMovement> findByInventoryItemId(Long inventoryItemId, Pageable pageable);

    /**
     * Retrieves paginated stock movements for a given inventory item filtered by movement type.
     */
    Page<StockMovement> findByInventoryItemIdAndMovementType(Long inventoryItemId, StockMovementType movementType, Pageable pageable);

    /**
     * Checks if a reversal movement already exists for a specified original movement ID.
     */
    boolean existsByReversalOfMovementId(Long reversalOfMovementId);
}
