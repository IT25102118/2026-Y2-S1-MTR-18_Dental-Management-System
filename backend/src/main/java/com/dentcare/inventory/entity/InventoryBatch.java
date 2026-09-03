package com.dentcare.inventory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * JPA entity representing a physical or historical batch allocation for an inventory item.
 */
@Entity
@Table(name = "inventory_batches")
public class InventoryBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "Inventory item is required")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItem inventoryItem;

    @Size(max = 100, message = "Batch number must not exceed 100 characters")
    @Column(name = "batch_number", length = 100)
    private String batchNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @NotNull(message = "Quantity on hand is required")
    @Min(value = 0, message = "Quantity on hand cannot be negative")
    @Column(name = "quantity_on_hand", nullable = false)
    private Integer quantityOnHand = 0;

    @Column(name = "received_date")
    private LocalDate receivedDate;

    @Size(max = 150, message = "Supplier reference must not exceed 150 characters")
    @Column(name = "supplier_reference", length = 150)
    private String supplierReference;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public InventoryBatch() {
    }

    public InventoryBatch(InventoryItem inventoryItem, String batchNumber, LocalDate expiryDate,
                          Integer quantityOnHand, LocalDate receivedDate, String supplierReference) {
        this.inventoryItem = inventoryItem;
        this.batchNumber = batchNumber;
        this.expiryDate = expiryDate;
        this.quantityOnHand = quantityOnHand != null ? quantityOnHand : 0;
        this.receivedDate = receivedDate;
        this.supplierReference = supplierReference;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.quantityOnHand == null) {
            this.quantityOnHand = 0;
        }
        if (this.version == null) {
            this.version = 0L;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- Controlled Domain Mutations ---

    /**
     * Increases batch quantity on hand by a strictly positive amount.
     *
     * @param amount quantity to add (> 0)
     */
    public void increaseQuantity(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Increase quantity must be strictly greater than zero");
        }
        int current = (this.quantityOnHand != null) ? this.quantityOnHand : 0;
        this.quantityOnHand = current + amount;
    }

    /**
     * Decreases batch quantity on hand by a strictly positive amount.
     * Enforces the non-negative batch stock invariant at the entity domain level.
     *
     * @param amount quantity to deduct (> 0)
     */
    public void decreaseQuantity(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Decrease quantity must be strictly greater than zero");
        }
        int current = (this.quantityOnHand != null) ? this.quantityOnHand : 0;
        if (amount > current) {
            throw new IllegalStateException("Cannot decrease batch quantity below zero. Available: " + current + ", requested: " + amount);
        }
        this.quantityOnHand = current - amount;
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

    public Integer getQuantityOnHand() {
        return quantityOnHand;
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

    public Long getVersion() {
        return version;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
