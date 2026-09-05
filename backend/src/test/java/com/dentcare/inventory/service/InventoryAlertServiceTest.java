package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.ExpiryAlertResponse;
import com.dentcare.inventory.dto.LowStockAlertResponse;
import com.dentcare.inventory.entity.InventoryBatch;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.repository.InventoryBatchRepository;
import com.dentcare.inventory.repository.InventoryItemRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryAlertServiceTest {

    @Mock
    private InventoryItemRepository inventoryItemRepository;

    @Mock
    private InventoryBatchRepository inventoryBatchRepository;

    @InjectMocks
    private InventoryAlertServiceImpl inventoryAlertService;

    @Test
    @DisplayName("AC-20, AC-21, AC-25: getLowStockAlerts maps items correctly with deficit and outOfStock")
    void testGetLowStockAlertsMapping() {
        InventoryItem lowStockItem = new InventoryItem(
                "ITM-LOW-1",
                "Dental Syringes 3ml",
                "Consumables",
                "box",
                10, // reorder level
                3,  // current quantity
                "MedSupply"
        );
        lowStockItem.setActive(true);

        InventoryItem outOfStockItem = new InventoryItem(
                "ITM-OUT-1",
                "Root Canal Sealant",
                "Endodontics",
                "vial",
                5, // reorder level
                0, // current quantity
                "EndoDirect"
        );
        outOfStockItem.setActive(true);

        Pageable pageable = PageRequest.of(0, 20);
        Page<InventoryItem> pagedItems = new PageImpl<>(List.of(lowStockItem, outOfStockItem), pageable, 2);

        when(inventoryItemRepository.findLowStockItems(null, pageable)).thenReturn(pagedItems);

        Page<LowStockAlertResponse> result = inventoryAlertService.getLowStockAlerts(null, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(2);

        LowStockAlertResponse first = result.getContent().get(0);
        assertThat(first.itemCode()).isEqualTo("ITM-LOW-1");
        assertThat(first.currentQuantity()).isEqualTo(3);
        assertThat(first.reorderLevel()).isEqualTo(10);
        assertThat(first.deficit()).isEqualTo(7); // 10 - 3
        assertThat(first.outOfStock()).isFalse();

        LowStockAlertResponse second = result.getContent().get(1);
        assertThat(second.itemCode()).isEqualTo("ITM-OUT-1");
        assertThat(second.currentQuantity()).isEqualTo(0);
        assertThat(second.reorderLevel()).isEqualTo(5);
        assertThat(second.deficit()).isEqualTo(5); // 5 - 0
        assertThat(second.outOfStock()).isTrue();
    }

    @Test
    @DisplayName("AC-23: Category filter is trimmed, lowercased and passed to repository query")
    void testCategoryFilterForwarded() {
        Pageable pageable = PageRequest.of(0, 10);
        when(inventoryItemRepository.findLowStockItems(eq("restorative"), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(), pageable, 0));

        Page<LowStockAlertResponse> result = inventoryAlertService.getLowStockAlerts("  Restorative  ", pageable);

        assertThat(result).isNotNull();
        verify(inventoryItemRepository).findLowStockItems("restorative", pageable);
    }

    @Test
    @DisplayName("AC-27 & AC-29: getExpiryAlerts correctly classifies EXPIRED and EXPIRING batches")
    void testGetExpiryAlertsMappingAndClassification() {
        LocalDate today = LocalDate.now();
        InventoryItem item = new InventoryItem("ITM-01", "Composite A2", "Restorative", "syringe", 5, 20, "DentalCorp");

        InventoryBatch expiredBatch = new InventoryBatch(item, "LOT-PAST", today.minusDays(3), 5, null, null);
        InventoryBatch todayBatch = new InventoryBatch(item, "LOT-TODAY", today, 8, null, null);
        InventoryBatch expiringBatch = new InventoryBatch(item, "LOT-SOON", today.plusDays(15), 10, null, null);

        Pageable pageable = PageRequest.of(0, 20);
        when(inventoryBatchRepository.findExpiringOrExpiredBatches(eq(today.plusDays(30)), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(expiredBatch, todayBatch, expiringBatch), pageable, 3));

        Page<ExpiryAlertResponse> result = inventoryAlertService.getExpiryAlerts(today.plusDays(30), pageable);

        assertThat(result.getTotalElements()).isEqualTo(3);

        ExpiryAlertResponse r1 = result.getContent().get(0);
        assertThat(r1.batchNumber()).isEqualTo("LOT-PAST");
        assertThat(r1.status()).isEqualTo("EXPIRED");
        assertThat(r1.daysRemaining()).isEqualTo(-3L);

        ExpiryAlertResponse r2 = result.getContent().get(1);
        assertThat(r2.batchNumber()).isEqualTo("LOT-TODAY");
        assertThat(r2.status()).isEqualTo("EXPIRING");
        assertThat(r2.daysRemaining()).isEqualTo(0L);

        ExpiryAlertResponse r3 = result.getContent().get(2);
        assertThat(r3.batchNumber()).isEqualTo("LOT-SOON");
        assertThat(r3.status()).isEqualTo("EXPIRING");
        assertThat(r3.daysRemaining()).isEqualTo(15L);
    }

    @Test
    @DisplayName("AC-31: getExpiryAlerts with through date in the past throws IllegalArgumentException")
    void testGetExpiryAlertsPastDateThrows() {
        LocalDate past = LocalDate.now().minusDays(1);
        Pageable pageable = PageRequest.of(0, 20);

        assertThatThrownBy(() -> inventoryAlertService.getExpiryAlerts(past, pageable))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("through date must not be in the past");
    }
}
