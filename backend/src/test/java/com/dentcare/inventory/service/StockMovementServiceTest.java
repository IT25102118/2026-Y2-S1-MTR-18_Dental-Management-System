package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.AdjustmentDirection;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.entity.StockMovement;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.InactiveInventoryItemException;
import com.dentcare.inventory.exception.InsufficientStockException;
import com.dentcare.inventory.exception.InvalidMovementException;
import com.dentcare.inventory.exception.InventoryItemNotFoundException;
import com.dentcare.inventory.repository.InventoryItemRepository;
import com.dentcare.inventory.repository.StockMovementRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockMovementServiceTest {

    @Mock
    private InventoryItemRepository inventoryItemRepository;

    @Mock
    private StockMovementRepository stockMovementRepository;

    @InjectMocks
    private StockMovementServiceImpl stockMovementService;

    private InventoryItem activeItem;

    @BeforeEach
    void setUp() {
        activeItem = new InventoryItem(
                "ITM-001",
                "Dental Composite A2",
                "Restorative",
                "syringe",
                5,
                20,
                "DentalDirect"
        );
        activeItem.setActive(true);
    }

    @Test
    @DisplayName("AC-1: RECEIVED movement increases currentQuantity atomically and persists audit record")
    void testRecordMovementReceived() {
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.save(any(StockMovement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                10,
                "Shipment received from supplier",
                101L,
                "LOT-2026-A1",
                LocalDate.of(2027, 12, 31),
                null
        );

        StockMovementResponse response = stockMovementService.recordMovement(1L, request);

        assertThat(response).isNotNull();
        assertThat(response.movementType()).isEqualTo(StockMovementType.RECEIVED);
        assertThat(response.quantity()).isEqualTo(10);
        assertThat(response.quantityDelta()).isEqualTo(10);
        assertThat(response.resultingQuantity()).isEqualTo(30);
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(30);

        ArgumentCaptor<StockMovement> movementCaptor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).save(movementCaptor.capture());
        StockMovement saved = movementCaptor.getValue();
        assertThat(saved.getResponsibleUserId()).isEqualTo(101L);
        assertThat(saved.getBatchNumber()).isEqualTo("LOT-2026-A1");
        assertThat(saved.getExpiryDate()).isEqualTo(LocalDate.of(2027, 12, 31));
    }

    @Test
    @DisplayName("AC-2: USED movement decreases currentQuantity and records audit link")
    void testRecordMovementUsed() {
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.save(any(StockMovement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.USED,
                null,
                5,
                "Used in procedure",
                102L,
                null,
                null,
                88L
        );

        StockMovementResponse response = stockMovementService.recordMovement(1L, request);

        assertThat(response.movementType()).isEqualTo(StockMovementType.USED);
        assertThat(response.quantityDelta()).isEqualTo(-5);
        assertThat(response.resultingQuantity()).isEqualTo(15);
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(15);
    }

    @Test
    @DisplayName("AC-3 & AC-4: DAMAGED and EXPIRED decrease quantity")
    void testRecordMovementDamagedAndExpired() {
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.save(any(StockMovement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecordStockMovementRequest damagedRequest = new RecordStockMovementRequest(
                StockMovementType.DAMAGED,
                null,
                2,
                "Dropped and broken",
                103L,
                null,
                null,
                null
        );

        StockMovementResponse response = stockMovementService.recordMovement(1L, damagedRequest);
        assertThat(response.resultingQuantity()).isEqualTo(18);
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(18);

        RecordStockMovementRequest expiredRequest = new RecordStockMovementRequest(
                StockMovementType.EXPIRED,
                null,
                3,
                "Passed expiry date",
                103L,
                null,
                null,
                null
        );

        StockMovementResponse expiredResponse = stockMovementService.recordMovement(1L, expiredRequest);
        assertThat(expiredResponse.resultingQuantity()).isEqualTo(15);
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(15);
    }

    @Test
    @DisplayName("AC-5: ADJUSTED with INCREASE increments stock and requires reason")
    void testRecordMovementAdjustedIncrease() {
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.save(any(StockMovement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.ADJUSTED,
                AdjustmentDirection.INCREASE,
                4,
                "Found extra box during inventory audit",
                104L,
                null,
                null,
                null
        );

        StockMovementResponse response = stockMovementService.recordMovement(1L, request);

        assertThat(response.movementType()).isEqualTo(StockMovementType.ADJUSTED);
        assertThat(response.adjustmentDirection()).isEqualTo(AdjustmentDirection.INCREASE);
        assertThat(response.quantityDelta()).isEqualTo(4);
        assertThat(response.resultingQuantity()).isEqualTo(24);
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(24);
    }

    @Test
    @DisplayName("AC-5: ADJUSTED with DECREASE decrements stock and requires reason")
    void testRecordMovementAdjustedDecrease() {
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.save(any(StockMovement.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.ADJUSTED,
                AdjustmentDirection.DECREASE,
                6,
                "Missing units discovered during count",
                104L,
                null,
                null,
                null
        );

        StockMovementResponse response = stockMovementService.recordMovement(1L, request);

        assertThat(response.movementType()).isEqualTo(StockMovementType.ADJUSTED);
        assertThat(response.adjustmentDirection()).isEqualTo(AdjustmentDirection.DECREASE);
        assertThat(response.quantityDelta()).isEqualTo(-6);
        assertThat(response.resultingQuantity()).isEqualTo(14);
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(14);
    }

    @Test
    @DisplayName("AC-5: ADJUSTED without direction or without reason throws InvalidMovementException")
    void testRecordMovementAdjustedValidation() {
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));

        RecordStockMovementRequest missingDirection = new RecordStockMovementRequest(
                StockMovementType.ADJUSTED,
                null,
                5,
                "Audit correction",
                105L,
                null,
                null,
                null
        );

        assertThatThrownBy(() -> stockMovementService.recordMovement(1L, missingDirection))
                .isInstanceOf(InvalidMovementException.class)
                .hasMessageContaining("Adjustment direction");

        RecordStockMovementRequest missingReason = new RecordStockMovementRequest(
                StockMovementType.ADJUSTED,
                AdjustmentDirection.INCREASE,
                5,
                "   ",
                105L,
                null,
                null,
                null
        );

        assertThatThrownBy(() -> stockMovementService.recordMovement(1L, missingReason))
                .isInstanceOf(InvalidMovementException.class)
                .hasMessageContaining("reason is required");
    }

    @Test
    @DisplayName("AC-7, AC-8 & AC-9: Insufficient stock throws InsufficientStockException and does not mutate or save")
    void testRecordMovementInsufficientStock() {
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));

        RecordStockMovementRequest overdrawRequest = new RecordStockMovementRequest(
                StockMovementType.USED,
                null,
                25, // available is 20
                "Procedure overuse",
                106L,
                null,
                null,
                null
        );

        assertThatThrownBy(() -> stockMovementService.recordMovement(1L, overdrawRequest))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("requested 25, available 20");

        // Assert balance not modified
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(20);
        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    @DisplayName("AC-12: Stock movement on inactive item throws InactiveInventoryItemException")
    void testRecordMovementInactiveItemThrows() {
        activeItem.setActive(false);
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));

        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                10,
                null,
                107L,
                null,
                null,
                null
        );

        assertThatThrownBy(() -> stockMovementService.recordMovement(1L, request))
                .isInstanceOf(InactiveInventoryItemException.class)
                .hasMessageContaining("inactive inventory item");

        verify(stockMovementRepository, never()).save(any());
    }

    @Test
    @DisplayName("AC-6: Quantity <= 0 throws InvalidMovementException")
    void testRecordMovementNonPositiveQuantityThrows() {
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));

        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                0,
                null,
                108L,
                null,
                null,
                null
        );

        assertThatThrownBy(() -> stockMovementService.recordMovement(1L, request))
                .isInstanceOf(InvalidMovementException.class)
                .hasMessageContaining("strictly greater than zero");
    }

    @Test
    @DisplayName("AC-14: Movement history retrieves paginated records from repository")
    void testGetItemMovementHistory() {
        when(inventoryItemRepository.existsById(1L)).thenReturn(true);
        Pageable pageable = PageRequest.of(0, 10);
        StockMovement movement = new StockMovement(
                activeItem,
                StockMovementType.RECEIVED,
                10,
                101L
        );
        Page<StockMovement> page = new PageImpl<>(List.of(movement), pageable, 1);
        when(stockMovementRepository.findByInventoryItemId(1L, pageable)).thenReturn(page);

        Page<StockMovementResponse> result = stockMovementService.getItemMovementHistory(1L, null, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).movementType()).isEqualTo(StockMovementType.RECEIVED);
    }
}
