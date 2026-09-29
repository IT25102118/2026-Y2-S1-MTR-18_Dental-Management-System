package com.dentcare.inventory.dto;

import com.dentcare.inventory.entity.AdjustmentDirection;
import com.dentcare.inventory.entity.StockMovementType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Request payload for recording a stock movement against an inventory item.
 */
public class RecordStockMovementRequest {

    @NotNull(message = "Movement type is required")
    private StockMovementType movementType;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be strictly greater than zero")
    private Integer quantity;

    private AdjustmentDirection adjustmentDirection;

    @Size(max = 255, message = "Reason must not exceed 255 characters")
    private String reason;

    private Long responsibleUserId;

    @Size(max = 100, message = "Batch number must not exceed 100 characters")
    private String batchNumber;

    private LocalDate expiryDate;

    private Long treatmentProcedureId;

    private Long batchId;

    private LocalDate receivedDate;

    @Size(max = 150, message = "Supplier reference must not exceed 150 characters")
    private String supplierReference;

    public RecordStockMovementRequest() {
    }

    public RecordStockMovementRequest(StockMovementType movementType, Integer quantity, Long responsibleUserId) {
        this(movementType, null, quantity, null, responsibleUserId, null, null, null);
    }

    public RecordStockMovementRequest(StockMovementType movementType, AdjustmentDirection adjustmentDirection,
                                      Integer quantity, String reason, Long responsibleUserId,
                                      String batchNumber, LocalDate expiryDate, Long treatmentProcedureId) {
        this(movementType, adjustmentDirection, quantity, reason, responsibleUserId, batchNumber, expiryDate, treatmentProcedureId, null, null, null);
    }

    public RecordStockMovementRequest(StockMovementType movementType, AdjustmentDirection adjustmentDirection,
                                      Integer quantity, String reason, Long responsibleUserId,
                                      String batchNumber, LocalDate expiryDate, Long treatmentProcedureId,
                                      Long batchId, LocalDate receivedDate, String supplierReference) {
        this.movementType = movementType;
        this.adjustmentDirection = adjustmentDirection;
        this.quantity = quantity;
        this.reason = reason;
        this.responsibleUserId = responsibleUserId;
        this.batchNumber = batchNumber;
        this.expiryDate = expiryDate;
        this.treatmentProcedureId = treatmentProcedureId;
        this.batchId = batchId;
        this.receivedDate = receivedDate;
        this.supplierReference = supplierReference;
    }


    public StockMovementType getMovementType() {
        return movementType;
    }

    public void setMovementType(StockMovementType movementType) {
        this.movementType = movementType;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public AdjustmentDirection getAdjustmentDirection() {
        return adjustmentDirection;
    }

    public void setAdjustmentDirection(AdjustmentDirection adjustmentDirection) {
        this.adjustmentDirection = adjustmentDirection;
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

    public Long getTreatmentProcedureId() {
        return treatmentProcedureId;
    }

    public void setTreatmentProcedureId(Long treatmentProcedureId) {
        this.treatmentProcedureId = treatmentProcedureId;
    }

    public Long getBatchId() {
        return batchId;
    }

    public void setBatchId(Long batchId) {
        this.batchId = batchId;
    }

    public LocalDate getReceivedDate() {
        return receivedDate;
    }

    public void setReceivedDate(LocalDate receivedDate) {
        this.receivedDate = receivedDate;
    }

    public String getSupplierReference() {
        return supplierReference;
    }

    public void setSupplierReference(String supplierReference) {
        this.supplierReference = supplierReference;
    }
}

