package com.dentcare.inventory.repository;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.InsufficientStockException;
import com.dentcare.inventory.service.StockMovementService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-inventory.sql")
class StockMovementConcurrencyTest {

    @Autowired
    private StockMovementService stockMovementService;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Test
    @DisplayName("AC-13: Pessimistic write locking prevents concurrent stock-out double spend")
    void testConcurrentStockOutDoubleSpendPrevented() throws Exception {
        // Setup item with quantity 20
        InventoryItem item = new InventoryItem(
                "ITM-CONCUR-01",
                "Surgical Blades",
                "Surgical",
                "box",
                5,
                20,
                "SurgicalSupply"
        );
        item.setActive(true);
        item = inventoryItemRepository.save(item);
        final Long itemId = item.getId();

        int numberOfThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger insufficientStockCount = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            final long userId = 200L + i;
            executor.submit(() -> {
                try {
                    startLatch.await(); // wait for simultaneous start
                    RecordStockMovementRequest request = new RecordStockMovementRequest(
                            StockMovementType.USED,
                            null,
                            15, // Attempting to deduct 15 out of 20
                            "Concurrent deduction",
                            userId,
                            null,
                            null,
                            null
                    );
                    stockMovementService.recordMovement(itemId, request);
                    successCount.incrementAndGet();
                } catch (InsufficientStockException ex) {
                    insufficientStockCount.incrementAndGet();
                } catch (Exception ex) {
                    ex.printStackTrace();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Trigger threads simultaneously
        finishLatch.await();
        executor.shutdown();

        // Exactly 1 thread should succeed, exactly 1 should fail with InsufficientStockException
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(insufficientStockCount.get()).isEqualTo(1);

        // Final item quantity must be exactly 5 (20 - 15) and never negative
        InventoryItem reloaded = inventoryItemRepository.findById(itemId).orElseThrow();
        assertThat(reloaded.getCurrentQuantity()).isEqualTo(5);

        // Exactly 1 movement record should exist for this item
        long movementCount = stockMovementRepository.findByInventoryItemIdOrderByOccurredAtDesc(itemId).size();
        assertThat(movementCount).isEqualTo(1);
    }
}
