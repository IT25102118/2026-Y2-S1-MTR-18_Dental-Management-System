package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.CreateInventoryItemRequest;
import com.dentcare.inventory.dto.InventoryItemResponse;
import com.dentcare.inventory.dto.StockStatusFilter;
import com.dentcare.inventory.dto.UpdateInventoryItemRequest;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.exception.DuplicateItemCodeException;
import com.dentcare.inventory.exception.InventoryItemNotFoundException;
import com.dentcare.inventory.repository.InventoryItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InventoryItemServiceTest {

    @Mock
    private InventoryItemRepository inventoryItemRepository;

    @InjectMocks
    private InventoryItemServiceImpl inventoryItemService;

    private InventoryItem sampleItem;

    @BeforeEach
    void setUp() {
        sampleItem = new InventoryItem(
                "ITM-100",
                "Dental Mirror #4",
                "Diagnostic",
                "piece",
                10,
                25,
                "DentalSupply Corp"
        );
        sampleItem.setActive(true);
    }

    @Test
    @DisplayName("AC-1: Create item succeeds with initial currentQuantity=0 and active=true")
    void testCreateItemSuccess() {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "ITM-200",
                "Explorer Probe",
                "Diagnostic",
                "piece",
                15,
                "DentPro"
        );

        when(inventoryItemRepository.existsByItemCodeIgnoreCase("ITM-200")).thenReturn(false);
        when(inventoryItemRepository.save(any(InventoryItem.class))).thenAnswer(invocation -> {
            InventoryItem item = invocation.getArgument(0);
            return item;
        });

        InventoryItemResponse response = inventoryItemService.createItem(request);

        assertThat(response).isNotNull();
        assertThat(response.itemCode()).isEqualTo("ITM-200");
        assertThat(response.name()).isEqualTo("Explorer Probe");
        assertThat(response.category()).isEqualTo("Diagnostic");
        assertThat(response.unit()).isEqualTo("piece");
        assertThat(response.reorderLevel()).isEqualTo(15);
        assertThat(response.currentQuantity()).isEqualTo(0);
        assertThat(response.active()).isTrue();
        assertThat(response.defaultSupplierReference()).isEqualTo("DentPro");

        ArgumentCaptor<InventoryItem> captor = ArgumentCaptor.forClass(InventoryItem.class);
        verify(inventoryItemRepository).save(captor.capture());
        InventoryItem saved = captor.getValue();
        assertThat(saved.getCurrentQuantity()).isEqualTo(0);
        assertThat(saved.isActive()).isTrue();
    }

    @Test
    @DisplayName("AC-2: Create item with duplicate itemCode throws DuplicateItemCodeException")
    void testCreateItemDuplicateCodeThrows() {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "ITM-DUP",
                "Composite Syringe",
                "Restorative",
                "syringe",
                5,
                null
        );

        when(inventoryItemRepository.existsByItemCodeIgnoreCase("ITM-DUP")).thenReturn(true);

        assertThatThrownBy(() -> inventoryItemService.createItem(request))
                .isInstanceOf(DuplicateItemCodeException.class)
                .hasMessageContaining("ITM-DUP");
    }

    @Test
    @DisplayName("AC-2: Create item with duplicate itemCode ignoring case throws DuplicateItemCodeException")
    void testCreateItemDuplicateCodeIgnoreCaseThrows() {
        CreateInventoryItemRequest request = new CreateInventoryItemRequest(
                "itm-dup",
                "Composite Syringe",
                "Restorative",
                "syringe",
                5,
                null
        );

        when(inventoryItemRepository.existsByItemCodeIgnoreCase("itm-dup")).thenReturn(true);

        assertThatThrownBy(() -> inventoryItemService.createItem(request))
                .isInstanceOf(DuplicateItemCodeException.class)
                .hasMessageContaining("itm-dup");
    }

    @Test
    @DisplayName("AC-4: Get item by ID returns details for existing active or inactive item")
    void testGetItemByIdSuccess() {
        when(inventoryItemRepository.findById(1L)).thenReturn(Optional.of(sampleItem));

        InventoryItemResponse response = inventoryItemService.getItemById(1L);

        assertThat(response).isNotNull();
        assertThat(response.itemCode()).isEqualTo("ITM-100");
        assertThat(response.name()).isEqualTo("Dental Mirror #4");
        assertThat(response.active()).isTrue();
    }

    @Test
    @DisplayName("AC-4: Inactive item remains retrievable by ID")
    void testGetInactiveItemById() {
        sampleItem.setActive(false);
        when(inventoryItemRepository.findById(2L)).thenReturn(Optional.of(sampleItem));

        InventoryItemResponse response = inventoryItemService.getItemById(2L);

        assertThat(response).isNotNull();
        assertThat(response.active()).isFalse();
    }

    @Test
    @DisplayName("AC-4: Get item by ID throws InventoryItemNotFoundException if not found")
    void testGetItemByIdNotFoundThrows() {
        when(inventoryItemRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inventoryItemService.getItemById(999L))
                .isInstanceOf(InventoryItemNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("AC-5 & AC-6: Update item updates catalog fields but preserves itemCode and currentQuantity")
    void testUpdateItemPreservesCodeAndQuantity() {
        when(inventoryItemRepository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(inventoryItemRepository.save(any(InventoryItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateInventoryItemRequest updateRequest = new UpdateInventoryItemRequest(
                "Dental Mirror #4 Premium",
                "Diagnostic Instruments",
                "pack",
                20,
                "NewSupplier Ltd"
        );

        InventoryItemResponse updated = inventoryItemService.updateItem(1L, updateRequest);

        assertThat(updated.name()).isEqualTo("Dental Mirror #4 Premium");
        assertThat(updated.category()).isEqualTo("Diagnostic Instruments");
        assertThat(updated.unit()).isEqualTo("pack");
        assertThat(updated.reorderLevel()).isEqualTo(20);
        assertThat(updated.defaultSupplierReference()).isEqualTo("NewSupplier Ltd");
        // Invariants: code and quantity preserved
        assertThat(updated.itemCode()).isEqualTo("ITM-100");
        assertThat(updated.currentQuantity()).isEqualTo(25);
    }

    @Test
    @DisplayName("AC-7: Update status deactivates item without deleting history or mutating quantity")
    void testDeactivateItem() {
        when(inventoryItemRepository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(inventoryItemRepository.save(any(InventoryItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InventoryItemResponse response = inventoryItemService.updateItemStatus(1L, false);

        assertThat(response.active()).isFalse();
        assertThat(response.currentQuantity()).isEqualTo(25);
        assertThat(sampleItem.isActive()).isFalse();
    }

    @Test
    @DisplayName("AC-7: Update status reactivates previously deactivated item")
    void testReactivateItem() {
        sampleItem.setActive(false);
        when(inventoryItemRepository.findById(1L)).thenReturn(Optional.of(sampleItem));
        when(inventoryItemRepository.save(any(InventoryItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        InventoryItemResponse response = inventoryItemService.updateItemStatus(1L, true);

        assertThat(response.active()).isTrue();
        assertThat(sampleItem.isActive()).isTrue();
    }

    @Test
    @DisplayName("AC-8 & AC-9: Search items queries repository with specification and pageable")
    void testSearchItems() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<InventoryItem> page = new PageImpl<>(List.of(sampleItem), pageable, 1);

        when(inventoryItemRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(page);

        Page<InventoryItemResponse> result = inventoryItemService.searchItems(
                "Mirror",
                "Diagnostic",
                true,
                StockStatusFilter.IN_STOCK,
                pageable
        );

        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).itemCode()).isEqualTo("ITM-100");
    }
}
