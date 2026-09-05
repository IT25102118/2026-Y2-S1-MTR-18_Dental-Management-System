package com.dentcare.inventory.service;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.ReverseStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.AdjustmentDirection;
import com.dentcare.inventory.entity.InventoryBatch;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.InsufficientStockException;
import com.dentcare.inventory.exception.InvalidMovementException;
import com.dentcare.inventory.repository.InventoryBatchRepository;
import com.dentcare.inventory.repository.InventoryItemRepository;
import com.dentcare.inventory.repository.StockMovementRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-inventory.sql")
class StockMovementBatchTest {

    @Autowired
    private StockMovementService stockMovementService;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    private InventoryItem testItem;

    @BeforeEach
    void setUp() {
        testItem = new InventoryItem(
                "ITM-BATCH-001",
                "Dental Composite A2",
                "Restorative",
                "syringe",
                5,
                0,
                "DentalDirect"
        );
        testItem.setActive(true);
        testItem = inventoryItemRepository.save(testItem);
    }

    @Test
    @DisplayName("AC-3 & AC-21: Pre-S4B positive item without batches lazily initializes unbatched balance")
    void testLegacyBatchCompatibility() {
        InventoryItem legacyItem = new InventoryItem("ITM-LEGACY", "Cotton Rolls", "Consumables", "pack", 10, 30, "SupplyCo");
        legacyItem.setActive(true);
        legacyItem = inventoryItemRepository.save(legacyItem);

        // Record a movement without batchId
        RecordStockMovementRequest useRequest = new RecordStockMovementRequest(
                StockMovementType.USED,
                null,
                5,
                "Routine procedure",
                101L,
                null,
                null,
                null
        );
        StockMovementResponse response = stockMovementService.recordMovement(legacyItem.getId(), useRequest);

        assertThat(response.resultingQuantity()).isEqualTo(25);

        List<InventoryBatch> batches = inventoryBatchRepository.findByInventoryItemId(legacyItem.getId());
        assertThat(batches).hasSize(1);
        InventoryBatch unbatched = batches.get(0);
        assertThat(unbatched.getBatchNumber()).isNull();
        assertThat(unbatched.getExpiryDate()).isNull();
        assertThat(unbatched.getReceivedDate()).isNull();
        assertThat(unbatched.getQuantityOnHand()).isEqualTo(25);
    }

    @Test
    @DisplayName("AC-6 & AC-7: RECEIVED into new named batch updates batch and item atomically")
    void testReceivedNewNamedBatch() {
        LocalDate expiry = LocalDate.now().plusMonths(12);
        LocalDate received = LocalDate.now();

        RecordStockMovementRequest request = new RecordStockMovementRequest(
                StockMovementType.RECEIVED,
                null,
                20,
                "Initial delivery",
                101L,
                "LOT-2026-A",
                expiry,
                null,
                null,
                received,
                "CustomSupplier"
        );

        StockMovementResponse response = stockMovementService.recordMovement(testItem.getId(), request);

        assertThat(response.movementType()).isEqualTo(StockMovementType.RECEIVED);
        assertThat(response.quantity()).isEqualTo(20);
        assertThat(response.resultingQuantity()).isEqualTo(20);
        assertThat(response.inventoryBatchId()).isNotNull();
        assertThat(response.batchNumber()).isEqualTo("LOT-2026-A");
        assertThat(response.expiryDate()).isEqualTo(expiry);

        InventoryBatch batch = inventoryBatchRepository.findById(response.inventoryBatchId()).orElseThrow();
        assertThat(batch.getBatchNumber()).isEqualTo("LOT-2026-A");
        assertThat(batch.getQuantityOnHand()).isEqualTo(20);
        assertThat(batch.getSupplierReference()).isEqualTo("CustomSupplier");

        InventoryItem item = inventoryItemRepository.findById(testItem.getId()).orElseThrow();
        assertThat(item.getCurrentQuantity()).isEqualTo(20);
    }

    @Test
    @DisplayName("AC-8 & AC-9: RECEIVED into existing named batch increments batch; conflicting expiry rejected")
    void testReceivedExistingNamedBatchAndExpiryConflict() {
        LocalDate expiry = LocalDate.now().plusMonths(6);

        // 1. Initial receipt
        RecordStockMovementRequest firstReceipt = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 10, "First delivery", 101L, "LOT-EXIST", expiry, null
        );
        stockMovementService.recordMovement(testItem.getId(), firstReceipt);

        // 2. Second receipt with same batch number and matching expiry
        RecordStockMovementRequest secondReceipt = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 15, "Second delivery", 101L, "LOT-EXIST", expiry, null
        );
        StockMovementResponse response2 = stockMovementService.recordMovement(testItem.getId(), secondReceipt);
        assertThat(response2.resultingQuantity()).isEqualTo(25);

        InventoryBatch batch = inventoryBatchRepository.findByInventoryItemIdAndBatchNumber(testItem.getId(), "LOT-EXIST").orElseThrow();
        assertThat(batch.getQuantityOnHand()).isEqualTo(25);

        // 3. Third receipt with conflicting expiry date rejected with 400
        RecordStockMovementRequest conflictingReceipt = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 5, "Bad delivery", 101L, "LOT-EXIST", expiry.plusDays(30), null
        );
        assertThatThrownBy(() -> stockMovementService.recordMovement(testItem.getId(), conflictingReceipt))
                .isInstanceOf(InvalidMovementException.class)
                .hasMessageContaining("Conflicting expiry date");
    }

    @Test
    @DisplayName("AC-11: RECEIVED without batch number creates or increments unbatched balance")
    void testReceivedUnbatched() {
        RecordStockMovementRequest r1 = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 10, "Unbatched 1", 101L, null, null, null
        );
        stockMovementService.recordMovement(testItem.getId(), r1);

        RecordStockMovementRequest r2 = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 15, "Unbatched 2", 101L, null, null, null
        );
        stockMovementService.recordMovement(testItem.getId(), r2);

        List<InventoryBatch> batches = inventoryBatchRepository.findByInventoryItemId(testItem.getId());
        assertThat(batches).hasSize(1);
        assertThat(batches.get(0).getBatchNumber()).isNull();
        assertThat(batches.get(0).getQuantityOnHand()).isEqualTo(25);
    }

    @Test
    @DisplayName("AC-12, AC-17 & AC-18: Stock-out deducts from selected batch and rejects overdraw")
    void testStockOutExplicitBatchAndOverdrawRejection() {
        // Setup 2 batches: B1 has 10, B2 has 20
        RecordStockMovementRequest r1 = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 10, "B1", 101L, "LOT-B1", LocalDate.now().plusMonths(6), null
        );
        StockMovementResponse resp1 = stockMovementService.recordMovement(testItem.getId(), r1);
        Long batch1Id = resp1.inventoryBatchId();

        RecordStockMovementRequest r2 = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 20, "B2", 101L, "LOT-B2", LocalDate.now().plusMonths(12), null
        );
        stockMovementService.recordMovement(testItem.getId(), r2);

        // Deduct 6 from B1
        RecordStockMovementRequest useRequest = new RecordStockMovementRequest(
                StockMovementType.USED, null, 6, "Used B1", 102L, null, null, null, batch1Id, null, null
        );
        StockMovementResponse useResp = stockMovementService.recordMovement(testItem.getId(), useRequest);
        assertThat(useResp.resultingQuantity()).isEqualTo(24); // 30 - 6

        InventoryBatch b1 = inventoryBatchRepository.findById(batch1Id).orElseThrow();
        assertThat(b1.getQuantityOnHand()).isEqualTo(4);

        // Attempt to deduct 5 from B1 (only 4 available) -> InsufficientStockException
        RecordStockMovementRequest overdraw = new RecordStockMovementRequest(
                StockMovementType.USED, null, 5, "Overdraw B1", 102L, null, null, null, batch1Id, null, null
        );
        assertThatThrownBy(() -> stockMovementService.recordMovement(testItem.getId(), overdraw))
                .isInstanceOf(InsufficientStockException.class);

        // State preserved
        assertThat(b1.getQuantityOnHand()).isEqualTo(4);
    }

    @Test
    @DisplayName("AC-19 & AC-20: Multiple positive batches without explicit selection rejected with 400 (NO FEFO/FIFO)")
    void testMultipleBatchesRequireExplicitSelection() {
        stockMovementService.recordMovement(testItem.getId(), new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 10, "B1", 101L, "LOT-1", LocalDate.now().plusMonths(3), null
        ));
        stockMovementService.recordMovement(testItem.getId(), new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 15, "B2", 101L, "LOT-2", LocalDate.now().plusMonths(6), null
        ));

        RecordStockMovementRequest ambigUse = new RecordStockMovementRequest(
                StockMovementType.USED, null, 5, "Ambiguous use", 101L, null, null, null
        );

        assertThatThrownBy(() -> stockMovementService.recordMovement(testItem.getId(), ambigUse))
                .isInstanceOf(InvalidMovementException.class)
                .hasMessageContaining("Batch selection is required");
    }

    @Test
    @DisplayName("AC-24: Reversing a batch-linked movement applies opposite effect to the exact same batch")
    void testReversalBatchLinkedMovement() {
        StockMovementResponse receivedResp = stockMovementService.recordMovement(testItem.getId(), new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 10, "Lot A receipt", 101L, "LOT-A", LocalDate.now().plusMonths(6), null
        ));
        Long batchId = receivedResp.inventoryBatchId();

        // Reverse the receipt -> item decreases by 10, batch decreases by 10
        ReverseStockMovementRequest reverseRequest = new ReverseStockMovementRequest("Supplier return", 201L);
        StockMovementResponse revResp = stockMovementService.reverseMovement(testItem.getId(), receivedResp.id(), reverseRequest);

        assertThat(revResp.resultingQuantity()).isEqualTo(0);
        assertThat(revResp.inventoryBatchId()).isEqualTo(batchId);

        InventoryBatch batch = inventoryBatchRepository.findById(batchId).orElseThrow();
        assertThat(batch.getQuantityOnHand()).isEqualTo(0);

        InventoryItem item = inventoryItemRepository.findById(testItem.getId()).orElseThrow();
        assertThat(item.getCurrentQuantity()).isEqualTo(0);
    }

    @Test
    @DisplayName("AC-26: Reversing receipt fails if the specific batch has already been consumed below quantity")
    void testReversingReceiptFailsIfBatchConsumed() {
        StockMovementResponse receivedResp = stockMovementService.recordMovement(testItem.getId(), new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 10, "Lot X receipt", 101L, "LOT-X", LocalDate.now().plusMonths(6), null
        ));
        Long batchId = receivedResp.inventoryBatchId();

        // Consume 5 from batch
        stockMovementService.recordMovement(testItem.getId(), new RecordStockMovementRequest(
                StockMovementType.USED, null, 5, "Use Lot X", 101L, null, null, null, batchId, null, null
        ));

        // Now batch has 5. Reversing the original receipt of 10 would cause -5 in batch -> must fail
        ReverseStockMovementRequest revReq = new ReverseStockMovementRequest("Try reverse consumed receipt", 201L);
        assertThatThrownBy(() -> stockMovementService.reverseMovement(testItem.getId(), receivedResp.id(), revReq))
                .isInstanceOf(InsufficientStockException.class);
    }
}
