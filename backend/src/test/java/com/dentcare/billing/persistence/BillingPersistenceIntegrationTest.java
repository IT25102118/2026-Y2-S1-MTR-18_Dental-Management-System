package com.dentcare.billing.persistence;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@TestPropertySource(properties = "spring.sql.init.schema-locations=classpath:schema-billing.sql")
class BillingPersistenceIntegrationTest {

    @Autowired
    private TestEntityManager entityManager;

    @Test
    @DisplayName("Persist and reload Invoice with cascade-persisted InvoiceItems")
    void testPersistAndReloadInvoiceWithItems() {
        Invoice invoice = new Invoice("INV-2026-1001", 201L, LocalDate.of(2026, 9, 15));
        invoice.setSubtotal(new BigDecimal("120.00"));
        invoice.setDiscountAmount(new BigDecimal("20.00"));
        invoice.setTotalAmount(new BigDecimal("100.00"));
        invoice.setBalanceAmount(new BigDecimal("100.00"));
        invoice.setStatus(InvoiceStatus.UNPAID);
        invoice.setNotes("Regular checkup and cleaning");
        invoice.setCreatedBy(1L);

        InvoiceItem item1 = new InvoiceItem(invoice, "Dental Consultation", 1, new BigDecimal("50.00"), new BigDecimal("50.00"));
        InvoiceItem item2 = new InvoiceItem(invoice, 301L, "Root Canal Therapy - Tooth 16", 1, new BigDecimal("70.00"), new BigDecimal("70.00"));

        invoice.addItem(item1);
        invoice.addItem(item2);

        Invoice saved = entityManager.persistAndFlush(invoice);
        entityManager.clear();

        Invoice reloaded = entityManager.find(Invoice.class, saved.getId());
        assertThat(reloaded).isNotNull();
        assertThat(reloaded.getInvoiceNumber()).isEqualTo("INV-2026-1001");
        assertThat(reloaded.getPatientId()).isEqualTo(201L);
        assertThat(reloaded.getSubtotal()).isEqualByComparingTo(new BigDecimal("120.00"));
        assertThat(reloaded.getDiscountAmount()).isEqualByComparingTo(new BigDecimal("20.00"));
        assertThat(reloaded.getTotalAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(reloaded.getBalanceAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(reloaded.getStatus()).isEqualTo(InvoiceStatus.UNPAID);
        assertThat(reloaded.getNotes()).isEqualTo("Regular checkup and cleaning");
        assertThat(reloaded.getCreatedAt()).isNotNull();
        assertThat(reloaded.getUpdatedAt()).isNotNull();

        assertThat(reloaded.getItems()).hasSize(2);
        assertThat(reloaded.getItems())
                .extracting(InvoiceItem::getDescription)
                .containsExactlyInAnyOrder("Dental Consultation", "Root Canal Therapy - Tooth 16");
        assertThat(reloaded.getItems())
                .filteredOn(i -> i.getTreatmentProcedureId() != null)
                .extracting(InvoiceItem::getTreatmentProcedureId)
                .containsExactly(301L);
    }

    @Test
    @DisplayName("Persist and reload Payment linked to Invoice with valid payment method")
    void testPersistAndReloadPayment() {
        Invoice invoice = new Invoice("INV-2026-1002", 202L, LocalDate.now());
        invoice.setTotalAmount(new BigDecimal("200.00"));
        invoice.setBalanceAmount(new BigDecimal("200.00"));
        invoice.setStatus(InvoiceStatus.UNPAID);
        entityManager.persistAndFlush(invoice);

        Payment payment = new Payment(
                invoice,
                "REC-2026-1001",
                new BigDecimal("100.00"),
                PaymentMethod.BANK_TRANSFER,
                "SLIP-REF-7744",
                LocalDateTime.of(2026, 9, 15, 14, 0),
                2L
        );
        Payment savedPayment = entityManager.persistAndFlush(payment);
        entityManager.clear();

        Payment reloadedPayment = entityManager.find(Payment.class, savedPayment.getId());
        assertThat(reloadedPayment).isNotNull();
        assertThat(reloadedPayment.getPaymentNumber()).isEqualTo("REC-2026-1001");
        assertThat(reloadedPayment.getAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(reloadedPayment.getPaymentMethod()).isEqualTo(PaymentMethod.BANK_TRANSFER);
        assertThat(reloadedPayment.getPaymentReference()).isEqualTo("SLIP-REF-7744");
        assertThat(reloadedPayment.getRecordedBy()).isEqualTo(2L);
        assertThat(reloadedPayment.getStatus()).isEqualTo(PaymentStatus.RECORDED);
        assertThat(reloadedPayment.getInvoice().getId()).isEqualTo(invoice.getId());
    }

    @Test
    @DisplayName("Database enforces unique invoice_number constraint")
    void testUniqueInvoiceNumberConstraint() {
        Invoice invoice1 = new Invoice("INV-DUP-001", 203L, LocalDate.now());
        entityManager.persistAndFlush(invoice1);

        Invoice invoice2 = new Invoice("INV-DUP-001", 204L, LocalDate.now());
        assertThatThrownBy(() -> entityManager.persistAndFlush(invoice2))
                .isInstanceOf(org.hibernate.exception.ConstraintViolationException.class);
    }

    @Test
    @DisplayName("Database enforces unique payment_number constraint")
    void testUniquePaymentNumberConstraint() {
        Invoice invoice = new Invoice("INV-2026-1003", 205L, LocalDate.now());
        entityManager.persistAndFlush(invoice);

        Payment payment1 = new Payment(invoice, "REC-DUP-001", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        entityManager.persistAndFlush(payment1);

        Payment payment2 = new Payment(invoice, "REC-DUP-001", new BigDecimal("30.00"), PaymentMethod.CARD, null, LocalDateTime.now(), 1L);
        assertThatThrownBy(() -> entityManager.persistAndFlush(payment2))
                .isInstanceOf(org.hibernate.exception.ConstraintViolationException.class);
    }

    @Test
    @DisplayName("Database rejects non-positive payment amount via CHECK constraint")
    void testPaymentAmountPositiveCheckConstraint() {
        Invoice invoice = new Invoice("INV-2026-1004", 206L, LocalDate.now());
        entityManager.persistAndFlush(invoice);

        Payment payment = new Payment(invoice, "REC-NEG-001", new BigDecimal("0.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        assertThatThrownBy(() -> entityManager.persistAndFlush(payment))
                .isInstanceOf(Exception.class);
    }

    @Test
    @DisplayName("Database rejects negative invoice balance via CHECK constraint")
    void testInvoiceBalanceNonNegativeCheckConstraint() {
        Invoice invoice = new Invoice("INV-2026-1005", 207L, LocalDate.now());
        invoice.setBalanceAmount(new BigDecimal("-10.00"));

        assertThatThrownBy(() -> entityManager.persistAndFlush(invoice))
                .isInstanceOf(Exception.class);
    }

    @Test
    @DisplayName("Database rejects zero or negative quantity in invoice_items via CHECK constraint")
    void testInvoiceItemQuantityPositiveCheckConstraint() {
        Invoice invoice = new Invoice("INV-2026-1006", 208L, LocalDate.now());
        InvoiceItem item = new InvoiceItem(invoice, "Invalid Quantity Item", 0, new BigDecimal("10.00"), new BigDecimal("0.00"));
        invoice.addItem(item);

        assertThatThrownBy(() -> entityManager.persistAndFlush(invoice))
                .isInstanceOf(Exception.class);
    }

    @Test
    @DisplayName("Cascade delete removes InvoiceItems when parent Draft Invoice is deleted")
    void testCascadeDeleteInvoiceItems() {
        Invoice invoice = new Invoice("INV-2026-1007", 209L, LocalDate.now());
        InvoiceItem item = new InvoiceItem(invoice, "Cleaning", 1, new BigDecimal("60.00"), new BigDecimal("60.00"));
        invoice.addItem(item);

        Invoice saved = entityManager.persistAndFlush(invoice);
        Long itemId = saved.getItems().get(0).getId();

        entityManager.remove(saved);
        entityManager.flush();
        entityManager.clear();

        assertThat(entityManager.find(Invoice.class, saved.getId())).isNull();
        assertThat(entityManager.find(InvoiceItem.class, itemId)).isNull();
    }

    @Test
    @DisplayName("Foreign key constraint prevents deleting an Invoice that has recorded Payments")
    void testInvoiceWithPaymentsCannotBeDeletedDirectly() {
        Invoice invoice = new Invoice("INV-2026-1008", 210L, LocalDate.now());
        entityManager.persistAndFlush(invoice);

        Payment payment = new Payment(invoice, "REC-2026-1008", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 1L);
        entityManager.persistAndFlush(payment);
        entityManager.clear();

        Invoice reloaded = entityManager.find(Invoice.class, invoice.getId());
        assertThatThrownBy(() -> {
            entityManager.remove(reloaded);
            entityManager.flush();
        }).isInstanceOf(org.hibernate.exception.ConstraintViolationException.class);
    }
}
