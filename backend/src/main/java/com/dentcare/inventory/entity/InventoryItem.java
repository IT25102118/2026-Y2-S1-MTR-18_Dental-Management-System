package com.dentcare.inventory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

/**
 * JPA entity representing a catalog item in the dental practice inventory.
 */
@Entity
@Table(name = "inventory_items")
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Item code is required")
    @Size(max = 50, message = "Item code must not exceed 50 characters")
    @Column(name = "item_code", nullable = false, unique = true, length = 50)
    private String itemCode;

    @NotBlank(message = "Item name is required")
    @Size(max = 150, message = "Item name must not exceed 150 characters")
    @Column(nullable = false, length = 150)
    private String name;

    @NotBlank(message = "Category is required")
    @Size(max = 100, message = "Category must not exceed 100 characters")
    @Column(nullable = false, length = 100)
    private String category;

    @NotBlank(message = "Unit is required")
    @Size(max = 50, message = "Unit must not exceed 50 characters")
    @Column(nullable = false, length = 50)
    private String unit;

    @NotNull(message = "Reorder level is required")
    @Min(value = 0, message = "Reorder level must be greater than or equal to zero")
    @Column(name = "reorder_level", nullable = false)
    private Integer reorderLevel = 0;

    @NotNull(message = "Current quantity is required")
    @Min(value = 0, message = "Current quantity must be greater than or equal to zero")
    @Column(name = "current_quantity", nullable = false)
    private Integer currentQuantity = 0;

    @NotNull(message = "Active status is required")
    @Column(nullable = false)
    private Boolean active = true;

    @Size(max = 150, message = "Default supplier reference must not exceed 150 characters")
    @Column(name = "default_supplier_reference", length = 150)
    private String defaultSupplierReference;

    @Version
    @Column(nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public InventoryItem() {
    }

    public InventoryItem(String itemCode, String name, String category, String unit, Integer reorderLevel) {
        this(itemCode, name, category, unit, reorderLevel, 0, null);
    }

    public InventoryItem(String itemCode, String name, String category, String unit,
                         Integer reorderLevel, Integer currentQuantity, String defaultSupplierReference) {
        this.itemCode = itemCode;
        this.name = name;
        this.category = category;
        this.unit = unit;
        this.reorderLevel = (reorderLevel != null) ? reorderLevel : 0;
        this.currentQuantity = (currentQuantity != null) ? currentQuantity : 0;
        this.defaultSupplierReference = defaultSupplierReference;
        this.active = true;
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
        if (this.currentQuantity == null) {
            this.currentQuantity = 0;
        }
        if (this.active == null) {
            this.active = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // --- Quantity Management (Internal / Controlled Mutation) ---

    /**
     * Internal mutation method for controlled stock movements.
     * Prevents arbitrary external modification without stock movement records.
     */
    void updateQuantity(int newQuantity) {
        if (newQuantity < 0) {
            throw new IllegalArgumentException("Current quantity cannot be negative");
        }
        this.currentQuantity = newQuantity;
    }

    // Package-private setter for testing constraint violations
    void setCurrentQuantityInternal(Integer currentQuantity) {
        this.currentQuantity = currentQuantity;
    }

    // --- Getters and Setters ---

    public Long getId() {
        return id;
    }

    public String getItemCode() {
        return itemCode;
    }

    public void setItemCode(String itemCode) {
        this.itemCode = itemCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Integer getReorderLevel() {
        return reorderLevel;
    }

    public void setReorderLevel(Integer reorderLevel) {
        this.reorderLevel = reorderLevel;
    }

    public Integer getCurrentQuantity() {
        return currentQuantity;
    }

    public Boolean getActive() {
        return active;
    }

    public boolean isActive() {
        return Boolean.TRUE.equals(active);
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getDefaultSupplierReference() {
        return defaultSupplierReference;
    }

    public void setDefaultSupplierReference(String defaultSupplierReference) {
        this.defaultSupplierReference = defaultSupplierReference;
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
