package com.dentcare.security.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UserTest {

    @Test
    @DisplayName("setEmail trims whitespace and converts email to lowercase")
    void testEmailNormalizationInSetter() {
        User user = new User();
        user.setEmail("  Admin.DentCare@Clinic.ORG  ");
        assertThat(user.getEmail()).isEqualTo("admin.dentcare@clinic.org");
    }

    @Test
    @DisplayName("setEmail handles null gracefully without throwing NPE")
    void testEmailNormalizationNull() {
        User user = new User();
        user.setEmail(null);
        assertThat(user.getEmail()).isNull();
    }

    @Test
    @DisplayName("Constructor applies email trimming and lowercase normalization")
    void testEmailNormalizationInConstructor() {
        User user = new User(
                "  Dr.Smith@DentCare.COM ",
                "$2a$10$encodedHashDummyValue1234567890",
                "John",
                "Smith",
                "1234567890",
                Role.DENTIST
        );
        assertThat(user.getEmail()).isEqualTo("dr.smith@dentcare.com");
        assertThat(user.getPasswordHash()).isEqualTo("$2a$10$encodedHashDummyValue1234567890");
        assertThat(user.getRole()).isEqualTo(Role.DENTIST);
        assertThat(user.isActive()).isTrue();
    }

    @Test
    @DisplayName("onCreate and onUpdate lifecycle hooks enforce email normalization and set timestamps")
    void testLifecycleHooksNormalization() {
        User user = new User();
        user.setEmail("  Nurse.Sara@Clinic.COM  ");

        user.onCreate();
        assertThat(user.getEmail()).isEqualTo("nurse.sara@clinic.com");
        assertThat(user.getCreatedAt()).isNotNull();
        assertThat(user.getUpdatedAt()).isNotNull();

        user.setEmail("  Updated.Sara@Clinic.COM  ");
        user.onUpdate();
        assertThat(user.getEmail()).isEqualTo("updated.sara@clinic.com");
    }
}
