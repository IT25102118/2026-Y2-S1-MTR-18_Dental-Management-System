package com.dentcare.billing.repository;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-billing.sql")
class InvoiceItemRepositoryTest {

    @Autowired
    private InvoiceItemRepository invoiceItemRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("retrieve items belonging to one invoice preserving insertion order")
    void testFindByInvoiceIdOrderByIdAsc() {
        Invoice invoice1 = new Invoice("INV-2026-0201", 301L, LocalDate.now());
        Invoice savedInv1 = entityManager.persistAndFlush(invoice1);

        InvoiceItem item1 = new InvoiceItem(savedInv1, "Consultation Examination", 1, new BigDecimal("40.00"), new BigDecimal("40.00"));
        InvoiceItem item2 = new InvoiceItem(savedInv1, "Bitewing X-Ray", 2, new BigDecimal("20.00"), new BigDecimal("40.00"));
        entityManager.persist(item1);
        entityManager.persist(item2);
        entityManager.flush();

        List<InvoiceItem> items = invoiceItemRepository.findByInvoiceIdOrderByIdAsc(savedInv1.getId());
        assertThat(items).hasSize(2);
        assertThat(items.get(0).getDescription()).isEqualTo("Consultation Examination");
        assertThat(items.get(1).getDescription()).isEqualTo("Bitewing X-Ray");
        assertThat(items.get(0).getLineTotal()).isEqualByComparingTo(new BigDecimal("40.00"));
        assertThat(items.get(1).getLineTotal()).isEqualByComparingTo(new BigDecimal("40.00"));
    }

    @Test
    @DisplayName("items from another invoice are strictly not mixed into results")
    void testItemsNotMixedAcrossInvoices() {
        Invoice invoiceA = new Invoice("INV-2026-0202", 302L, LocalDate.now());
        Invoice invoiceB = new Invoice("INV-2026-0203", 303L, LocalDate.now());
        Invoice savedA = entityManager.persistAndFlush(invoiceA);
        Invoice savedB = entityManager.persistAndFlush(invoiceB);

        InvoiceItem itemA = new InvoiceItem(savedA, "Tooth Extraction - Tooth 46", 1, new BigDecimal("100.00"), new BigDecimal("100.00"));
        InvoiceItem itemB = new InvoiceItem(savedB, "Dental Composite Filling", 1, new BigDecimal("80.00"), new BigDecimal("80.00"));
        entityManager.persist(itemA);
        entityManager.persist(itemB);
        entityManager.flush();

        List<InvoiceItem> resultsA = invoiceItemRepository.findByInvoiceIdOrderByIdAsc(savedA.getId());
        assertThat(resultsA).hasSize(1);
        assertThat(resultsA.get(0).getDescription()).isEqualTo("Tooth Extraction - Tooth 46");

        List<InvoiceItem> resultsB = invoiceItemRepository.findByInvoiceIdOrderByIdAsc(savedB.getId());
        assertThat(resultsB).hasSize(1);
        assertThat(resultsB.get(0).getDescription()).isEqualTo("Dental Composite Filling");
    }

    @Test
    @DisplayName("retrieve items by optional clinical treatmentProcedureId reference")
    void testFindByTreatmentProcedureId() {
        Invoice invoice = new Invoice("INV-2026-0204", 304L, LocalDate.now());
        Invoice savedInvoice = entityManager.persistAndFlush(invoice);

        Long procedureId = 8899L;
        InvoiceItem clinicalItem = new InvoiceItem(savedInvoice, procedureId, "Surgical Extraction", 1, new BigDecimal("150.00"), new BigDecimal("150.00"));
        InvoiceItem regularItem = new InvoiceItem(savedInvoice, null, "Medication fee", 1, new BigDecimal("20.00"), new BigDecimal("20.00"));

        entityManager.persist(clinicalItem);
        entityManager.persist(regularItem);
        entityManager.flush();

        List<InvoiceItem> matched = invoiceItemRepository.findByTreatmentProcedureId(procedureId);
        assertThat(matched).hasSize(1);
        assertThat(matched.get(0).getDescription()).isEqualTo("Surgical Extraction");
    }
}
