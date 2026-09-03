package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.LowStockAlertResponse;
import com.dentcare.inventory.entity.InventoryItem;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryAlertServiceTest {

    @Mock
    private InventoryItemRepository inventoryItemRepository;

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
}
