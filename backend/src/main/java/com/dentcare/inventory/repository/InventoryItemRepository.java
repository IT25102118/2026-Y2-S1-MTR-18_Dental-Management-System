package com.dentcare.inventory.repository;

import com.dentcare.inventory.entity.InventoryItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for {@link InventoryItem} entity.
 */
@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long>, JpaSpecificationExecutor<InventoryItem> {

    /**
     * Finds an inventory item by its unique business code.
     */
    Optional<InventoryItem> findByItemCode(String itemCode);

    /**
     * Checks if an inventory item exists with the specified item code.
     */
    boolean existsByItemCode(String itemCode);

    /**
     * Retrieves all active inventory items.
     */
    List<InventoryItem> findByActiveTrue();

    /**
     * Retrieves inventory items by active flag.
     */
    List<InventoryItem> findByActive(boolean active);

    /**
     * Retrieves an inventory item by ID acquiring a pessimistic write lock
     * for safe concurrent stock movement balance updates.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM InventoryItem i WHERE i.id = :id")
    Optional<InventoryItem> findByIdForUpdate(@Param("id") Long id);

    /**
     * Retrieves paginated active inventory items whose current quantity is at or below their reorder level,
     * with optional case-insensitive category filtering.
     */
    @Query("SELECT i FROM InventoryItem i WHERE i.active = true AND i.currentQuantity <= i.reorderLevel " +
           "AND (:category IS NULL OR LOWER(i.category) = LOWER(:category))")
    Page<InventoryItem> findLowStockItems(@Param("category") String category, Pageable pageable);
}
