package com.dentcare.billing.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentMethodTest {

    @Test
    @DisplayName("PaymentMethod enum contains exactly the four canonical clinic payment methods")
    void testExactCanonicalMethods() {
        PaymentMethod[] methods = PaymentMethod.values();
        assertThat(methods).containsExactly(
                PaymentMethod.CASH,
                PaymentMethod.CARD,
                PaymentMethod.BANK_TRANSFER,
                PaymentMethod.OTHER
        );
        assertThat(methods).hasSize(4);
    }

    @Test
    @DisplayName("PaymentMethod valueOf resolves valid string identifiers correctly")
    void testValueOfResolutions() {
        assertThat(PaymentMethod.valueOf("CASH")).isEqualTo(PaymentMethod.CASH);
        assertThat(PaymentMethod.valueOf("CARD")).isEqualTo(PaymentMethod.CARD);
        assertThat(PaymentMethod.valueOf("BANK_TRANSFER")).isEqualTo(PaymentMethod.BANK_TRANSFER);
        assertThat(PaymentMethod.valueOf("OTHER")).isEqualTo(PaymentMethod.OTHER);
    }
}
