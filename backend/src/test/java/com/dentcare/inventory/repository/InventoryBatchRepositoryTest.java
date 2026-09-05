package com.dentcare.inventory.repository;

import com.dentcare.inventory.entity.InventoryBatch;
import com.dentcare.inventory.entity.InventoryItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-inventory.sql")
class InventoryBatchRepositoryTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private InventoryBatchRepository inventoryBatchRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    private InventoryItem itemA;
    private InventoryItem itemB;

    @BeforeEach
    void setUp() {
        itemA = new InventoryItem("ITM-B-001", "Composite Syringe", "Restorative", "syringe", 5, 20, "DentalCorp");
        itemA.setActive(true);
        itemA = inventoryItemRepository.save(itemA);

        itemB = new InventoryItem("ITM-B-002", "Anesthetic Cartridge", "Anesthetics", "cartridge", 10, 50, "MedSupply");
        itemB.setActive(true);
        itemB = inventoryItemRepository.save(itemB);
    }

    @Test
    @DisplayName("AC-1: Persists and retrieves InventoryBatch with non-negative stock constraint")
    void testPersistAndRetrieveBatch() {
        InventoryBatch batch = new InventoryBatch(
                itemA,
                "LOT-2026-001",
                LocalDate.now().plusMonths(6),
                15,
                LocalDate.now(),
                "Supplier-Alpha"
        );
        InventoryBatch saved = inventoryBatchRepository.save(batch);
        entityManager.flush();
        entityManager.clear();

        Optional<InventoryBatch> found = inventoryBatchRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getBatchNumber()).isEqualTo("LOT-2026-001");
        assertThat(found.get().getQuantityOnHand()).isEqualTo(15);
        assertThat(found.get().getSupplierReference()).isEqualTo("Supplier-Alpha");
        assertThat(found.get().getCreatedAt()).isNotNull();
        assertThat(found.get().getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("AC-1 & AC-17: Quantity on hand cannot be decreased below zero")
    void testNegativeQuantityProhibitedAtEntityLevel() {
        InventoryBatch batch = new InventoryBatch(itemA, "LOT-NEG", LocalDate.now().plusMonths(3), 5, null, null);
        assertThatThrownBy(() -> batch.decreaseQuantity(10))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot decrease batch quantity below zero");
    }

    @Test
    @DisplayName("AC-1: Unique constraint enforces unique batchNumber per item")
    void testDuplicateBatchNumberPerItemRejected() {
        InventoryBatch batch1 = new InventoryBatch(itemA, "LOT-DUP", LocalDate.now().plusMonths(12), 10, null, null);
        inventoryBatchRepository.save(batch1);
        entityManager.flush();

        InventoryBatch batch2 = new InventoryBatch(itemA, "LOT-DUP", LocalDate.now().plusMonths(12), 5, null, null);
        assertThatThrownBy(() -> {
            inventoryBatchRepository.save(batch2);
            entityManager.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }


    @Test
    @DisplayName("AC-1: Same batch number is permitted across different items")
    void testSameBatchNumberAcrossDifferentItemsAllowed() {
        InventoryBatch batchA = new InventoryBatch(itemA, "LOT-SHARED", LocalDate.now().plusMonths(6), 10, null, null);
        InventoryBatch batchB = new InventoryBatch(itemB, "LOT-SHARED", LocalDate.now().plusMonths(6), 25, null, null);

        inventoryBatchRepository.save(batchA);
        inventoryBatchRepository.save(batchB);
        entityManager.flush();

        List<InventoryBatch> batchesItemA = inventoryBatchRepository.findByInventoryItemId(itemA.getId());
        List<InventoryBatch> batchesItemB = inventoryBatchRepository.findByInventoryItemId(itemB.getId());

        assertThat(batchesItemA).hasSize(1);
        assertThat(batchesItemB).hasSize(1);
        assertThat(batchesItemA.get(0).getBatchNumber()).isEqualTo("LOT-SHARED");
        assertThat(batchesItemB.get(0).getBatchNumber()).isEqualTo("LOT-SHARED");
    }

    @Test
    @DisplayName("AC-3: Nullable batchNumber represents unbatched legacy balance")
    void testUnbatchedLegacyBatchAllowed() {
        InventoryBatch unbatched = new InventoryBatch(itemA, null, null, 20, null, "DentalCorp");
        InventoryBatch saved = inventoryBatchRepository.save(unbatched);
        entityManager.flush();
        entityManager.clear();

        Optional<InventoryBatch> found = inventoryBatchRepository.findByInventoryItemIdAndBatchNumberIsNull(itemA.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(saved.getId());
        assertThat(found.get().getBatchNumber()).isNull();
        assertThat(found.get().getExpiryDate()).isNull();
        assertThat(found.get().getReceivedDate()).isNull();
        assertThat(found.get().getQuantityOnHand()).isEqualTo(20);
    }

    @Test
    @DisplayName("AC-27 & AC-28: findExpiringOrExpiredBatches excludes depleted stock and unbatched stock")
    void testExpiryQueryFilters() {
        LocalDate today = LocalDate.now();

        // 1. Expired with positive quantity (should appear)
        InventoryBatch expiredPositive = new InventoryBatch(itemA, "B-EXP", today.minusDays(5), 4, null, null);
        // 2. Expiring soon with positive quantity (should appear)
        InventoryBatch expiringSoon = new InventoryBatch(itemA, "B-SOON", today.plusDays(10), 8, null, null);
        // 3. Expiring later outside cutoff (should NOT appear)
        InventoryBatch expiringLater = new InventoryBatch(itemA, "B-LATER", today.plusDays(45), 10, null, null);
        // 4. Expired but 0 stock (depleted, should NOT appear)
        InventoryBatch depletedExpired = new InventoryBatch(itemA, "B-DEP", today.minusDays(10), 0, null, null);
        // 5. Unbatched balance without expiry (should NOT appear)
        InventoryBatch unbatched = new InventoryBatch(itemA, null, null, 15, null, null);

        inventoryBatchRepository.saveAll(List.of(expiredPositive, expiringSoon, expiringLater, depletedExpired, unbatched));
        entityManager.flush();
        entityManager.clear();

        Page<InventoryBatch> alerts = inventoryBatchRepository.findExpiringOrExpiredBatches(
                today.plusDays(30),
                PageRequest.of(0, 20)
        );

        assertThat(alerts.getTotalElements()).isEqualTo(2);
        List<String> batchNumbers = alerts.getContent().stream().map(InventoryBatch::getBatchNumber).toList();
        assertThat(batchNumbers).containsExactlyInAnyOrder("B-EXP", "B-SOON");
    }

    @Test
    @DisplayName("AC-32: searchBatches supports item, batch substring, expiry range, and positive stock filters")
    void testSearchBatches() {
        LocalDate today = LocalDate.now();
        InventoryBatch b1 = new InventoryBatch(itemA, "LOT-ABC-1", today.plusMonths(3), 10, null, null);
        InventoryBatch b2 = new InventoryBatch(itemA, "LOT-XYZ-2", today.plusMonths(6), 0, null, null);
        InventoryBatch b3 = new InventoryBatch(itemB, "LOT-ABC-3", today.plusMonths(9), 20, null, null);

        inventoryBatchRepository.saveAll(List.of(b1, b2, b3));
        entityManager.flush();
        entityManager.clear();

        // Search by substring "abc" + positiveStockOnly
        Page<InventoryBatch> result = inventoryBatchRepository.searchBatches(
                null,
                "abc",
                null,
                null,
                true,
                PageRequest.of(0, 10)
        );

        assertThat(result.getTotalElements()).isEqualTo(2);
        List<String> numbers = result.getContent().stream().map(InventoryBatch::getBatchNumber).toList();
        assertThat(numbers).containsExactlyInAnyOrder("LOT-ABC-1", "LOT-ABC-3");
    }
}
