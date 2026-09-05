package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.InventoryBatchResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

/**
 * Service interface for querying and managing inventory batches.
 */
public interface InventoryBatchService {

    /**
     * Searches batches across the inventory with optional multi-field criteria and pagination.
     *
     * @param itemId            optional item ID filter
     * @param batchNumber       optional batch number substring
     * @param expiryFrom        optional earliest expiry date filter
     * @param expiryTo          optional latest expiry date filter
     * @param positiveStockOnly whether to only return batches with quantityOnHand > 0
     * @param pageable          pagination and sorting parameters
     * @return page of matching inventory batch responses
     */
    Page<InventoryBatchResponse> searchBatches(Long itemId, String batchNumber, LocalDate expiryFrom,
                                               LocalDate expiryTo, boolean positiveStockOnly, Pageable pageable);

    /**
     * Retrieves paginated batches belonging to a specific inventory item.
     *
     * @param itemId            ID of the inventory item
     * @param positiveStockOnly whether to only return batches with quantityOnHand > 0
     * @param pageable          pagination and sorting parameters
     * @return page of inventory batch responses for the specified item
     */
    Page<InventoryBatchResponse> getBatchesForItem(Long itemId, boolean positiveStockOnly, Pageable pageable);
}
