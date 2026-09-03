package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.ExpiryAlertResponse;
import com.dentcare.inventory.dto.LowStockAlertResponse;
import com.dentcare.inventory.entity.InventoryBatch;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.repository.InventoryBatchRepository;
import com.dentcare.inventory.repository.InventoryItemRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Implementation of {@link InventoryAlertService} querying deterministic low-stock and expiry alerts.
 */
@Service
@Transactional(readOnly = true)
public class InventoryAlertServiceImpl implements InventoryAlertService {

    private final InventoryItemRepository inventoryItemRepository;
    private final InventoryBatchRepository inventoryBatchRepository;

    public InventoryAlertServiceImpl(InventoryItemRepository inventoryItemRepository,
                                     InventoryBatchRepository inventoryBatchRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
    }

    @Override
    public Page<LowStockAlertResponse> getLowStockAlerts(String category, Pageable pageable) {
        String categoryFilter = (category != null && !category.trim().isEmpty())
                ? category.trim().toLowerCase()
                : null;
        Page<InventoryItem> items = inventoryItemRepository.findLowStockItems(categoryFilter, pageable);
        return items.map(LowStockAlertResponse::fromEntity);
    }

    @Override
    public Page<ExpiryAlertResponse> getExpiryAlerts(LocalDate through, Pageable pageable) {
        LocalDate today = LocalDate.now();
        if (through == null) {
            throw new IllegalArgumentException("through date parameter is required");
        }
        if (through.isBefore(today)) {
            throw new IllegalArgumentException("through date must not be in the past: " + through);
        }

        Page<InventoryBatch> batches = inventoryBatchRepository.findExpiringOrExpiredBatches(through, pageable);
        return batches.map(batch -> ExpiryAlertResponse.fromEntity(batch, today));
    }
}
