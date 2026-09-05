package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.InventoryBatchResponse;
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
class InventoryBatchServiceTest {

    @Mock
    private InventoryBatchRepository inventoryBatchRepository;

    @Mock
    private InventoryItemRepository inventoryItemRepository;

    @InjectMocks
    private InventoryBatchServiceImpl inventoryBatchService;

    @Test
    @DisplayName("AC-32: searchBatches sanitizes batchNumber and delegates to repository")
    void testSearchBatchesDelegation() {
        InventoryItem item = new InventoryItem("ITM-01", "Composite", "Restorative", "syringe", 5, 10, null);
        InventoryBatch batch = new InventoryBatch(item, "LOT-100", LocalDate.now().plusMonths(6), 10, null, null);
        Pageable pageable = PageRequest.of(0, 20);

        when(inventoryBatchRepository.searchBatches(eq(1L), eq("LOT-100"), any(), any(), eq(true), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(batch), pageable, 1));


        Page<InventoryBatchResponse> result = inventoryBatchService.searchBatches(
                1L, "  LOT-100  ", null, null, true, pageable
        );

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).batchNumber()).isEqualTo("LOT-100");
        verify(inventoryBatchRepository).searchBatches(eq(1L), eq("LOT-100"), any(), any(), eq(true), eq(pageable));
    }

    @Test
    @DisplayName("AC-32: searchBatches with invalid date range (expiryFrom > expiryTo) throws IllegalArgumentException")
    void testSearchBatchesInvalidDateRange() {
        LocalDate from = LocalDate.of(2027, 6, 1);
        LocalDate to = LocalDate.of(2027, 5, 1);
        Pageable pageable = PageRequest.of(0, 20);

        assertThatThrownBy(() -> inventoryBatchService.searchBatches(null, null, from, to, false, pageable))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("expiryFrom cannot be after expiryTo");
    }

    @Test
    @DisplayName("AC-33: getBatchesForItem retrieves positive stock batches when positiveStockOnly is true")
    void testGetBatchesForItem() {
        InventoryItem item = new InventoryItem("ITM-02", "Anesthetic", "Drugs", "vial", 10, 20, null);
        InventoryBatch batch = new InventoryBatch(item, "LOT-200", LocalDate.now().plusMonths(3), 20, null, null);
        Pageable pageable = PageRequest.of(0, 50);

        when(inventoryItemRepository.existsById(2L)).thenReturn(true);
        when(inventoryBatchRepository.findByInventoryItemIdAndQuantityOnHandGreaterThan(2L, 0, pageable))
                .thenReturn(new PageImpl<>(List.of(batch), pageable, 1));

        Page<InventoryBatchResponse> result = inventoryBatchService.getBatchesForItem(2L, true, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).batchNumber()).isEqualTo("LOT-200");
    }
}
