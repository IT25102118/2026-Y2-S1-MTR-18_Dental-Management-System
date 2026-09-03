package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.CreateInventoryItemRequest;
import com.dentcare.inventory.dto.InventoryItemResponse;
import com.dentcare.inventory.dto.StockStatusFilter;
import com.dentcare.inventory.dto.UpdateInventoryItemRequest;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.exception.DuplicateItemCodeException;
import com.dentcare.inventory.exception.InventoryItemNotFoundException;
import com.dentcare.inventory.repository.InventoryItemRepository;
import com.dentcare.inventory.repository.InventoryItemSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implementation of {@link InventoryItemService} enforcing catalog lifecycle and integrity rules.
 */
@Service
@Transactional(readOnly = true)
public class InventoryItemServiceImpl implements InventoryItemService {

    private final InventoryItemRepository inventoryItemRepository;

    public InventoryItemServiceImpl(InventoryItemRepository inventoryItemRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
    }

    @Override
    @Transactional
    public InventoryItemResponse createItem(CreateInventoryItemRequest request) {
        String code = request.getItemCode().trim();
        if (inventoryItemRepository.existsByItemCode(code)) {
            throw new DuplicateItemCodeException(code);
        }

        String supplierRef = (request.getDefaultSupplierReference() != null && !request.getDefaultSupplierReference().trim().isEmpty())
                ? request.getDefaultSupplierReference().trim()
                : null;

        InventoryItem item = new InventoryItem(
                code,
                request.getName().trim(),
                request.getCategory().trim(),
                request.getUnit().trim(),
                request.getReorderLevel(),
                0,
                supplierRef
        );
        item.setActive(true);

        InventoryItem saved = inventoryItemRepository.save(item);
        return InventoryItemResponse.fromEntity(saved);
    }

    @Override
    public InventoryItemResponse getItemById(Long id) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new InventoryItemNotFoundException(id));
        return InventoryItemResponse.fromEntity(item);
    }

    @Override
    @Transactional
    public InventoryItemResponse updateItem(Long id, UpdateInventoryItemRequest request) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new InventoryItemNotFoundException(id));

        String supplierRef = (request.getDefaultSupplierReference() != null && !request.getDefaultSupplierReference().trim().isEmpty())
                ? request.getDefaultSupplierReference().trim()
                : null;

        // Update catalog attributes only (itemCode and currentQuantity remain immutable)
        item.setName(request.getName().trim());
        item.setCategory(request.getCategory().trim());
        item.setUnit(request.getUnit().trim());
        item.setReorderLevel(request.getReorderLevel());
        item.setDefaultSupplierReference(supplierRef);

        InventoryItem saved = inventoryItemRepository.save(item);
        return InventoryItemResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public InventoryItemResponse updateItemStatus(Long id, Boolean active) {
        if (active == null) {
            throw new IllegalArgumentException("Active status is required");
        }
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new InventoryItemNotFoundException(id));

        item.setActive(active);
        InventoryItem saved = inventoryItemRepository.save(item);
        return InventoryItemResponse.fromEntity(saved);
    }

    @Override
    public Page<InventoryItemResponse> searchItems(
            String search,
            String category,
            Boolean active,
            StockStatusFilter stockStatus,
            Pageable pageable
    ) {
        Specification<InventoryItem> spec = InventoryItemSpecifications.buildSpecification(
                search,
                category,
                active,
                stockStatus
        );
        Page<InventoryItem> page = inventoryItemRepository.findAll(spec, pageable);
        return page.map(InventoryItemResponse::fromEntity);
    }
}
