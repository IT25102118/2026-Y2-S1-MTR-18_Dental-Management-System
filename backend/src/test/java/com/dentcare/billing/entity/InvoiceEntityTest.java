package com.dentcare.billing.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class InvoiceEntityTest {

    @Test
    @DisplayName("Invoice constructor sets core fields and initializes monetary defaults to zero")
    void testConstructorAndMonetaryDefaults() {
        LocalDate date = LocalDate.of(2026, 9, 15);
        Invoice invoice = new Invoice("INV-2026-0001", 101L, date);

        assertThat(invoice.getInvoiceNumber()).isEqualTo("INV-2026-0001");
        assertThat(invoice.getPatientId()).isEqualTo(101L);
        assertThat(invoice.getInvoiceDate()).isEqualTo(date);
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.DRAFT);
        assertThat(invoice.getSubtotal()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getDiscountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getItems()).isEmpty();
        assertThat(invoice.getPayments()).isEmpty();
    }

    @Test
    @DisplayName("addItem and removeItem manage bidirectional relationship with InvoiceItem")
    void testItemBidirectionalManagement() {
        Invoice invoice = new Invoice("INV-2026-0002", 102L, LocalDate.now());
        InvoiceItem item1 = new InvoiceItem(invoice, "Scaling & Polishing", 1, new BigDecimal("75.00"), new BigDecimal("75.00"));
        InvoiceItem item2 = new InvoiceItem(invoice, "Fluoride Treatment", 1, new BigDecimal("25.00"), new BigDecimal("25.00"));

        invoice.addItem(item1);
        invoice.addItem(item2);

        assertThat(invoice.getItems()).hasSize(2);
        assertThat(item1.getInvoice()).isEqualTo(invoice);
        assertThat(item2.getInvoice()).isEqualTo(invoice);

        invoice.removeItem(item1);
        assertThat(invoice.getItems()).hasSize(1);
        assertThat(invoice.getItems().get(0)).isEqualTo(item2);
        assertThat(item1.getInvoice()).isNull();
    }

    @Test
    @DisplayName("PrePersist hook initializes default timestamps, status, and zero monetary values")
    void testPrePersistHook() {
        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber("INV-2026-0003");
        invoice.setPatientId(103L);

        invoice.onCreate();

        assertThat(invoice.getCreatedAt()).isNotNull();
        assertThat(invoice.getUpdatedAt()).isNotNull();
        assertThat(invoice.getInvoiceDate()).isEqualTo(LocalDate.now());
        assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.DRAFT);
        assertThat(invoice.getSubtotal()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getDiscountAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getTotalAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getPaidAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(invoice.getBalanceAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Payment entity initializes defaults and retains non-sensitive reference")
    void testPaymentEntityDefaultsAndFields() {
        Invoice invoice = new Invoice("INV-2026-0004", 104L, LocalDate.now());
        LocalDateTime paidAt = LocalDateTime.of(2026, 9, 15, 10, 30);
        Payment payment = new Payment(
                invoice,
                "REC-2026-0001",
                new BigDecimal("150.00"),
                PaymentMethod.CARD,
                "POS-TXN-9988",
                paidAt,
                1L
        );

        payment.onCreate();

        assertThat(payment.getPaymentNumber()).isEqualTo("REC-2026-0001");
        assertThat(payment.getAmount()).isEqualByComparingTo(new BigDecimal("150.00"));
        assertThat(payment.getPaymentMethod()).isEqualTo(PaymentMethod.CARD);
        assertThat(payment.getPaymentReference()).isEqualTo("POS-TXN-9988");
        assertThat(payment.getPaidAt()).isEqualTo(paidAt);
        assertThat(payment.getRecordedBy()).isEqualTo(1L);
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.RECORDED);
        assertThat(payment.getCreatedAt()).isNotNull();
    }
}
