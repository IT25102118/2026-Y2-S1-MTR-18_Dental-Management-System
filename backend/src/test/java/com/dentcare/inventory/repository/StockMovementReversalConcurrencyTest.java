package com.dentcare.inventory.repository;

import com.dentcare.inventory.dto.RecordStockMovementRequest;
import com.dentcare.inventory.dto.ReverseStockMovementRequest;
import com.dentcare.inventory.dto.StockMovementResponse;
import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.entity.StockMovementType;
import com.dentcare.inventory.exception.DuplicateReversalException;
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
class StockMovementReversalConcurrencyTest {

    @Autowired
    private StockMovementService stockMovementService;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Test
    @DisplayName("AC-14 & AC-15: Concurrent duplicate reversal attempts result in exactly one successful reversal")
    void testConcurrentDuplicateReversalPrevented() throws Exception {
        // 1. Create item with 20 units
        InventoryItem item = new InventoryItem(
                "ITM-REV-CONCUR",
                "Latex Gloves M",
                "Consumables",
                "box",
                5,
                20,
                "GlovesDirect"
        );
        item.setActive(true);
        item = inventoryItemRepository.save(item);
        final Long itemId = item.getId();

        // 2. Record an original USED movement of 5 units (stock becomes 15)
        RecordStockMovementRequest usedRequest = new RecordStockMovementRequest(
                StockMovementType.USED,
                null,
                5,
                "Procedure use",
                101L,
                null,
                null,
                null
        );
        StockMovementResponse originalMovement = stockMovementService.recordMovement(itemId, usedRequest);
        final Long originalMovementId = originalMovement.id();

        // Check stock is 15
        InventoryItem afterUsed = inventoryItemRepository.findById(itemId).orElseThrow();
        assertThat(afterUsed.getCurrentQuantity()).isEqualTo(15);

        // 3. Launch 2 concurrent threads attempting to reverse the exact same movement
        int numberOfThreads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(numberOfThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(numberOfThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger duplicateReversalCount = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            final long userId = 300L + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    ReverseStockMovementRequest reverseRequest = new ReverseStockMovementRequest(
                            "Concurrent reversal attempt",
                            userId
                    );
                    stockMovementService.reverseMovement(itemId, originalMovementId, reverseRequest);
                    successCount.incrementAndGet();
                } catch (DuplicateReversalException ex) {
                    duplicateReversalCount.incrementAndGet();
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

        // Exactly one thread succeeds, exactly one fails with DuplicateReversalException
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(duplicateReversalCount.get()).isEqualTo(1);

        // Final item stock must be exactly 20 (15 + 5), never 25 (15 + 5 + 5)
        InventoryItem reloaded = inventoryItemRepository.findById(itemId).orElseThrow();
        assertThat(reloaded.getCurrentQuantity()).isEqualTo(20);

        // Exactly one reversal movement referencing originalMovementId exists
        boolean exists = stockMovementRepository.existsByReversalOfMovementId(originalMovementId);
        assertThat(exists).isTrue();

        long reversalsForOriginal = stockMovementRepository.findAll().stream()
                .filter(m -> originalMovementId.equals(m.getReversalOfMovementId()))
                .count();
        assertThat(reversalsForOriginal).isEqualTo(1);
    }
}
