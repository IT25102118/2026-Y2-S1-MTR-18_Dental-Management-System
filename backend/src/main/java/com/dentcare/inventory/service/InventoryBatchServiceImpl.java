package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.InventoryBatchResponse;
import com.dentcare.inventory.entity.InventoryBatch;
import com.dentcare.inventory.exception.InventoryItemNotFoundException;
import com.dentcare.inventory.repository.InventoryBatchRepository;
import com.dentcare.inventory.repository.InventoryItemRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Implementation of {@link InventoryBatchService} providing read and search capabilities for batches.
 */
@Service
@Transactional(readOnly = true)
public class InventoryBatchServiceImpl implements InventoryBatchService {

    private final InventoryBatchRepository inventoryBatchRepository;
    private final InventoryItemRepository inventoryItemRepository;

    public InventoryBatchServiceImpl(InventoryBatchRepository inventoryBatchRepository,
                                     InventoryItemRepository inventoryItemRepository) {
        this.inventoryBatchRepository = inventoryBatchRepository;
        this.inventoryItemRepository = inventoryItemRepository;
    }

    @Override
    public Page<InventoryBatchResponse> searchBatches(Long itemId, String batchNumber, LocalDate expiryFrom,
                                                      LocalDate expiryTo, boolean positiveStockOnly, Pageable pageable) {
        if (expiryFrom != null && expiryTo != null && expiryFrom.isAfter(expiryTo)) {
            throw new IllegalArgumentException("expiryFrom cannot be after expiryTo: " + expiryFrom + " > " + expiryTo);
        }

        String cleanBatchNumber = (batchNumber != null && !batchNumber.trim().isEmpty())
                ? batchNumber.trim()
                : null;

        Page<InventoryBatch> batches = inventoryBatchRepository.searchBatches(
                itemId,
                cleanBatchNumber,
                expiryFrom,
                expiryTo,
                positiveStockOnly,
                pageable
        );

        return batches.map(InventoryBatchResponse::fromEntity);
    }

    @Override
    public Page<InventoryBatchResponse> getBatchesForItem(Long itemId, boolean positiveStockOnly, Pageable pageable) {
        if (!inventoryItemRepository.existsById(itemId)) {
            throw new InventoryItemNotFoundException(itemId);
        }

        Page<InventoryBatch> batches = positiveStockOnly
                ? inventoryBatchRepository.findByInventoryItemIdAndQuantityOnHandGreaterThan(itemId, 0, pageable)
                : inventoryBatchRepository.findByInventoryItemId(itemId, pageable);

        return batches.map(InventoryBatchResponse::fromEntity);
    }
}
