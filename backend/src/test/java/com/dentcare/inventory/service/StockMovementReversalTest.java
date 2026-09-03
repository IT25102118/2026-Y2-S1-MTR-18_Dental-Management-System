package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.ReverseStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.AdjustmentDirection;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.entity.StockMovement;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.DuplicateReversalException;
import com.dentcare.inventory.exception.InsufficientStockException;
import com.dentcare.inventory.exception.InvalidMovementException;
import com.dentcare.inventory.exception.StockMovementNotFoundException;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StockMovementReversalTest {

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
        // Simulate database assigned ID
        try {
            var idField = InventoryItem.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(activeItem, 1L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private StockMovement createMockMovement(Long id, StockMovementType type, AdjustmentDirection direction,
                                            int quantity, Long reversalOfId) {
        StockMovement sm = new StockMovement(
                activeItem,
                type,
                direction,
                quantity,
                LocalDateTime.now().minusDays(1),
                "Original reason",
                101L,
                reversalOfId,
                88L,
                "LOT-REV-1",
                LocalDate.of(2027, 6, 30)
        );
        try {
            var idField = StockMovement.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(sm, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return sm;
    }

    @Test
    @DisplayName("AC-1, AC-2, AC-8 & AC-9: Reversing RECEIVED creates ADJUSTED DECREASE and decrements stock")
    void testReverseReceivedMovement() {
        StockMovement original = createMockMovement(10L, StockMovementType.RECEIVED, null, 10, null);

        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.findById(10L)).thenReturn(Optional.of(original));
        when(stockMovementRepository.existsByReversalOfMovementId(10L)).thenReturn(false);
        when(stockMovementRepository.saveAndFlush(any(StockMovement.class))).thenAnswer(inv -> inv.getArgument(0));

        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Supplier delivery returned", 201L);

        StockMovementResponse response = stockMovementService.reverseMovement(1L, 10L, request);

        assertThat(response.movementType()).isEqualTo(StockMovementType.ADJUSTED);
        assertThat(response.adjustmentDirection()).isEqualTo(AdjustmentDirection.DECREASE);
        assertThat(response.quantity()).isEqualTo(10);
        assertThat(response.quantityDelta()).isEqualTo(-10);
        assertThat(response.resultingQuantity()).isEqualTo(10); // 20 - 10
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(10);

        ArgumentCaptor<StockMovement> captor = ArgumentCaptor.forClass(StockMovement.class);
        verify(stockMovementRepository).saveAndFlush(captor.capture());
        StockMovement saved = captor.getValue();
        assertThat(saved.getReversalOfMovementId()).isEqualTo(10L);
        assertThat(saved.getReason()).isEqualTo("Supplier delivery returned");
        assertThat(saved.getResponsibleUserId()).isEqualTo(201L);
        assertThat(saved.getBatchNumber()).isEqualTo("LOT-REV-1");
        assertThat(saved.getExpiryDate()).isEqualTo(LocalDate.of(2027, 6, 30));
        assertThat(saved.getTreatmentProcedureId()).isEqualTo(88L);

        // Original movement remains unmodified
        assertThat(original.getMovementType()).isEqualTo(StockMovementType.RECEIVED);
        assertThat(original.getReversalOfMovementId()).isNull();
    }

    @Test
    @DisplayName("AC-3: Reversing USED, DAMAGED, EXPIRED creates ADJUSTED INCREASE and increments stock")
    void testReverseStockOutMovements() {
        StockMovement used = createMockMovement(11L, StockMovementType.USED, null, 5, null);
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.findById(11L)).thenReturn(Optional.of(used));
        when(stockMovementRepository.existsByReversalOfMovementId(11L)).thenReturn(false);
        when(stockMovementRepository.saveAndFlush(any(StockMovement.class))).thenAnswer(inv -> inv.getArgument(0));

        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Procedure canceled, material returned", 202L);
        StockMovementResponse response = stockMovementService.reverseMovement(1L, 11L, request);

        assertThat(response.movementType()).isEqualTo(StockMovementType.ADJUSTED);
        assertThat(response.adjustmentDirection()).isEqualTo(AdjustmentDirection.INCREASE);
        assertThat(response.quantityDelta()).isEqualTo(5);
        assertThat(response.resultingQuantity()).isEqualTo(25); // 20 + 5
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(25);
    }

    @Test
    @DisplayName("AC-4: Reversing ADJUSTED INCREASE creates ADJUSTED DECREASE and vice-versa")
    void testReverseAdjustedMovements() {
        StockMovement adjIncrease = createMockMovement(12L, StockMovementType.ADJUSTED, AdjustmentDirection.INCREASE, 4, null);
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.findById(12L)).thenReturn(Optional.of(adjIncrease));
        when(stockMovementRepository.existsByReversalOfMovementId(12L)).thenReturn(false);
        when(stockMovementRepository.saveAndFlush(any(StockMovement.class))).thenAnswer(inv -> inv.getArgument(0));

        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Correcting erroneous surplus adjustment", 203L);
        StockMovementResponse response = stockMovementService.reverseMovement(1L, 12L, request);

        assertThat(response.movementType()).isEqualTo(StockMovementType.ADJUSTED);
        assertThat(response.adjustmentDirection()).isEqualTo(AdjustmentDirection.DECREASE);
        assertThat(response.quantityDelta()).isEqualTo(-4);
        assertThat(response.resultingQuantity()).isEqualTo(16); // 20 - 4
    }

    @Test
    @DisplayName("AC-5, AC-10 & AC-11: Reversing stock-in that would cause negative stock throws InsufficientStockException")
    void testReverseStockInCausingNegativeStockThrows() {
        StockMovement received = createMockMovement(13L, StockMovementType.RECEIVED, null, 25, null);
        // Current quantity is 20; reversing 25 would cause -5
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.findById(13L)).thenReturn(Optional.of(received));
        when(stockMovementRepository.existsByReversalOfMovementId(13L)).thenReturn(false);

        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Wrong shipment entered", 204L);

        assertThatThrownBy(() -> stockMovementService.reverseMovement(1L, 13L, request))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("requested 25, available 20");

        assertThat(activeItem.getCurrentQuantity()).isEqualTo(20);
        verify(stockMovementRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("AC-6 & AC-13: Duplicate reversal is rejected with DuplicateReversalException")
    void testDuplicateReversalThrows() {
        StockMovement original = createMockMovement(14L, StockMovementType.USED, null, 5, null);
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.findById(14L)).thenReturn(Optional.of(original));
        when(stockMovementRepository.existsByReversalOfMovementId(14L)).thenReturn(true);

        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Reversing again", 205L);

        assertThatThrownBy(() -> stockMovementService.reverseMovement(1L, 14L, request))
                .isInstanceOf(DuplicateReversalException.class)
                .hasMessageContaining("already been reversed: ID 14");

        verify(stockMovementRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("AC-16: Reversing a movement that is already a reversal throws InvalidMovementException")
    void testReversingAReversalThrows() {
        // sm has reversalOfMovementId = 99L (meaning sm is itself a reversal)
        StockMovement reversalMovement = createMockMovement(15L, StockMovementType.ADJUSTED, AdjustmentDirection.INCREASE, 5, 99L);
        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.findById(15L)).thenReturn(Optional.of(reversalMovement));

        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Try to reverse reversal", 206L);

        assertThatThrownBy(() -> stockMovementService.reverseMovement(1L, 15L, request))
                .isInstanceOf(InvalidMovementException.class)
                .hasMessageContaining("already a reversal");
    }

    @Test
    @DisplayName("AC-17: Reversal is permitted on inactive items for clerical reconciliation")
    void testReversalPermittedOnInactiveItem() {
        activeItem.setActive(false);
        StockMovement original = createMockMovement(16L, StockMovementType.USED, null, 3, null);

        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.findById(16L)).thenReturn(Optional.of(original));
        when(stockMovementRepository.existsByReversalOfMovementId(16L)).thenReturn(false);
        when(stockMovementRepository.saveAndFlush(any(StockMovement.class))).thenAnswer(inv -> inv.getArgument(0));

        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Clerical correction on discontinued item", 207L);

        StockMovementResponse response = stockMovementService.reverseMovement(1L, 16L, request);

        assertThat(response).isNotNull();
        assertThat(response.movementType()).isEqualTo(StockMovementType.ADJUSTED);
        assertThat(response.quantityDelta()).isEqualTo(3);
        assertThat(response.resultingQuantity()).isEqualTo(23);
        assertThat(activeItem.getCurrentQuantity()).isEqualTo(23);
    }

    @Test
    @DisplayName("AC-18: Movement not belonging to item throws StockMovementNotFoundException")
    void testMismatchedItemMovementThrows() {
        InventoryItem otherItem = new InventoryItem("OTHER", "Other item", "Cat", "box", 1, 10, null);
        try {
            var idField = InventoryItem.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(otherItem, 999L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        StockMovement sm = new StockMovement(otherItem, StockMovementType.USED, 5, 101L);
        try {
            var idField = StockMovement.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(sm, 17L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(inventoryItemRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(activeItem));
        when(stockMovementRepository.findById(17L)).thenReturn(Optional.of(sm));

        ReverseStockMovementRequest request = new ReverseStockMovementRequest("Wrong item", 208L);

        assertThatThrownBy(() -> stockMovementService.reverseMovement(1L, 17L, request))
                .isInstanceOf(StockMovementNotFoundException.class)
                .hasMessageContaining("17");
    }
}
