package com.dentcare.inventory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity representing an immutable historical stock movement record in DentCare.
 */
@Entity
@Table(name = "stock_movements")
public class StockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Inventory item is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItem inventoryItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_batch_id")
    private InventoryBatch inventoryBatch;

    @NotNull(message = "Movement type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false, length = 20)
    private StockMovementType movementType;

    @Enumerated(EnumType.STRING)
    @Column(name = "adjustment_direction", length = 10)
    private AdjustmentDirection adjustmentDirection;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be strictly greater than zero")
    @Column(nullable = false)
    private Integer quantity;

    @NotNull(message = "Occurred timestamp is required")
    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Size(max = 255, message = "Reason must not exceed 255 characters")
    @Column(length = 255)
    private String reason;

    @NotNull(message = "Responsible user ID is required")
    @Column(name = "responsible_user_id", nullable = false)
    private Long responsibleUserId;

    @Column(name = "reversal_of_movement_id")
    private Long reversalOfMovementId;

    @Column(name = "treatment_procedure_id")
    private Long treatmentProcedureId;

    @Size(max = 100, message = "Batch number must not exceed 100 characters")
    @Column(name = "batch_number", length = 100)
    private String batchNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    public StockMovement() {
    }

    public StockMovement(InventoryItem inventoryItem, StockMovementType movementType,
                         Integer quantity, Long responsibleUserId) {
        this(inventoryItem, movementType, null, quantity, LocalDateTime.now(), null, responsibleUserId, null, null, null, null);
    }

    public StockMovement(InventoryItem inventoryItem, StockMovementType movementType,
                         Integer quantity, LocalDateTime occurredAt, String reason,
                         Long responsibleUserId, Long reversalOfMovementId,
                         Long treatmentProcedureId, String batchNumber, LocalDate expiryDate) {
        this(inventoryItem, movementType, null, quantity, occurredAt, reason, responsibleUserId, reversalOfMovementId, treatmentProcedureId, batchNumber, expiryDate);
    }

    public StockMovement(InventoryItem inventoryItem, StockMovementType movementType,
                         AdjustmentDirection adjustmentDirection, Integer quantity,
                         LocalDateTime occurredAt, String reason,
                         Long responsibleUserId, Long reversalOfMovementId,
                         Long treatmentProcedureId, String batchNumber, LocalDate expiryDate) {
        this.inventoryItem = inventoryItem;
        this.movementType = movementType;
        this.adjustmentDirection = adjustmentDirection;
        this.quantity = quantity;
        this.occurredAt = occurredAt != null ? occurredAt : LocalDateTime.now();
        this.reason = reason;
        this.responsibleUserId = responsibleUserId;
        this.reversalOfMovementId = reversalOfMovementId;
        this.treatmentProcedureId = treatmentProcedureId;
        this.batchNumber = batchNumber;
        this.expiryDate = expiryDate;
    }

    public StockMovement(InventoryItem inventoryItem, InventoryBatch inventoryBatch,
                         StockMovementType movementType, AdjustmentDirection adjustmentDirection,
                         Integer quantity, LocalDateTime occurredAt, String reason,
                         Long responsibleUserId, Long reversalOfMovementId,
                         Long treatmentProcedureId, String batchNumber, LocalDate expiryDate) {
        this(inventoryItem, movementType, adjustmentDirection, quantity, occurredAt, reason, responsibleUserId, reversalOfMovementId, treatmentProcedureId, batchNumber, expiryDate);
        this.inventoryBatch = inventoryBatch;
    }


    /**
     * Computes signed quantity delta (+ or -) that this movement applies to the inventory item balance.
     */
    public int getQuantityDelta() {
        if (movementType == null || quantity == null) {
            return 0;
        }
        return switch (movementType) {
            case RECEIVED -> quantity;
            case USED, DAMAGED, EXPIRED -> -quantity;
            case ADJUSTED -> (adjustmentDirection == AdjustmentDirection.INCREASE) ? quantity : -quantity;
        };
    }

    @PrePersist
    protected void onCreate() {
        if (this.occurredAt == null) {
            this.occurredAt = LocalDateTime.now();
        }
    }

    // --- Getters and Setters ---

    public Long getId() {
        return id;
    }

    public InventoryItem getInventoryItem() {
        return inventoryItem;
    }

    public void setInventoryItem(InventoryItem inventoryItem) {
        this.inventoryItem = inventoryItem;
    }

    public StockMovementType getMovementType() {
        return movementType;
    }

    public void setMovementType(StockMovementType movementType) {
        this.movementType = movementType;
    }

    public AdjustmentDirection getAdjustmentDirection() {
        return adjustmentDirection;
    }

    public void setAdjustmentDirection(AdjustmentDirection adjustmentDirection) {
        this.adjustmentDirection = adjustmentDirection;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }

    public void setOccurredAt(LocalDateTime occurredAt) {
        this.occurredAt = occurredAt;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Long getResponsibleUserId() {
        return responsibleUserId;
    }

    public void setResponsibleUserId(Long responsibleUserId) {
        this.responsibleUserId = responsibleUserId;
    }

    public Long getReversalOfMovementId() {
        return reversalOfMovementId;
    }

    public void setReversalOfMovementId(Long reversalOfMovementId) {
        this.reversalOfMovementId = reversalOfMovementId;
    }

    public Long getTreatmentProcedureId() {
        return treatmentProcedureId;
    }

    public void setTreatmentProcedureId(Long treatmentProcedureId) {
        this.treatmentProcedureId = treatmentProcedureId;
    }

    public String getBatchNumber() {
        return batchNumber;
    }

    public void setBatchNumber(String batchNumber) {
        this.batchNumber = batchNumber;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public InventoryBatch getInventoryBatch() {
        return inventoryBatch;
    }

    public void setInventoryBatch(InventoryBatch inventoryBatch) {
        this.inventoryBatch = inventoryBatch;
    }
}

