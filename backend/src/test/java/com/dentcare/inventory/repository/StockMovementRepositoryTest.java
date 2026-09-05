package com.dentcare.inventory.repository;

import com.dentcare.inventory.entity.InventoryItem;
import com.dentcare.inventory.entity.StockMovement;
import com.dentcare.inventory.entity.StockMovementType;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;

import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-inventory.sql")
class StockMovementRepositoryTest {

    @Autowired
    private StockMovementRepository stockMovementRepository;

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private TestEntityManager entityManager;

    private InventoryItem defaultItem;

    @BeforeEach
    void setUp() {
        defaultItem = new InventoryItem(
                "ITM-MV-001",
                "Dental Cotton Rolls",
                "Consumables",
                "pack",
                10,
                100,
                "DentalSupplies Co."
        );
        defaultItem = inventoryItemRepository.save(defaultItem);
        entityManager.flush();
    }

    @Test
    @DisplayName("AC-3: All five canonical StockMovementType values persist and reload correctly")
    void testPersistAndReloadAllMovementTypes() {
        for (StockMovementType type : StockMovementType.values()) {
            StockMovement movement = new StockMovement(
                    defaultItem,
                    type,
                    5,
                    LocalDateTime.now(),
                    "Test for type " + type.name(),
                    101L,
                    null,
                    null,
                    "BATCH-" + type.name(),
                    LocalDate.now().plusMonths(6)
            );

            StockMovement saved = stockMovementRepository.save(movement);
            entityManager.flush();
            entityManager.clear();

            Optional<StockMovement> reloadedOpt = stockMovementRepository.findById(saved.getId());
            assertThat(reloadedOpt).isPresent();
            assertThat(reloadedOpt.get().getMovementType()).isEqualTo(type);
            assertThat(reloadedOpt.get().getQuantity()).isEqualTo(5);
        }
    }

    @Test
    @DisplayName("AC-4: Movement quantity <= 0 is rejected by validation/database constraint")
    void testQuantityMustBeStrictlyPositive() {
        StockMovement zeroQtyMovement = new StockMovement(
                defaultItem,
                StockMovementType.RECEIVED,
                0,
                101L
        );

        assertThatThrownBy(() -> {
            stockMovementRepository.save(zeroQtyMovement);
            entityManager.flush();
        }).isInstanceOfAny(ConstraintViolationException.class, DataIntegrityViolationException.class);

        entityManager.clear();

        StockMovement negativeQtyMovement = new StockMovement(
                defaultItem,
                StockMovementType.USED,
                -10,
                101L
        );

        assertThatThrownBy(() -> {
            stockMovementRepository.save(negativeQtyMovement);
            entityManager.flush();
        }).isInstanceOfAny(ConstraintViolationException.class, DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("AC-5: Movement records preserve responsible-user ID and occurrence timestamp")
    void testResponsibleUserIdAndTimestampPreserved() {
        LocalDateTime occurredTime = LocalDateTime.of(2026, 8, 25, 10, 30, 0);
        StockMovement movement = new StockMovement(
                defaultItem,
                StockMovementType.RECEIVED,
                25,
                occurredTime,
                "Initial stock shipment",
                205L,
                null,
                null,
                null,
                null
        );

        StockMovement saved = stockMovementRepository.save(movement);
        entityManager.flush();
        entityManager.clear();

        Optional<StockMovement> reloadedOpt = stockMovementRepository.findById(saved.getId());
        assertThat(reloadedOpt).isPresent();
        assertThat(reloadedOpt.get().getResponsibleUserId()).isEqualTo(205L);
        assertThat(reloadedOpt.get().getOccurredAt()).isEqualTo(occurredTime);
    }

    @Test
    @DisplayName("AC-6: Optional batch, expiry, reversal, and treatment-reference data persist correctly")
    void testOptionalCompatibilityFieldsPersist() {
        LocalDate expiry = LocalDate.of(2027, 12, 31);
        StockMovement movement = new StockMovement(
                defaultItem,
                StockMovementType.USED,
                2,
                LocalDateTime.now(),
                "Used in composite restoration procedure",
                102L,
                55L,
                81L,
                "LOT-2026-X9",
                expiry
        );

        StockMovement saved = stockMovementRepository.save(movement);
        entityManager.flush();
        entityManager.clear();

        Optional<StockMovement> reloadedOpt = stockMovementRepository.findById(saved.getId());
        assertThat(reloadedOpt).isPresent();

        StockMovement reloaded = reloadedOpt.get();
        assertThat(reloaded.getBatchNumber()).isEqualTo("LOT-2026-X9");
        assertThat(reloaded.getExpiryDate()).isEqualTo(expiry);
        assertThat(reloaded.getReversalOfMovementId()).isEqualTo(55L);
        assertThat(reloaded.getTreatmentProcedureId()).isEqualTo(81L);
        assertThat(reloaded.getReason()).isEqualTo("Used in composite restoration procedure");

        boolean reversalExists = stockMovementRepository.existsByReversalOfMovementId(55L);
        assertThat(reversalExists).isTrue();
    }

    @Test
    @DisplayName("AC-7: Reverse-chronological movement history query returns correct ordering")
    void testChronologicalMovementHistoryQuery() {
        LocalDateTime time1 = LocalDateTime.now().minusHours(3);
        LocalDateTime time2 = LocalDateTime.now().minusHours(2);
        LocalDateTime time3 = LocalDateTime.now().minusHours(1);

        StockMovement m1 = new StockMovement(defaultItem, StockMovementType.RECEIVED, 50, time1, "Batch 1", 101L, null, null, null, null);
        StockMovement m2 = new StockMovement(defaultItem, StockMovementType.USED, 10, time2, "Procedure 1", 102L, null, null, null, null);
        StockMovement m3 = new StockMovement(defaultItem, StockMovementType.DAMAGED, 2, time3, "Broken vial", 103L, null, null, null, null);

        stockMovementRepository.save(m1);
        stockMovementRepository.save(m2);
        stockMovementRepository.save(m3);
        entityManager.flush();
        entityManager.clear();

        List<StockMovement> history = stockMovementRepository.findByInventoryItemIdOrderByOccurredAtDesc(defaultItem.getId());

        assertThat(history).hasSize(3);
        // Reverse chronological order: newest first (m3, then m2, then m1)
        assertThat(history.get(0).getMovementType()).isEqualTo(StockMovementType.DAMAGED);
        assertThat(history.get(0).getQuantity()).isEqualTo(2);

        assertThat(history.get(1).getMovementType()).isEqualTo(StockMovementType.USED);
        assertThat(history.get(1).getQuantity()).isEqualTo(10);

        assertThat(history.get(2).getMovementType()).isEqualTo(StockMovementType.RECEIVED);
        assertThat(history.get(2).getQuantity()).isEqualTo(50);
    }
}
