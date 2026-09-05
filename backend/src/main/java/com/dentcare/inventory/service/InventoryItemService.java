package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.CreateInventoryItemRequest;
import com.dentcare.inventory.dto.InventoryItemResponse;
import com.dentcare.inventory.dto.StockStatusFilter;
import com.dentcare.inventory.dto.UpdateInventoryItemRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for inventory catalog item operations and lifecycle management.
 */
public interface InventoryItemService {

    /**
     * Registers a new inventory catalog item.
     * Newly created items always have an initial currentQuantity of 0 and active status true.
     */
    InventoryItemResponse createItem(CreateInventoryItemRequest request);

    /**
     * Retrieves an inventory catalog item by its primary key ID.
     * Both active and inactive items remain retrievable.
     */
    InventoryItemResponse getItemById(Long id);

    /**
     * Updates catalog master data for an existing item (name, category, unit, reorderLevel, supplierRef).
     * Invariants: itemCode, currentQuantity, and active status are not changed.
     */
    InventoryItemResponse updateItem(Long id, UpdateInventoryItemRequest request);

    /**
     * Toggles the active lifecycle status of an inventory item without physical deletion.
     */
    InventoryItemResponse updateItemStatus(Long id, Boolean active);

    /**
     * Searches, filters, and paginates inventory catalog items based on criteria.
     */
    Page<InventoryItemResponse> searchItems(
            String search,
            String category,
            Boolean active,
            StockStatusFilter stockStatus,
            Pageable pageable
    );
}
