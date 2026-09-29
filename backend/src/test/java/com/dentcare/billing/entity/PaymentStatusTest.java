package com.dentcare.billing.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentStatusTest {

    @Test
    @DisplayName("PaymentStatus enum contains exactly RECORDED and REVERSED")
    void testExactPaymentStatuses() {
        PaymentStatus[] statuses = PaymentStatus.values();
        assertThat(statuses).containsExactly(
                PaymentStatus.RECORDED,
                PaymentStatus.REVERSED
        );
        assertThat(statuses).hasSize(2);
    }
}
