package com.dentcare.inventory.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Request payload for toggling the active status of an inventory item.
 */
public class UpdateInventoryItemStatusRequest {

    @NotNull(message = "Active status is required")
    private Boolean active;

    public UpdateInventoryItemStatusRequest() {
    }

    public UpdateInventoryItemStatusRequest(Boolean active) {
        this.active = active;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
