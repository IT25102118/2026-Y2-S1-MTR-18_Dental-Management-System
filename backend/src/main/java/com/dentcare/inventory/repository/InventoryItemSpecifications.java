package com.dentcare.inventory.repository;

import com.dentcare.inventory.dto.StockStatusFilter;
import com.dentcare.inventory.entity.InventoryItem;
import org.springframework.data.jpa.domain.Specification;

/**
 * Reusable JPA Specifications for filtering {@link InventoryItem} catalog records.
 */
public final class InventoryItemSpecifications {

    private InventoryItemSpecifications() {
    }

    public static Specification<InventoryItem> hasSearchText(String search) {
        if (search == null || search.trim().isEmpty()) {
            return null;
        }
        return (root, query, cb) -> {
            String pattern = "%" + search.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("itemCode")), pattern),
                    cb.like(cb.lower(root.get("category")), pattern)
            );
        };
    }

    public static Specification<InventoryItem> hasCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            return null;
        }
        return (root, query, cb) ->
                cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase());
    }

    public static Specification<InventoryItem> hasActiveStatus(Boolean active) {
        if (active == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("active"), active);
    }

    public static Specification<InventoryItem> hasStockStatus(StockStatusFilter stockStatus) {
        if (stockStatus == null || stockStatus == StockStatusFilter.ALL) {
            return null;
        }
        return switch (stockStatus) {
            case IN_STOCK -> (root, query, cb) ->
                    cb.greaterThan(root.get("currentQuantity"), 0);
            case LOW_STOCK -> (root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("currentQuantity"), root.get("reorderLevel"));
            case OUT_OF_STOCK -> (root, query, cb) ->
                    cb.equal(root.get("currentQuantity"), 0);
            default -> null;
        };
    }

    public static Specification<InventoryItem> buildSpecification(
            String search,
            String category,
            Boolean active,
            StockStatusFilter stockStatus
    ) {
        return Specification.allOf(
                hasSearchText(search),
                hasCategory(category),
                hasActiveStatus(active),
                hasStockStatus(stockStatus)
        );
    }
}
