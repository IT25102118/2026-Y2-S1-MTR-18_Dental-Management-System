package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.LowStockAlertResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service interface for retrieving inventory operational alerts.
 */
public interface InventoryAlertService {

    /**
     * Retrieves paginated low-stock alerts for active items whose current quantity is at or below reorder level.
     *
     * @param category optional category filter
     * @param pageable pagination parameters
     * @return page of low-stock alert responses
     */
    Page<LowStockAlertResponse> getLowStockAlerts(String category, Pageable pageable);

    /**
     * Retrieves paginated expiry alerts for active items' batches with positive stock and expiryDate <= through date.
     *
     * @param through  end cutoff date (must not be in the past)
     * @param pageable pagination parameters
     * @return page of expiry alert responses
     */
    Page<com.dentcare.inventory.dto.ExpiryAlertResponse> getExpiryAlerts(java.time.LocalDate through, Pageable pageable);
}

