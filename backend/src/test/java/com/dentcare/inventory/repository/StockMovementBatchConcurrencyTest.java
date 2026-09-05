package com.dentcare.inventory.repository;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.InventoryBatch;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.InsufficientStockException;
import com.dentcare.inventory.service.StockMovementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-inventory.sql")
class StockMovementBatchConcurrencyTest {

    @Autowired
    private StockMovementService stockMovementService;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Test
    @DisplayName("AC-22: Concurrent stock-outs on the same batch cannot overdraw batch or item quantity")
    void testConcurrentBatchStockOutOverdrawPrevented() throws Exception {
        // 1. Create item and receive 20 units into a named batch
        InventoryItem item = new InventoryItem("ITM-CONCUR-B1", "Composite B1", "Restorative", "syringe", 5, 0, "DentalCorp");
        item.setActive(true);
        item = inventoryItemRepository.save(item);
        final Long itemId = item.getId();

        RecordStockMovementRequest receipt = new RecordStockMovementRequest(
                StockMovementType.RECEIVED, null, 20, "Batch init", 101L, "LOT-CONCUR", LocalDate.now().plusMonths(6), null
        );
        StockMovementResponse receiptResp = stockMovementService.recordMovement(itemId, receipt);
        final Long batchId = receiptResp.inventoryBatchId();

        // 2. Launch 2 concurrent threads attempting to deduct 15 units each from batchId
        int numberOfThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger insufficientCount = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            final long userId = 200L + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    RecordStockMovementRequest useRequest = new RecordStockMovementRequest(
                            StockMovementType.USED, null, 15, "Concurrent use", userId, null, null, null, batchId, null, null
                    );
                    stockMovementService.recordMovement(itemId, useRequest);
                    successCount.incrementAndGet();
                } catch (InsufficientStockException ex) {
                    insufficientCount.incrementAndGet();
                } catch (Exception ex) {
                    ex.printStackTrace();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        finishLatch.await();
        executor.shutdown();

        // Exactly one thread succeeds, one receives InsufficientStockException
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(insufficientCount.get()).isEqualTo(1);

        // Final batch quantity = 5 (20 - 15), final item quantity = 5
        InventoryBatch batch = inventoryBatchRepository.findById(batchId).orElseThrow();
        assertThat(batch.getQuantityOnHand()).isEqualTo(5);

        InventoryItem reloaded = inventoryItemRepository.findById(itemId).orElseThrow();
        assertThat(reloaded.getCurrentQuantity()).isEqualTo(5);
    }

    @Test
    @DisplayName("AC-23: Concurrent unbatched receipts on an item do not create duplicate application-level unbatched balances")
    void testConcurrentUnbatchedReceiptsCoalesce() throws Exception {
        InventoryItem item = new InventoryItem("ITM-CONCUR-UNB", "Gloves L", "Consumables", "box", 5, 0, "GlovesCo");
        item.setActive(true);
        item = inventoryItemRepository.save(item);
        final Long itemId = item.getId();

        int numberOfThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            final long userId = 400L + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    RecordStockMovementRequest r = new RecordStockMovementRequest(
                            StockMovementType.RECEIVED, null, 10, "Concurrent unbatched", userId, null, null, null
                    );
                    stockMovementService.recordMovement(itemId, r);
                    successCount.incrementAndGet();
                } catch (Exception ex) {
                    ex.printStackTrace();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        finishLatch.await();
        executor.shutdown();

        assertThat(successCount.get()).isEqualTo(2);

        // Exactly ONE unbatched balance row exists for this item with total 20
        List<InventoryBatch> batches = inventoryBatchRepository.findByInventoryItemId(itemId);
        assertThat(batches).hasSize(1);
        InventoryBatch unbatched = batches.get(0);
        assertThat(unbatched.getBatchNumber()).isNull();
        assertThat(unbatched.getQuantityOnHand()).isEqualTo(20);

        InventoryItem reloaded = inventoryItemRepository.findById(itemId).orElseThrow();
        assertThat(reloaded.getCurrentQuantity()).isEqualTo(20);
    }
}
