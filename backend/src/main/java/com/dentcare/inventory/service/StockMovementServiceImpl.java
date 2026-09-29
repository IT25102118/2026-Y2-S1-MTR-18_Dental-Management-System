package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.ReverseStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.AdjustmentDirection;
import com.dentcare.inventory.entity.InventoryBatch;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.entity.StockMovement;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.DuplicateReversalException;
import com.dentcare.inventory.exception.InactiveInventoryItemException;
import com.dentcare.inventory.exception.InsufficientStockException;
import com.dentcare.inventory.exception.InvalidMovementException;
import com.dentcare.inventory.exception.InventoryBatchNotFoundException;
import com.dentcare.inventory.exception.InventoryItemNotFoundException;
import com.dentcare.inventory.exception.StockMovementNotFoundException;
import com.dentcare.inventory.repository.InventoryBatchRepository;
import com.dentcare.inventory.repository.InventoryItemRepository;
import com.dentcare.inventory.repository.StockMovementRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Implementation of {@link StockMovementService} managing transactional stock ledger movements,
 * batch tracking allocations, and concurrency locking.
 */
@Service
@Transactional(readOnly = true)
public class StockMovementServiceImpl implements StockMovementService {

    private final InventoryItemRepository inventoryItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final InventoryBatchRepository inventoryBatchRepository;

    public StockMovementServiceImpl(InventoryItemRepository inventoryItemRepository,
                                    StockMovementRepository stockMovementRepository) {
        this(inventoryItemRepository, stockMovementRepository, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public StockMovementServiceImpl(InventoryItemRepository inventoryItemRepository,
                                    StockMovementRepository stockMovementRepository,
                                    InventoryBatchRepository inventoryBatchRepository) {
        this.inventoryItemRepository = inventoryItemRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.inventoryBatchRepository = inventoryBatchRepository;
    }


    @Override
    @Transactional
    public StockMovementResponse recordMovement(Long itemId, RecordStockMovementRequest request) {
        // 1. Acquire exclusive pessimistic write lock on the inventory item
        InventoryItem item = inventoryItemRepository.findByIdForUpdate(itemId)
                .orElseThrow(() -> new InventoryItemNotFoundException(itemId));

        // 2. Backward compatibility: ensure legacy unbatched balance exists if item pre-dates S4B
        ensureLegacyBatchCompatibility(item);

        // 3. Enforce active status invariant for ordinary operational movements
        if (!item.isActive()) {
            throw new InactiveInventoryItemException(itemId);
        }

        // 4. Validate core movement parameters
        StockMovementType type = request.getMovementType();
        if (type == null) {
            throw new InvalidMovementException("Movement type is required");
        }
        int quantity = request.getQuantity();
        if (quantity <= 0) {
            throw new InvalidMovementException("Quantity must be strictly greater than zero");
        }

        AdjustmentDirection adjustmentDirection = request.getAdjustmentDirection();
        if (type == StockMovementType.ADJUSTED) {
            if (adjustmentDirection == null) {
                throw new InvalidMovementException("Adjustment direction (INCREASE or DECREASE) is required for ADJUSTED movements");
            }
            if (request.getReason() == null || request.getReason().trim().isEmpty()) {
                throw new InvalidMovementException("A detailed reason is required for ADJUSTED movements");
            }
        } else {
            adjustmentDirection = null; // Direction is only populated for ADJUSTED
        }

        boolean isStockOut = (type == StockMovementType.USED || type == StockMovementType.DAMAGED || type == StockMovementType.EXPIRED)
                || (type == StockMovementType.ADJUSTED && adjustmentDirection == AdjustmentDirection.DECREASE);

        InventoryBatch targetBatch = null;

        // 5. Apply movement-specific batch and item balance mutations
        if (inventoryBatchRepository != null) {
            if (type == StockMovementType.RECEIVED) {
                if (request.getReceivedDate() != null && request.getExpiryDate() != null
                        && request.getExpiryDate().isBefore(request.getReceivedDate())) {
                    throw new InvalidMovementException("Expiry date cannot be before received date");
                }

                if (request.getBatchId() != null) {
                    // Explicit batch receipt by ID
                    InventoryBatch batch = inventoryBatchRepository.findById(request.getBatchId())
                            .orElseThrow(() -> new InventoryBatchNotFoundException(request.getBatchId()));
                    if (!batch.getInventoryItem().getId().equals(itemId)) {
                        throw new InvalidMovementException("Batch ID " + request.getBatchId() + " does not belong to item ID " + itemId);
                    }
                    if (request.getExpiryDate() != null && !request.getExpiryDate().equals(batch.getExpiryDate())) {
                        throw new InvalidMovementException("Conflicting expiry date for existing batch ID " + request.getBatchId());
                    }
                    if (request.getBatchNumber() != null && !request.getBatchNumber().trim().isEmpty()
                            && !request.getBatchNumber().trim().equalsIgnoreCase(batch.getBatchNumber())) {
                        throw new InvalidMovementException("Conflicting batch number for batch ID " + request.getBatchId());
                    }
                    batch.increaseQuantity(quantity);
                    targetBatch = batch;
                } else if (request.getBatchNumber() != null && !request.getBatchNumber().trim().isEmpty()) {
                    // Receipt with batch number
                    String batchNo = request.getBatchNumber().trim();
                    Optional<InventoryBatch> existingOpt = inventoryBatchRepository.findByInventoryItemIdAndBatchNumber(itemId, batchNo);
                    if (existingOpt.isPresent()) {
                        InventoryBatch batch = existingOpt.get();
                        if (batch.getExpiryDate() != null) {
                            if (request.getExpiryDate() == null || !batch.getExpiryDate().equals(request.getExpiryDate())) {
                                throw new InvalidMovementException("Conflicting expiry date for existing batch " + batchNo);
                            }
                        } else {
                            if (request.getExpiryDate() != null) {
                                throw new InvalidMovementException("Cannot assign expiry date to established batch " + batchNo + " with no expiry");
                            }
                        }
                        if (batch.getSupplierReference() != null && request.getSupplierReference() != null
                                && !request.getSupplierReference().trim().isEmpty()
                                && !batch.getSupplierReference().equalsIgnoreCase(request.getSupplierReference().trim())) {
                            throw new InvalidMovementException("Conflicting supplier reference for existing batch " + batchNo);
                        }
                        batch.increaseQuantity(quantity);
                        targetBatch = batch;
                    } else {
                        String suppRef = (request.getSupplierReference() != null && !request.getSupplierReference().trim().isEmpty())
                                ? request.getSupplierReference().trim()
                                : item.getDefaultSupplierReference();
                        InventoryBatch newBatch = new InventoryBatch(
                                item,
                                batchNo,
                                request.getExpiryDate(),
                                quantity,
                                request.getReceivedDate(),
                                suppRef
                        );
                        targetBatch = inventoryBatchRepository.saveAndFlush(newBatch);
                    }
                } else {
                    // Unbatched receipt
                    Optional<InventoryBatch> unbatchedOpt = inventoryBatchRepository.findByInventoryItemIdAndBatchNumberIsNull(itemId);
                    if (unbatchedOpt.isPresent()) {
                        targetBatch = unbatchedOpt.get();
                        targetBatch.increaseQuantity(quantity);
                    } else {
                        String suppRef = (request.getSupplierReference() != null && !request.getSupplierReference().trim().isEmpty())
                                ? request.getSupplierReference().trim()
                                : item.getDefaultSupplierReference();
                        InventoryBatch unbatched = new InventoryBatch(item, null, null, quantity, null, suppRef);
                        targetBatch = inventoryBatchRepository.saveAndFlush(unbatched);
                    }
                }
                item.increaseQuantity(quantity);

            } else if (isStockOut) {
                int currentStock = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
                if (quantity > currentStock) {
                    throw new InsufficientStockException(itemId, quantity, currentStock);
                }

                if (request.getBatchId() != null) {
                    InventoryBatch batch = inventoryBatchRepository.findById(request.getBatchId())
                            .orElseThrow(() -> new InventoryBatchNotFoundException(request.getBatchId()));
                    if (!batch.getInventoryItem().getId().equals(itemId)) {
                        throw new InvalidMovementException("Batch ID " + request.getBatchId() + " does not belong to item ID " + itemId);
                    }
                    if (request.getBatchNumber() != null && !request.getBatchNumber().trim().isEmpty()
                            && batch.getBatchNumber() != null
                            && !request.getBatchNumber().trim().equalsIgnoreCase(batch.getBatchNumber())) {
                        throw new InvalidMovementException("Conflicting batch number for batch ID " + request.getBatchId());
                    }
                    if (batch.getQuantityOnHand() < quantity) {
                        throw new InsufficientStockException(itemId, quantity, batch.getQuantityOnHand());
                    }
                    targetBatch = batch;
                } else if (request.getBatchNumber() != null && !request.getBatchNumber().trim().isEmpty()) {
                    String batchNo = request.getBatchNumber().trim();
                    InventoryBatch batch = inventoryBatchRepository.findByInventoryItemIdAndBatchNumber(itemId, batchNo)
                            .orElseThrow(() -> new InvalidMovementException("Batch not found for item: " + batchNo));
                    if (batch.getQuantityOnHand() < quantity) {
                        throw new InsufficientStockException(itemId, quantity, batch.getQuantityOnHand());
                    }
                    targetBatch = batch;
                } else {
                    List<InventoryBatch> positiveBatches = inventoryBatchRepository.findByInventoryItemIdAndQuantityOnHandGreaterThan(itemId, 0);
                    if (positiveBatches.isEmpty()) {
                        throw new InsufficientStockException(itemId, quantity, currentStock);
                    }
                    if (positiveBatches.size() == 1 && positiveBatches.get(0).getBatchNumber() == null) {
                        InventoryBatch unbatched = positiveBatches.get(0);
                        if (unbatched.getQuantityOnHand() < quantity) {
                            throw new InsufficientStockException(itemId, quantity, unbatched.getQuantityOnHand());
                        }
                        targetBatch = unbatched;
                    } else {
                        throw new InvalidMovementException("Batch selection is required for this stock movement");
                    }
                }

                if (type == StockMovementType.USED && targetBatch.getExpiryDate() != null) {
                    if (targetBatch.getExpiryDate().isBefore(LocalDate.now())) {
                        String batchLabel = targetBatch.getBatchNumber() != null ? targetBatch.getBatchNumber() : "Unbatched";
                        throw new InvalidMovementException("Cannot consume expired batch [" + batchLabel + "] with expiry date " + targetBatch.getExpiryDate());
                    }
                }

                targetBatch.decreaseQuantity(quantity);
                item.decreaseQuantity(quantity);

            } else {
                // ADJUSTED INCREASE
                if (request.getBatchId() != null) {
                    InventoryBatch batch = inventoryBatchRepository.findById(request.getBatchId())
                            .orElseThrow(() -> new InventoryBatchNotFoundException(request.getBatchId()));
                    if (!batch.getInventoryItem().getId().equals(itemId)) {
                        throw new InvalidMovementException("Batch ID " + request.getBatchId() + " does not belong to item ID " + itemId);
                    }
                    batch.increaseQuantity(quantity);
                    targetBatch = batch;
                } else if (request.getBatchNumber() != null && !request.getBatchNumber().trim().isEmpty()) {
                    String batchNo = request.getBatchNumber().trim();
                    Optional<InventoryBatch> opt = inventoryBatchRepository.findByInventoryItemIdAndBatchNumber(itemId, batchNo);
                    if (opt.isPresent()) {
                        targetBatch = opt.get();
                        targetBatch.increaseQuantity(quantity);
                    } else {
                        InventoryBatch newBatch = new InventoryBatch(
                                item,
                                batchNo,
                                request.getExpiryDate(),
                                quantity,
                                request.getReceivedDate(),
                                request.getSupplierReference()
                        );
                        targetBatch = inventoryBatchRepository.saveAndFlush(newBatch);
                    }
                } else {
                    Optional<InventoryBatch> unbatchedOpt = inventoryBatchRepository.findByInventoryItemIdAndBatchNumberIsNull(itemId);
                    if (unbatchedOpt.isPresent()) {
                        targetBatch = unbatchedOpt.get();
                        targetBatch.increaseQuantity(quantity);
                    } else {
                        InventoryBatch unbatched = new InventoryBatch(item, null, null, quantity, null, item.getDefaultSupplierReference());
                        targetBatch = inventoryBatchRepository.saveAndFlush(unbatched);
                    }
                }
                item.increaseQuantity(quantity);
            }
        } else {
            // Backward compatibility for harnesses without batch repository
            int currentStock = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
            if (isStockOut && quantity > currentStock) {
                throw new InsufficientStockException(itemId, quantity, currentStock);
            }
            if (type == StockMovementType.RECEIVED || (type == StockMovementType.ADJUSTED && adjustmentDirection == AdjustmentDirection.INCREASE)) {
                item.increaseQuantity(quantity);
            } else {
                item.decreaseQuantity(quantity);
            }
        }

        // 6. Persist movement record linked to target batch and with derived snapshots
        String reason = (request.getReason() != null && !request.getReason().trim().isEmpty())
                ? request.getReason().trim()
                : null;

        String snapshotBatchNumber = targetBatch != null ? targetBatch.getBatchNumber()
                : ((request.getBatchNumber() != null && !request.getBatchNumber().trim().isEmpty()) ? request.getBatchNumber().trim() : null);
        LocalDate snapshotExpiryDate = targetBatch != null ? targetBatch.getExpiryDate() : request.getExpiryDate();

        StockMovement movement = new StockMovement(
                item,
                targetBatch,
                type,
                adjustmentDirection,
                quantity,
                LocalDateTime.now(),
                reason,
                request.getResponsibleUserId(),
                null,
                request.getTreatmentProcedureId(),
                snapshotBatchNumber,
                snapshotExpiryDate
        );

        StockMovement savedMovement = stockMovementRepository.save(movement);
        if (targetBatch != null) {
            inventoryBatchRepository.save(targetBatch);
        }
        inventoryItemRepository.save(item);

        // 7. Verify core invariant
        validateItemBatchInvariant(itemId, item.getCurrentQuantity());

        return StockMovementResponse.fromEntity(savedMovement, item.getCurrentQuantity());
    }

    @Override
    @Transactional
    public StockMovementResponse reverseMovement(Long itemId, Long movementId, ReverseStockMovementRequest request) {
        // 1. Acquire pessimistic write lock on the inventory item (corrections permitted on inactive items)
        InventoryItem item = inventoryItemRepository.findByIdForUpdate(itemId)
                .orElseThrow(() -> new InventoryItemNotFoundException(itemId));

        // 2. Backward compatibility: ensure legacy unbatched balance exists if item pre-dates S4B
        ensureLegacyBatchCompatibility(item);

        // 3. Retrieve original stock movement
        StockMovement original = stockMovementRepository.findById(movementId)
                .orElseThrow(() -> new StockMovementNotFoundException(movementId));

        // 4. Verify original movement belongs to the specified item
        if (original.getInventoryItem() == null || !original.getInventoryItem().getId().equals(itemId)) {
            throw new StockMovementNotFoundException(movementId);
        }

        // 5. Verify original movement is not itself a reversal
        if (original.getReversalOfMovementId() != null) {
            throw new InvalidMovementException("Cannot reverse a movement that is already a reversal");
        }

        // 6. Check if original movement has already been reversed
        if (stockMovementRepository.existsByReversalOfMovementId(movementId)) {
            throw new DuplicateReversalException(movementId);
        }

        // 7. Validate reversal parameters
        if (request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new InvalidMovementException("Reversal reason is required");
        }

        // 8. Calculate opposite direction and quantity effect
        int originalDelta = original.getQuantityDelta();
        AdjustmentDirection reversalDirection = (originalDelta > 0)
                ? AdjustmentDirection.DECREASE
                : AdjustmentDirection.INCREASE;
        int quantity = original.getQuantity();

        // 9. Resolve target batch: use original batch if linked, otherwise unbatched balance
        InventoryBatch targetBatch = null;
        if (inventoryBatchRepository != null) {
            if (original.getInventoryBatch() != null) {
                targetBatch = original.getInventoryBatch();
            } else {
                targetBatch = inventoryBatchRepository.findByInventoryItemIdAndBatchNumberIsNull(itemId)
                        .orElseGet(() -> {
                            InventoryBatch unbatched = new InventoryBatch(item, null, null, 0, null, item.getDefaultSupplierReference());
                            return inventoryBatchRepository.saveAndFlush(unbatched);
                        });
            }

            // 10. Mutate both target batch and item quantity
            if (reversalDirection == AdjustmentDirection.DECREASE) {
                int currentBatchStock = targetBatch.getQuantityOnHand() != null ? targetBatch.getQuantityOnHand() : 0;
                if (quantity > currentBatchStock) {
                    throw new InsufficientStockException(itemId, quantity, currentBatchStock);
                }
                int currentItemStock = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
                if (quantity > currentItemStock) {
                    throw new InsufficientStockException(itemId, quantity, currentItemStock);
                }
                targetBatch.decreaseQuantity(quantity);
                item.decreaseQuantity(quantity);
            } else {
                targetBatch.increaseQuantity(quantity);
                item.increaseQuantity(quantity);
            }
        } else {
            // Backward compatibility
            if (reversalDirection == AdjustmentDirection.DECREASE) {
                int currentStock = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
                if (quantity > currentStock) {
                    throw new InsufficientStockException(itemId, quantity, currentStock);
                }
                item.decreaseQuantity(quantity);
            } else {
                item.increaseQuantity(quantity);
            }
        }

        // 11. Persist reversal movement referencing original and target batch
        String snapshotBatchNumber = targetBatch != null ? targetBatch.getBatchNumber() : original.getBatchNumber();
        LocalDate snapshotExpiryDate = targetBatch != null ? targetBatch.getExpiryDate() : original.getExpiryDate();

        StockMovement reversal = new StockMovement(
                item,
                targetBatch,
                StockMovementType.ADJUSTED,
                reversalDirection,
                quantity,
                LocalDateTime.now(),
                request.getReason().trim(),
                request.getResponsibleUserId(),
                original.getId(),
                original.getTreatmentProcedureId(),
                snapshotBatchNumber,
                snapshotExpiryDate
        );

        StockMovement savedMovement;
        try {
            savedMovement = stockMovementRepository.saveAndFlush(reversal);
            if (targetBatch != null) {
                inventoryBatchRepository.save(targetBatch);
            }
            inventoryItemRepository.save(item);
        } catch (DataIntegrityViolationException ex) {
            if (stockMovementRepository.existsByReversalOfMovementId(movementId)) {
                throw new DuplicateReversalException(movementId);
            }
            throw ex;
        }

        // 12. Verify core invariant
        validateItemBatchInvariant(itemId, item.getCurrentQuantity());

        return StockMovementResponse.fromEntity(savedMovement, item.getCurrentQuantity());
    }

    @Override
    public Page<StockMovementResponse> getItemMovementHistory(Long itemId, StockMovementType movementType, Pageable pageable) {
        if (!inventoryItemRepository.existsById(itemId)) {
            throw new InventoryItemNotFoundException(itemId);
        }

        Page<StockMovement> page;
        if (movementType != null) {
            page = stockMovementRepository.findByInventoryItemIdAndMovementType(itemId, movementType, pageable);
        } else {
            page = stockMovementRepository.findByInventoryItemId(itemId, pageable);
        }

        return page.map(movement -> StockMovementResponse.fromEntity(movement, null));
    }

    /**
     * Ensures an unbatched balance exists for an item that has no batch records but has positive quantity.
     * Guarantees backward compatibility for pre-S4B items without fabricating historical data.
     */
    private InventoryBatch ensureLegacyBatchCompatibility(InventoryItem item) {
        if (inventoryBatchRepository == null) {
            return null;
        }
        List<InventoryBatch> batches = inventoryBatchRepository.findByInventoryItemId(item.getId());
        if (batches.isEmpty()) {
            if (item.getCurrentQuantity() != null && item.getCurrentQuantity() > 0) {
                InventoryBatch legacyBatch = new InventoryBatch(
                        item,
                        null,
                        null,
                        item.getCurrentQuantity(),
                        null,
                        item.getDefaultSupplierReference()
                );
                return inventoryBatchRepository.saveAndFlush(legacyBatch);
            }
            return null;
        }
        return null;
    }

    /**
     * Validates that the sum of batch quantities strictly matches the item's current quantity.
     */
    private void validateItemBatchInvariant(Long itemId, int itemQuantity) {
        if (inventoryBatchRepository == null) {
            return;
        }
        List<InventoryBatch> batches = inventoryBatchRepository.findByInventoryItemId(itemId);
        if (batches.isEmpty() && itemQuantity == 0) {
            return;
        }
        int batchSum = batches.stream().mapToInt(b -> b.getQuantityOnHand() != null ? b.getQuantityOnHand() : 0).sum();
        if (batchSum != itemQuantity) {
            throw new IllegalStateException("Inventory data integrity inconsistency for item ID " + itemId +
                    ": item currentQuantity (" + itemQuantity + ") does not match sum of batch quantities (" + batchSum + ")");
        }
    }
}
