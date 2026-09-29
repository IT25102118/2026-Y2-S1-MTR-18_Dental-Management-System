package com.dentcare.billing.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class InvoiceStatusTest {

    @Test
    @DisplayName("InvoiceStatus enum contains exactly the five canonical statuses")
    void testExactCanonicalStatuses() {
        InvoiceStatus[] statuses = InvoiceStatus.values();
        assertThat(statuses).containsExactly(
                InvoiceStatus.DRAFT,
                InvoiceStatus.UNPAID,
                InvoiceStatus.PARTIALLY_PAID,
                InvoiceStatus.PAID,
                InvoiceStatus.CANCELLED
        );
        assertThat(statuses).hasSize(5);
    }

    @Test
    @DisplayName("InvoiceStatus valueOf resolves valid string identifiers correctly")
    void testValueOfResolutions() {
        assertThat(InvoiceStatus.valueOf("DRAFT")).isEqualTo(InvoiceStatus.DRAFT);
        assertThat(InvoiceStatus.valueOf("UNPAID")).isEqualTo(InvoiceStatus.UNPAID);
        assertThat(InvoiceStatus.valueOf("PARTIALLY_PAID")).isEqualTo(InvoiceStatus.PARTIALLY_PAID);
        assertThat(InvoiceStatus.valueOf("PAID")).isEqualTo(InvoiceStatus.PAID);
        assertThat(InvoiceStatus.valueOf("CANCELLED")).isEqualTo(InvoiceStatus.CANCELLED);
    }
}
