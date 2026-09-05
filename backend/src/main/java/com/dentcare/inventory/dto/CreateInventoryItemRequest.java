package com.dentcare.inventory.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request payload for creating a new inventory catalog item.
 * Initial currentQuantity is always zero and active is true.
 */
public class CreateInventoryItemRequest {

    @NotBlank(message = "Item code is required")
    @Size(max = 50, message = "Item code must not exceed 50 characters")
    private String itemCode;

    @NotBlank(message = "Item name is required")
    @Size(max = 150, message = "Item name must not exceed 150 characters")
    private String name;

    @NotBlank(message = "Category is required")
    @Size(max = 100, message = "Category must not exceed 100 characters")
    private String category;

    @NotBlank(message = "Unit is required")
    @Size(max = 50, message = "Unit must not exceed 50 characters")
    private String unit;

    @NotNull(message = "Reorder level is required")
    @Min(value = 0, message = "Reorder level must be greater than or equal to zero")
    private Integer reorderLevel;

    @Size(max = 150, message = "Default supplier reference must not exceed 150 characters")
    private String defaultSupplierReference;

    public CreateInventoryItemRequest() {
    }

    public CreateInventoryItemRequest(String itemCode, String name, String category, String unit,
                                      Integer reorderLevel, String defaultSupplierReference) {
        this.itemCode = itemCode;
        this.name = name;
        this.category = category;
        this.unit = unit;
        this.reorderLevel = reorderLevel;
        this.defaultSupplierReference = defaultSupplierReference;
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

    public String getDefaultSupplierReference() {
        return defaultSupplierReference;
    }

    public void setDefaultSupplierReference(String defaultSupplierReference) {
        this.defaultSupplierReference = defaultSupplierReference;
    }
}
