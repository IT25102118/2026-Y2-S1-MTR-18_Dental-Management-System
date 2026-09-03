package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.LowStockAlertResponse;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.repository.InventoryItemRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of {@link InventoryAlertService} querying deterministic low-stock items.
 */
@Service
@Transactional(readOnly = true)
public class InventoryAlertServiceImpl implements InventoryAlertService {

    private final InventoryItemRepository inventoryItemRepository;

    public InventoryAlertServiceImpl(InventoryItemRepository inventoryItemRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
    }

    @Override
    public Page<LowStockAlertResponse> getLowStockAlerts(String category, Pageable pageable) {
        String categoryFilter = (category != null && !category.trim().isEmpty())
                ? category.trim().toLowerCase()
                : null;
        Page<InventoryItem> items = inventoryItemRepository.findLowStockItems(categoryFilter, pageable);
        return items.map(LowStockAlertResponse::fromEntity);
    }
}
