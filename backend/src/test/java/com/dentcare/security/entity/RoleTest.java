package com.dentcare.security.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

class RoleTest {

    @Test
    @DisplayName("Role enum strictly defines the exact five approved dental clinic roles")
    void testExactRoleEnumValues() {
        Role[] roles = Role.values();
        assertThat(roles).hasSize(5);
        assertThat(roles).containsExactlyInAnyOrder(
                Role.ADMINISTRATOR,
                Role.RECEPTIONIST,
                Role.DENTIST,
                Role.DENTAL_ASSISTANT,
                Role.PATIENT
        );
    }

    @Test
    @DisplayName("Role enum does not contain prohibited legacy or out-of-scope roles")
    void testProhibitedRolesDoNotExist() {
        Set<String> roleNames = Arrays.stream(Role.values())
                .map(Enum::name)
                .collect(Collectors.toSet());

        assertThat(roleNames)
                .doesNotContain("CITIZEN")
                .doesNotContain("INVENTORY_CONTROLLER")
                .doesNotContain("USER")
                .doesNotContain("STAFF");
    }
}
