package com.dentcare.inventory.repository;

import com.dentcare.inventory.dto.StockStatusFilter;
import com.dentcare.inventory.entity.InventoryItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-inventory.sql")
class InventoryItemRepositoryFilteringTest {

    @Autowired
    private InventoryItemRepository inventoryItemRepository;

    @Autowired
    private TestEntityManager entityManager;

    private InventoryItem item1;
    private InventoryItem item2;
    private InventoryItem item3;

    @BeforeEach
    void setUp() {
        inventoryItemRepository.deleteAll();

        // item1: Diagnostic, quantity 15, reorder 10 (IN_STOCK), active = true
        item1 = new InventoryItem("ITM-001", "Dental Mirror #4", "Diagnostic", "piece", 10, 15, "SuppA");
        item1.setActive(true);

        // item2: Consumables, quantity 5, reorder 10 (LOW_STOCK, IN_STOCK), active = true
        item2 = new InventoryItem("ITM-002", "Latex Gloves Medium", "Consumables", "box", 10, 5, "SuppB");
        item2.setActive(true);

        // item3: Consumables, quantity 0, reorder 5 (OUT_OF_STOCK, LOW_STOCK), active = false
        item3 = new InventoryItem("ITM-003", "Cotton Rolls", "Consumables", "pack", 5, 0, "SuppA");
        item3.setActive(false);

        inventoryItemRepository.save(item1);
        inventoryItemRepository.save(item2);
        inventoryItemRepository.save(item3);

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("AC-8: Search filter matches item name or code case-insensitively")
    void testSearchByNameOrCode() {
        Specification<InventoryItem> specName = InventoryItemSpecifications.buildSpecification(
                "gloves", null, null, null
        );
        Page<InventoryItem> nameResults = inventoryItemRepository.findAll(specName, PageRequest.of(0, 10));
        assertThat(nameResults.getContent()).extracting(InventoryItem::getItemCode).containsExactly("ITM-002");

        Specification<InventoryItem> specCode = InventoryItemSpecifications.buildSpecification(
                "itm-001", null, null, null
        );
        Page<InventoryItem> codeResults = inventoryItemRepository.findAll(specCode, PageRequest.of(0, 10));
        assertThat(codeResults.getContent()).extracting(InventoryItem::getItemCode).containsExactly("ITM-001");

        Specification<InventoryItem> specCategory = InventoryItemSpecifications.buildSpecification(
                "diagnostic", null, null, null
        );
        Page<InventoryItem> categoryResults = inventoryItemRepository.findAll(specCategory, PageRequest.of(0, 10));
        assertThat(categoryResults.getContent()).extracting(InventoryItem::getItemCode).containsExactly("ITM-001");
    }

    @Test
    @DisplayName("AC-8: Build specification with all null filters returns all items")
    void testNullFiltersMatchAll() {
        Specification<InventoryItem> allNullSpec = InventoryItemSpecifications.buildSpecification(
                null, null, null, null
        );
        Page<InventoryItem> results = inventoryItemRepository.findAll(allNullSpec, PageRequest.of(0, 10));
        assertThat(results.getContent()).extracting(InventoryItem::getItemCode)
                .containsExactlyInAnyOrder("ITM-001", "ITM-002", "ITM-003");
    }

    @Test
    @DisplayName("AC-8: Category filter matches exact category case-insensitively")
    void testFilterByCategory() {
        Specification<InventoryItem> spec = InventoryItemSpecifications.buildSpecification(
                null, "consumables", null, null
        );
        Page<InventoryItem> results = inventoryItemRepository.findAll(spec, PageRequest.of(0, 10));
        assertThat(results.getContent()).extracting(InventoryItem::getItemCode).containsExactlyInAnyOrder("ITM-002", "ITM-003");
    }

    @Test
    @DisplayName("AC-8: Active flag filter correctly separates active and inactive items")
    void testFilterByActiveStatus() {
        Specification<InventoryItem> activeSpec = InventoryItemSpecifications.buildSpecification(
                null, null, true, null
        );
        Page<InventoryItem> activeResults = inventoryItemRepository.findAll(activeSpec, PageRequest.of(0, 10));
        assertThat(activeResults.getContent()).extracting(InventoryItem::getItemCode).containsExactlyInAnyOrder("ITM-001", "ITM-002");

        Specification<InventoryItem> inactiveSpec = InventoryItemSpecifications.buildSpecification(
                null, null, false, null
        );
        Page<InventoryItem> inactiveResults = inventoryItemRepository.findAll(inactiveSpec, PageRequest.of(0, 10));
        assertThat(inactiveResults.getContent()).extracting(InventoryItem::getItemCode).containsExactly("ITM-003");
    }

    @Test
    @DisplayName("AC-8: Stock status filter accurately isolates IN_STOCK, LOW_STOCK, and OUT_OF_STOCK")
    void testFilterByStockStatus() {
        // IN_STOCK: qty > 0 -> item1 (15), item2 (5)
        Specification<InventoryItem> inStockSpec = InventoryItemSpecifications.buildSpecification(
                null, null, null, StockStatusFilter.IN_STOCK
        );
        Page<InventoryItem> inStock = inventoryItemRepository.findAll(inStockSpec, PageRequest.of(0, 10));
        assertThat(inStock.getContent()).extracting(InventoryItem::getItemCode).containsExactlyInAnyOrder("ITM-001", "ITM-002");

        // LOW_STOCK: qty <= reorderLevel -> item2 (5 <= 10), item3 (0 <= 5)
        Specification<InventoryItem> lowStockSpec = InventoryItemSpecifications.buildSpecification(
                null, null, null, StockStatusFilter.LOW_STOCK
        );
        Page<InventoryItem> lowStock = inventoryItemRepository.findAll(lowStockSpec, PageRequest.of(0, 10));
        assertThat(lowStock.getContent()).extracting(InventoryItem::getItemCode).containsExactlyInAnyOrder("ITM-002", "ITM-003");

        // OUT_OF_STOCK: qty == 0 -> item3 (0)
        Specification<InventoryItem> outOfStockSpec = InventoryItemSpecifications.buildSpecification(
                null, null, null, StockStatusFilter.OUT_OF_STOCK
        );
        Page<InventoryItem> outOfStock = inventoryItemRepository.findAll(outOfStockSpec, PageRequest.of(0, 10));
        assertThat(outOfStock.getContent()).extracting(InventoryItem::getItemCode).containsExactly("ITM-003");
    }

    @Test
    @DisplayName("AC-8 & AC-9: Combined filters with pagination and sorting operate predictably")
    void testCombinedFiltersWithPaginationAndSort() {
        // Active consumables with low stock -> item2 only
        Specification<InventoryItem> combinedSpec = InventoryItemSpecifications.buildSpecification(
                null, "Consumables", true, StockStatusFilter.LOW_STOCK
        );
        Pageable pageable = PageRequest.of(0, 5, Sort.by("name").ascending());
        Page<InventoryItem> page = inventoryItemRepository.findAll(combinedSpec, pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getItemCode()).isEqualTo("ITM-002");
    }
}
