package com.dentcare.inventory.repository;

import com.dentcare.inventory.entity.InventoryBatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link InventoryBatch} entity.
 */
@Repository
public interface InventoryBatchRepository extends JpaRepository<InventoryBatch, Long> {

    /**
     * Finds a batch by inventory item ID and exact batch number.
     */
    Optional<InventoryBatch> findByInventoryItemIdAndBatchNumber(Long inventoryItemId, String batchNumber);

    /**
     * Finds the legacy/unbatched balance row (batchNumber IS NULL) for an inventory item.
     */
    Optional<InventoryBatch> findByInventoryItemIdAndBatchNumberIsNull(Long inventoryItemId);

    /**
     * Finds all batches belonging to an inventory item.
     */
    List<InventoryBatch> findByInventoryItemId(Long inventoryItemId);

    /**
     * Finds all batches belonging to an inventory item with quantity greater than a threshold.
     */
    List<InventoryBatch> findByInventoryItemIdAndQuantityOnHandGreaterThan(Long inventoryItemId, int minQuantity);

    /**
     * Paginated retrieval of all batches for a specific inventory item.
     */
    Page<InventoryBatch> findByInventoryItemId(Long inventoryItemId, Pageable pageable);

    /**
     * Paginated retrieval of batches for a specific inventory item with quantity greater than a threshold.
     */
    Page<InventoryBatch> findByInventoryItemIdAndQuantityOnHandGreaterThan(Long inventoryItemId, int minQuantity, Pageable pageable);

    /**
     * Queries expiring or already expired batches for active items with remaining positive stock.
     */
    @Query(value = "SELECT b FROM InventoryBatch b JOIN FETCH b.inventoryItem i WHERE i.active = true AND b.quantityOnHand > 0 AND b.expiryDate IS NOT NULL AND b.expiryDate <= :through",
           countQuery = "SELECT COUNT(b) FROM InventoryBatch b WHERE b.inventoryItem.active = true AND b.quantityOnHand > 0 AND b.expiryDate IS NOT NULL AND b.expiryDate <= :through")
    Page<InventoryBatch> findExpiringOrExpiredBatches(@Param("through") LocalDate through, Pageable pageable);

    /**
     * Searches batches across all items with optional filters for item, batch number partial match, expiry range, and positive stock.
     */
    @Query(value = "SELECT b FROM InventoryBatch b JOIN FETCH b.inventoryItem i WHERE " +
                   "(:itemId IS NULL OR i.id = :itemId) AND " +
                   "(:batchNumber IS NULL OR LOWER(b.batchNumber) LIKE LOWER(CONCAT('%', :batchNumber, '%'))) AND " +
                   "(:expiryFrom IS NULL OR b.expiryDate >= :expiryFrom) AND " +
                   "(:expiryTo IS NULL OR b.expiryDate <= :expiryTo) AND " +
                   "(:positiveStockOnly = false OR b.quantityOnHand > 0)",
           countQuery = "SELECT COUNT(b) FROM InventoryBatch b WHERE " +
                        "(:itemId IS NULL OR b.inventoryItem.id = :itemId) AND " +
                        "(:batchNumber IS NULL OR LOWER(b.batchNumber) LIKE LOWER(CONCAT('%', :batchNumber, '%'))) AND " +
                        "(:expiryFrom IS NULL OR b.expiryDate >= :expiryFrom) AND " +
                        "(:expiryTo IS NULL OR b.expiryDate <= :expiryTo) AND " +
                        "(:positiveStockOnly = false OR b.quantityOnHand > 0)")
    Page<InventoryBatch> searchBatches(
            @Param("itemId") Long itemId,
            @Param("batchNumber") String batchNumber,
            @Param("expiryFrom") LocalDate expiryFrom,
            @Param("expiryTo") LocalDate expiryTo,
            @Param("positiveStockOnly") boolean positiveStockOnly,
            Pageable pageable
    );
}
