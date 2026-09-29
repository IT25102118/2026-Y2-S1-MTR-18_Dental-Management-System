package com.dentcare.billing.repository;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-billing.sql")
class InvoiceRepositoryTest {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("find and check existence of invoice by unique invoice number")
    void testFindByInvoiceNumberAndExists() {
        Invoice invoice = new Invoice("INV-2026-0101", 101L, LocalDate.of(2026, 9, 1));
        entityManager.persistAndFlush(invoice);

        Optional<Invoice> foundOpt = invoiceRepository.findByInvoiceNumber("INV-2026-0101");
        assertThat(foundOpt).isPresent();
        assertThat(foundOpt.get().getPatientId()).isEqualTo(101L);

        assertThat(invoiceRepository.existsByInvoiceNumber("INV-2026-0101")).isTrue();
        assertThat(invoiceRepository.existsByInvoiceNumber("INV-NON-EXISTENT")).isFalse();
        assertThat(invoiceRepository.findByInvoiceNumber("INV-NON-EXISTENT")).isEmpty();
    }

    @Test
    @DisplayName("retrieve invoices by patient ID ordered newest invoice date first")
    void testFindByPatientIdOrderByDateDesc() {
        Long patientId = 102L;
        Invoice invOld = new Invoice("INV-2026-0102", patientId, LocalDate.of(2026, 8, 10));
        Invoice invNew = new Invoice("INV-2026-0103", patientId, LocalDate.of(2026, 9, 10));
        Invoice invOther = new Invoice("INV-2026-0104", 999L, LocalDate.of(2026, 9, 11));

        entityManager.persist(invOld);
        entityManager.persist(invNew);
        entityManager.persist(invOther);
        entityManager.flush();

        List<Invoice> patientInvoices = invoiceRepository.findByPatientIdOrderByInvoiceDateDescIdDesc(patientId);
        assertThat(patientInvoices).hasSize(2);
        assertThat(patientInvoices.get(0).getInvoiceNumber()).isEqualTo("INV-2026-0103");
        assertThat(patientInvoices.get(1).getInvoiceNumber()).isEqualTo("INV-2026-0102");
    }

    @Test
    @DisplayName("retrieve invoices by status")
    void testFindByStatus() {
        Invoice draft = new Invoice("INV-2026-0105", 103L, LocalDate.now());
        draft.setStatus(InvoiceStatus.DRAFT);

        Invoice unpaid = new Invoice("INV-2026-0106", 103L, LocalDate.now());
        unpaid.setStatus(InvoiceStatus.UNPAID);

        entityManager.persist(draft);
        entityManager.persist(unpaid);
        entityManager.flush();

        List<Invoice> drafts = invoiceRepository.findByStatusOrderByInvoiceDateDescIdDesc(InvoiceStatus.DRAFT);
        assertThat(drafts).extracting(Invoice::getInvoiceNumber).contains("INV-2026-0105");
        assertThat(drafts).extracting(Invoice::getInvoiceNumber).doesNotContain("INV-2026-0106");
    }

    @Test
    @DisplayName("filter invoices by patient ID and status")
    void testFindByPatientIdAndStatus() {
        Long targetPatient = 104L;

        Invoice inv1 = new Invoice("INV-2026-0107", targetPatient, LocalDate.now());
        inv1.setStatus(InvoiceStatus.UNPAID);

        Invoice inv2 = new Invoice("INV-2026-0108", targetPatient, LocalDate.now());
        inv2.setStatus(InvoiceStatus.PAID);

        Invoice inv3 = new Invoice("INV-2026-0109", 999L, LocalDate.now());
        inv3.setStatus(InvoiceStatus.UNPAID);

        entityManager.persist(inv1);
        entityManager.persist(inv2);
        entityManager.persist(inv3);
        entityManager.flush();

        List<Invoice> result = invoiceRepository.findByPatientIdAndStatusOrderByInvoiceDateDescIdDesc(targetPatient, InvoiceStatus.UNPAID);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getInvoiceNumber()).isEqualTo("INV-2026-0107");
    }

    @Test
    @DisplayName("filter invoices within an inclusive date range")
    void testFindByInvoiceDateBetween() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 15);

        Invoice before = new Invoice("INV-2026-0110", 105L, LocalDate.of(2026, 8, 31));
        Invoice inside1 = new Invoice("INV-2026-0111", 105L, LocalDate.of(2026, 9, 1));
        Invoice inside2 = new Invoice("INV-2026-0112", 105L, LocalDate.of(2026, 9, 15));
        Invoice after = new Invoice("INV-2026-0113", 105L, LocalDate.of(2026, 9, 16));

        entityManager.persist(before);
        entityManager.persist(inside1);
        entityManager.persist(inside2);
        entityManager.persist(after);
        entityManager.flush();

        List<Invoice> inRange = invoiceRepository.findByInvoiceDateBetweenOrderByInvoiceDateDescIdDesc(start, end);
        assertThat(inRange).extracting(Invoice::getInvoiceNumber)
                .containsExactly("INV-2026-0112", "INV-2026-0111");
    }

    @Test
    @DisplayName("cancelled and paid invoices remain permanently queryable in financial history")
    void testCancelledAndPaidInvoicesRemainQueryable() {
        Invoice paidInvoice = new Invoice("INV-2026-0114", 106L, LocalDate.now());
        paidInvoice.setTotalAmount(new BigDecimal("150.00"));
        paidInvoice.setPaidAmount(new BigDecimal("150.00"));
        paidInvoice.setBalanceAmount(BigDecimal.ZERO);
        paidInvoice.setStatus(InvoiceStatus.PAID);

        Invoice cancelledInvoice = new Invoice("INV-2026-0115", 106L, LocalDate.now());
        cancelledInvoice.setStatus(InvoiceStatus.CANCELLED);

        entityManager.persist(paidInvoice);
        entityManager.persist(cancelledInvoice);
        entityManager.flush();

        List<Invoice> paidList = invoiceRepository.findByStatusOrderByInvoiceDateDescIdDesc(InvoiceStatus.PAID);
        assertThat(paidList).extracting(Invoice::getInvoiceNumber).contains("INV-2026-0114");

        List<Invoice> cancelledList = invoiceRepository.findByStatusOrderByInvoiceDateDescIdDesc(InvoiceStatus.CANCELLED);
        assertThat(cancelledList).extracting(Invoice::getInvoiceNumber).contains("INV-2026-0115");

        List<Invoice> patientAll = invoiceRepository.findByPatientIdOrderByInvoiceDateDescIdDesc(106L);
        assertThat(patientAll).extracting(Invoice::getInvoiceNumber)
                .contains("INV-2026-0114", "INV-2026-0115");
    }

    @Test
    @DisplayName("searchInvoices with null filters returns all invoices ordered by date DESC, id DESC")
    void testSearchInvoicesNoFiltersReturnsAllOrdered() {
        Invoice inv1 = new Invoice("INV-2026-0201", 201L, LocalDate.of(2026, 9, 1));
        Invoice inv2 = new Invoice("INV-2026-0202", 202L, LocalDate.of(2026, 9, 10));
        Invoice inv3 = new Invoice("INV-2026-0203", 203L, LocalDate.of(2026, 9, 10));

        entityManager.persist(inv1);
        entityManager.persist(inv2);
        entityManager.persist(inv3);
        entityManager.flush();

        List<Invoice> results = invoiceRepository.searchInvoices(null, null, null, null);
        assertThat(results).isNotEmpty();
        // Check order of the newly created invoices relative to each other: inv3 (date 9/10, higher id) before inv2 (date 9/10, lower id) before inv1 (date 9/1)
        int idx3 = results.indexOf(inv3);
        int idx2 = results.indexOf(inv2);
        int idx1 = results.indexOf(inv1);
        assertThat(idx3).isLessThan(idx2);
        assertThat(idx2).isLessThan(idx1);
    }

    @Test
    @DisplayName("searchInvoices filters by patientId")
    void testSearchInvoicesFilterByPatientId() {
        Long targetPatient = 205L;
        Invoice inv1 = new Invoice("INV-2026-0204", targetPatient, LocalDate.of(2026, 9, 5));
        Invoice inv2 = new Invoice("INV-2026-0205", 999L, LocalDate.of(2026, 9, 6));

        entityManager.persist(inv1);
        entityManager.persist(inv2);
        entityManager.flush();

        List<Invoice> results = invoiceRepository.searchInvoices(targetPatient, null, null, null);
        assertThat(results).extracting(Invoice::getInvoiceNumber).contains("INV-2026-0204");
        assertThat(results).extracting(Invoice::getInvoiceNumber).doesNotContain("INV-2026-0205");
    }

    @Test
    @DisplayName("searchInvoices filters by status")
    void testSearchInvoicesFilterByStatus() {
        Invoice invDraft = new Invoice("INV-2026-0206", 206L, LocalDate.of(2026, 9, 5));
        invDraft.setStatus(InvoiceStatus.DRAFT);
        Invoice invPaid = new Invoice("INV-2026-0207", 206L, LocalDate.of(2026, 9, 6));
        invPaid.setStatus(InvoiceStatus.PAID);

        entityManager.persist(invDraft);
        entityManager.persist(invPaid);
        entityManager.flush();

        List<Invoice> results = invoiceRepository.searchInvoices(null, InvoiceStatus.DRAFT, null, null);
        assertThat(results).extracting(Invoice::getInvoiceNumber).contains("INV-2026-0206");
        assertThat(results).extracting(Invoice::getInvoiceNumber).doesNotContain("INV-2026-0207");
    }

    @Test
    @DisplayName("searchInvoices filters by date range (inclusive)")
    void testSearchInvoicesFilterByDateRange() {
        LocalDate start = LocalDate.of(2026, 9, 10);
        LocalDate end = LocalDate.of(2026, 9, 20);

        Invoice before = new Invoice("INV-2026-0208", 207L, LocalDate.of(2026, 9, 9));
        Invoice insideStart = new Invoice("INV-2026-0209", 207L, LocalDate.of(2026, 9, 10));
        Invoice insideEnd = new Invoice("INV-2026-0210", 207L, LocalDate.of(2026, 9, 20));
        Invoice after = new Invoice("INV-2026-0211", 207L, LocalDate.of(2026, 9, 21));

        entityManager.persist(before);
        entityManager.persist(insideStart);
        entityManager.persist(insideEnd);
        entityManager.persist(after);
        entityManager.flush();

        List<Invoice> results = invoiceRepository.searchInvoices(null, null, start, end);
        assertThat(results).extracting(Invoice::getInvoiceNumber)
                .contains("INV-2026-0209", "INV-2026-0210")
                .doesNotContain("INV-2026-0208", "INV-2026-0211");
    }

    @Test
    @DisplayName("searchInvoices with combined filters")
    void testSearchInvoicesCombinedFilters() {
        Long targetPatient = 208L;
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 30);

        Invoice matching = new Invoice("INV-2026-0212", targetPatient, LocalDate.of(2026, 9, 15));
        matching.setStatus(InvoiceStatus.UNPAID);

        Invoice wrongPatient = new Invoice("INV-2026-0213", 999L, LocalDate.of(2026, 9, 15));
        wrongPatient.setStatus(InvoiceStatus.UNPAID);

        Invoice wrongStatus = new Invoice("INV-2026-0214", targetPatient, LocalDate.of(2026, 9, 15));
        wrongStatus.setStatus(InvoiceStatus.PAID);

        Invoice wrongDate = new Invoice("INV-2026-0215", targetPatient, LocalDate.of(2026, 10, 5));
        wrongDate.setStatus(InvoiceStatus.UNPAID);

        entityManager.persist(matching);
        entityManager.persist(wrongPatient);
        entityManager.persist(wrongStatus);
        entityManager.persist(wrongDate);
        entityManager.flush();

        List<Invoice> results = invoiceRepository.searchInvoices(targetPatient, InvoiceStatus.UNPAID, start, end);
        assertThat(results).extracting(Invoice::getInvoiceNumber)
                .containsExactly("INV-2026-0212");
    }

    @Test
    @DisplayName("searchInvoices with no matching criteria returns empty list")
    void testSearchInvoicesNoMatchReturnsEmptyList() {
        List<Invoice> results = invoiceRepository.searchInvoices(999999L, InvoiceStatus.CANCELLED, null, null);
        assertThat(results).isEmpty();
    }
}
