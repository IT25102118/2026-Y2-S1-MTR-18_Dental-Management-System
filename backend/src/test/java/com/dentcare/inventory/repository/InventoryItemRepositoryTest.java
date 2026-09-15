package com.dentcare.inventory.repository;

import com.dentcare.inventory.entity.InventoryItem;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-inventory.sql")
class InventoryItemRepositoryTest {

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("AC-1: InventoryItem persists and reloads all required fields correctly")
    void testPersistAndReloadCoreFields() {
        InventoryItem item = new InventoryItem(
                "ITM-001",
                "Dental Mirror #4",
                "Diagnostic Instruments",
                "piece",
                10,
                50,
                "DentSupplies Co."
        );

        InventoryItem saved = inventoryItemRepository.save(item);
        entityManager.flush();
        entityManager.clear();

        Optional<InventoryItem> reloadedOpt = inventoryItemRepository.findById(saved.getId());
        assertThat(reloadedOpt).isPresent();

        InventoryItem reloaded = reloadedOpt.get();
        assertThat(reloaded.getItemCode()).isEqualTo("ITM-001");
        assertThat(reloaded.getName()).isEqualTo("Dental Mirror #4");
        assertThat(reloaded.getCategory()).isEqualTo("Diagnostic Instruments");
        assertThat(reloaded.getUnit()).isEqualTo("piece");
        assertThat(reloaded.getReorderLevel()).isEqualTo(10);
        assertThat(reloaded.getCurrentQuantity()).isEqualTo(50);
        assertThat(reloaded.isActive()).isTrue();
        assertThat(reloaded.getDefaultSupplierReference()).isEqualTo("DentSupplies Co.");
        assertThat(reloaded.getVersion()).isNotNull();
        assertThat(reloaded.getCreatedAt()).isNotNull();
        assertThat(reloaded.getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("AC-2: Duplicate itemCode is rejected by unique constraint")
    void testUniqueItemCodeConstraint() {
        InventoryItem item1 = new InventoryItem(
                "ITM-DUP-001",
                "Composite Resin A2",
                "Restorative",
                "syringe",
                5,
                20,
                "DentalDirect"
        );
        inventoryItemRepository.save(item1);
        entityManager.flush();

        InventoryItem item2 = new InventoryItem(
                "ITM-DUP-001",
                "Composite Resin A3",
                "Restorative",
                "syringe",
                5,
                15,
                "DentalDirect"
        );
        assertThatThrownBy(() -> {
            inventoryItemRepository.save(item2);
            entityManager.flush();
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("AC-2: existsByItemCodeIgnoreCase and findByItemCodeIgnoreCase match ignoring case")
    void testCaseInsensitiveQueries() {
        InventoryItem item = new InventoryItem(
                "ITM-CASE-001",
                "Root Canal Sealer",
                "Endodontics",
                "tube",
                2,
                10,
                "EndoSupply"
        );
        inventoryItemRepository.save(item);
        entityManager.flush();
        entityManager.clear();

        assertThat(inventoryItemRepository.existsByItemCodeIgnoreCase("itm-case-001")).isTrue();
        assertThat(inventoryItemRepository.existsByItemCodeIgnoreCase("ITM-CASE-001")).isTrue();
        assertThat(inventoryItemRepository.existsByItemCodeIgnoreCase("non-existent")).isFalse();

        Optional<InventoryItem> found = inventoryItemRepository.findByItemCodeIgnoreCase("itm-case-001");
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Root Canal Sealer");
    }

    @Test
    @DisplayName("AC-8: Active/inactive state persists and active-item repository querying works")
    void testActiveStateAndQuery() {
        InventoryItem activeItem = new InventoryItem(
                "ITM-ACT-001",
                "Latex Examination Gloves (M)",
                "Consumables",
                "box",
                20,
                100,
                "SafeCare"
        );
        activeItem.setActive(true);
        inventoryItemRepository.save(activeItem);

        InventoryItem inactiveItem = new InventoryItem(
                "ITM-INACT-001",
                "Obsolete Curing Light Tip",
                "Equipment",
                "piece",
                0,
                0,
                "OldVendor"
        );
        inactiveItem.setActive(false);
        inventoryItemRepository.save(inactiveItem);

        entityManager.flush();
        entityManager.clear();

        List<InventoryItem> activeItems = inventoryItemRepository.findByActiveTrue();
        assertThat(activeItems)
                .extracting(InventoryItem::getItemCode)
                .contains("ITM-ACT-001")
                .doesNotContain("ITM-INACT-001");

        List<InventoryItem> inactiveItems = inventoryItemRepository.findByActive(false);
        assertThat(inactiveItems)
                .extracting(InventoryItem::getItemCode)
                .contains("ITM-INACT-001")
                .doesNotContain("ITM-ACT-001");
    }

    @Test
    @DisplayName("AC-9: Negative reorder level is rejected by validation/database constraint")
    void testNegativeReorderLevelRejected() {
        InventoryItem invalidItem = new InventoryItem(
                "ITM-NEG-REORDER",
                "Prophy Paste",
                "Preventative",
                "tube",
                -5,
                10,
                null
        );

        assertThatThrownBy(() -> {
            inventoryItemRepository.save(invalidItem);
            entityManager.flush();
        }).isInstanceOfAny(ConstraintViolationException.class, DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("AC-9: Negative current quantity is rejected by validation/database constraint")
    void testNegativeCurrentQuantityRejected() {
        InventoryItem invalidItem = new InventoryItem(
                "ITM-NEG-QTY",
                "Lidocaine 2% Cartridges",
                "Anesthetics",
                "box",
                10,
                -1,
                null
        );

        assertThatThrownBy(() -> {
            inventoryItemRepository.save(invalidItem);
            entityManager.flush();
        }).isInstanceOfAny(ConstraintViolationException.class, DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("Pessimistic write lock query retrieves the item correctly")
    void testFindByIdForUpdate() {
        InventoryItem item = new InventoryItem(
                "ITM-LOCK-001",
                "Surgical Scalpel #15",
                "Surgical",
                "box",
                5,
                30,
                "MedTech"
        );
        InventoryItem saved = inventoryItemRepository.save(item);
        entityManager.flush();
        entityManager.clear();

        Optional<InventoryItem> lockedOpt = inventoryItemRepository.findByIdForUpdate(saved.getId());
        assertThat(lockedOpt).isPresent();
        assertThat(lockedOpt.get().getItemCode()).isEqualTo("ITM-LOCK-001");
    }
}
