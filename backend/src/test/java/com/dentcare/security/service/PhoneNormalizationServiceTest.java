package com.dentcare.security.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PhoneNormalizationServiceTest {

    private PhoneNormalizationService normalizationService;

    @BeforeEach
    void setUp() {
        normalizationService = new PhoneNormalizationService();
    }

    @Test
    @DisplayName("1. National format beginning 07 normalizes correctly")
    void testNationalFormatBeginning07() {
        String normalized = normalizationService.normalizeMobile("0771234567");
        assertThat(normalized).isEqualTo("+94771234567");
    }

    @Test
    @DisplayName("2. National format beginning 7 without trunk prefix normalizes correctly")
    void testNationalFormatBeginning7() {
        String normalized = normalizationService.normalizeMobile("771234567");
        assertThat(normalized).isEqualTo("+94771234567");
    }

    @Test
    @DisplayName("3. +94 international format normalizes correctly")
    void testInternationalPlus94Format() {
        String normalized = normalizationService.normalizeMobile("+94771234567");
        assertThat(normalized).isEqualTo("+94771234567");
    }

    @Test
    @DisplayName("4. 0094 international format normalizes correctly")
    void testInternational0094Format() {
        String normalized = normalizationService.normalizeMobile("0094771234567");
        assertThat(normalized).isEqualTo("+94771234567");
    }

    @Test
    @DisplayName("5. All four valid formats resolve to identical E.164 canonical value")
    void testAllFourResolveToIdenticalValue() {
        String e164A = normalizationService.normalizeMobile("0771234567");
        String e164B = normalizationService.normalizeMobile("771234567");
        String e164C = normalizationService.normalizeMobile("+94771234567");
        String e164D = normalizationService.normalizeMobile("0094771234567");

        assertThat(e164A).isEqualTo("+94771234567");
        assertThat(e164A).isEqualTo(e164B)
                .isEqualTo(e164C)
                .isEqualTo(e164D);
    }

    @Test
    @DisplayName("6. Null input is rejected")
    void testNullInputRejected() {
        assertThatThrownBy(() -> normalizationService.normalizeMobile(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be null");
        assertThat(normalizationService.isValidMobile(null)).isFalse();
    }

    @Test
    @DisplayName("7. Empty or blank input is rejected")
    void testEmptyInputRejected() {
        assertThatThrownBy(() -> normalizationService.normalizeMobile(""))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be empty");

        assertThatThrownBy(() -> normalizationService.normalizeMobile("   "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cannot be empty");

        assertThat(normalizationService.isValidMobile("")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "0112345678",  // Colombo fixed line
            "0812345678",  // Kandy fixed line
            "0212345678",  // Jaffna fixed line
            "0312345678",  // Negombo fixed line
            "0912345678",  // Galle fixed line
            "+94112345678" // International Colombo landline
    })
    @DisplayName("8. Sri Lankan landline numbers are rejected")
    void testSriLankanLandlineRejected(String landline) {
        assertThatThrownBy(() -> normalizationService.normalizeMobile(landline))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Fixed landline");

        assertThat(normalizationService.isValidMobile(landline)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "077123456",    // 9 digits total (starts with 07)
            "7712345",      // 7 digits
            "+9477123456",  // too short international
            "071"           // very short
    })
    @DisplayName("9. Too-short mobile number is rejected")
    void testTooShortMobileRejected(String shortMobile) {
        assertThatThrownBy(() -> normalizationService.normalizeMobile(shortMobile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("too short");

        assertThat(normalizationService.isValidMobile(shortMobile)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "07712345678",   // 11 digits
            "77123456789",   // 11 digits
            "+947712345678", // 13 chars
            "00947712345678" // 14 chars
    })
    @DisplayName("10. Too-long mobile number is rejected")
    void testTooLongMobileRejected(String longMobile) {
        assertThatThrownBy(() -> normalizationService.normalizeMobile(longMobile))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("too long");

        assertThat(normalizationService.isValidMobile(longMobile)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "+15551234567",   // USA / Canada
            "+447911123456",  // UK
            "+919876543210",  // India
            "+61412345678",   // Australia
            "0015551234567"   // USA via 00
    })
    @DisplayName("11. Unsupported country code is rejected")
    void testUnsupportedCountryCodeRejected(String foreignNumber) {
        assertThatThrownBy(() -> normalizationService.normalizeMobile(foreignNumber))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported");

        assertThat(normalizationService.isValidMobile(foreignNumber)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "0771234567, 0777654321",
            "0771234567;0777654321",
            "0771234567 / 0777654321"
    })
    @DisplayName("12. Multiple phone numbers are rejected")
    void testMultipleNumbersRejected(String multipleNumbers) {
        assertThatThrownBy(() -> normalizationService.normalizeMobile(multipleNumbers))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(normalizationService.isValidMobile(multipleNumbers)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "0771234567 ext 12",
            "0771234567 x101",
            "0771234567 extension 5",
            "+94771234567#12"
    })
    @DisplayName("13. Phone extensions are rejected")
    void testExtensionRejected(String extensionNumber) {
        assertThatThrownBy(() -> normalizationService.normalizeMobile(extensionNumber))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(normalizationService.isValidMobile(extensionNumber)).isFalse();
    }

    @Test
    @DisplayName("14. Non-ASCII digits are rejected")
    void testNonAsciiDigitsRejected() {
        // Arabic-Indic digits representing 0771234567
        String arabicDigits = "\u0660\u0667\u0667\u0661\u0662\u0663\u0664\u0665\u0666\u0667";
        assertThatThrownBy(() -> normalizationService.normalizeMobile(arabicDigits))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(normalizationService.isValidMobile(arabicDigits)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "077.123.4567",
            "077#1234567",
            "077*1234567",
            "077!1234567",
            "077_123_4567",
            "077@1234567"
    })
    @DisplayName("15. Unexpected punctuation is rejected")
    void testUnexpectedPunctuationRejected(String punctInput) {
        assertThatThrownBy(() -> normalizationService.normalizeMobile(punctInput))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(normalizationService.isValidMobile(punctInput)).isFalse();
    }

    @Test
    @DisplayName("16. Excessively long input is rejected")
    void testExcessivelyLongInputRejected() {
        String longInput = "07712345678901234567890123456789012345"; // > 30 chars
        assertThatThrownBy(() -> normalizationService.normalizeMobile(longInput))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("exceeds maximum allowed length");

        assertThat(normalizationService.isValidMobile(longInput)).isFalse();
    }

    @Test
    @DisplayName("Permitted visual formatting characters (spaces, hyphens, parentheses) normalize cleanly")
    void testPermittedVisualSeparators() {
        assertThat(normalizationService.normalizeMobile("077 123 4567")).isEqualTo("+94771234567");
        assertThat(normalizationService.normalizeMobile("077-123-4567")).isEqualTo("+94771234567");
        assertThat(normalizationService.normalizeMobile("(077) 123-4567")).isEqualTo("+94771234567");
        assertThat(normalizationService.normalizeMobile("+94 77 123 4567")).isEqualTo("+94771234567");
        assertThat(normalizationService.normalizeMobile("+94-77-123-4567")).isEqualTo("+94771234567");
    }
}
