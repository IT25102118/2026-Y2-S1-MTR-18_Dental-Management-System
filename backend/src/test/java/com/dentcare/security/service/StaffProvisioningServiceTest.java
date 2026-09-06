package com.dentcare.security.service;

import com.dentcare.security.dto.StaffProvisioningRequest;
import com.dentcare.security.dto.StaffProvisioningResponse;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.exception.DuplicateEmailException;
import com.dentcare.security.exception.InvalidStaffRoleException;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StaffProvisioningServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private StaffProvisioningServiceImpl staffProvisioningService;

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"ADMINISTRATOR", "RECEPTIONIST", "DENTIST", "DENTAL_ASSISTANT"})
    @DisplayName("Successfully provisions staff member with allowed staff role")
    void provisionStaff_allowedRoles_persistsAndReturnsSafeResponse(Role staffRole) {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "  Alice  ",
                "  Smith  ",
                "  Staff." + staffRole.name() + "@example.com  ",
                "  +1 555-0100  ",
                staffRole,
                "Password123"
        );

        String normalizedEmail = ("Staff." + staffRole.name() + "@example.com").trim().toLowerCase();
        when(userRepository.existsByEmailIgnoreCase(normalizedEmail)).thenReturn(false);
        when(passwordEncoder.encode("Password123")).thenReturn("$2a$12$hashedPasswordVal");

        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(100L);
            user.setCreatedAt(LocalDateTime.now());
            return user;
        });

        StaffProvisioningResponse response = staffProvisioningService.provisionStaff(request);

        assertNotNull(response);
        assertEquals(100L, response.id());
        assertEquals(normalizedEmail, response.email());
        assertEquals("Alice", response.firstName());
        assertEquals("Smith", response.lastName());
        assertEquals("+1 555-0100", response.phone());
        assertEquals(staffRole, response.role());
        assertTrue(response.active());
        assertNotNull(response.createdAt());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        User savedUser = captor.getValue();

        assertEquals(normalizedEmail, savedUser.getEmail());
        assertEquals("Alice", savedUser.getFirstName());
        assertEquals("Smith", savedUser.getLastName());
        assertEquals("+1 555-0100", savedUser.getPhone());
        assertEquals(staffRole, savedUser.getRole());
        assertTrue(savedUser.isActive());
        assertEquals("$2a$12$hashedPasswordVal", savedUser.getPasswordHash());
        assertNotEquals("Password123", savedUser.getPasswordHash());
    }

    @Test
    @DisplayName("Rejects PATIENT role with InvalidStaffRoleException")
    void provisionStaff_patientRole_throwsInvalidStaffRoleException() {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "Fake",
                "Staff",
                "patient@example.com",
                null,
                Role.PATIENT,
                "Password123"
        );

        InvalidStaffRoleException ex = assertThrows(InvalidStaffRoleException.class,
                () -> staffProvisioningService.provisionStaff(request));

        assertTrue(ex.getMessage().contains("PATIENT"));
        verify(userRepository, never()).existsByEmailIgnoreCase(anyString());
        verify(userRepository, never()).saveAndFlush(any());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    @DisplayName("Rejects null role with InvalidStaffRoleException")
    void provisionStaff_nullRole_throwsInvalidStaffRoleException() {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "Fake",
                "Staff",
                "nullrole@example.com",
                null,
                null,
                "Password123"
        );

        InvalidStaffRoleException ex = assertThrows(InvalidStaffRoleException.class,
                () -> staffProvisioningService.provisionStaff(request));

        assertTrue(ex.getMessage().contains("Invalid staff role"));
        verify(userRepository, never()).existsByEmailIgnoreCase(anyString());
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("Verifies BCrypt password encoding matches raw password and plaintext is never persisted")
    void provisionStaff_bcryptPasswordMatches() {
        PasswordEncoder realEncoder = new BCryptPasswordEncoder();
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "Bob",
                "Dentist",
                "bob.dentist@example.com",
                null,
                Role.DENTIST,
                "StrongSecret99"
        );

        when(userRepository.existsByEmailIgnoreCase("bob.dentist@example.com")).thenReturn(false);
        when(passwordEncoder.encode("StrongSecret99")).thenAnswer(inv -> realEncoder.encode(inv.getArgument(0)));
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(5L);
            user.setCreatedAt(LocalDateTime.now());
            return user;
        });

        staffProvisioningService.provisionStaff(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        User savedUser = captor.getValue();

        assertNotEquals("StrongSecret99", savedUser.getPasswordHash());
        assertTrue(realEncoder.matches("StrongSecret99", savedUser.getPasswordHash()));
    }

    @Test
    @DisplayName("Pre-check detects duplicate email and throws DuplicateEmailException")
    void provisionStaff_duplicateEmailPreCheck_throwsDuplicateEmailException() {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "Jane",
                "Admin",
                "EXISTING.ADMIN@example.com",
                null,
                Role.ADMINISTRATOR,
                "Password123"
        );

        when(userRepository.existsByEmailIgnoreCase("existing.admin@example.com")).thenReturn(true);

        DuplicateEmailException ex = assertThrows(DuplicateEmailException.class,
                () -> staffProvisioningService.provisionStaff(request));

        assertTrue(ex.getMessage().contains("already exists"));
        verify(userRepository, never()).saveAndFlush(any());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    @DisplayName("Translates DataIntegrityViolationException on duplicate race condition to DuplicateEmailException when email exists")
    void provisionStaff_duplicateEmailRaceCondition_throwsDuplicateEmailException() {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "Jane",
                "Admin",
                "race.admin@example.com",
                null,
                Role.ADMINISTRATOR,
                "Password123"
        );

        when(userRepository.existsByEmailIgnoreCase("race.admin@example.com")).thenReturn(false, true);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$12$hashed");
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate entry 'race.admin@example.com' for key 'uk_users_email'"));

        DuplicateEmailException ex = assertThrows(DuplicateEmailException.class,
                () -> staffProvisioningService.provisionStaff(request));

        assertTrue(ex.getMessage().contains("already exists"));
        verify(userRepository, times(2)).existsByEmailIgnoreCase("race.admin@example.com");
    }

    @Test
    @DisplayName("Rethrows original DataIntegrityViolationException when failure is unrelated to duplicate email")
    void provisionStaff_unrelatedDataIntegrityViolation_rethrowsOriginalException() {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "Jane",
                "Admin",
                "unrelated.admin@example.com",
                null,
                Role.ADMINISTRATOR,
                "Password123"
        );

        DataIntegrityViolationException originalException =
                new DataIntegrityViolationException("Check constraint 'chk_something' failed");

        when(userRepository.existsByEmailIgnoreCase("unrelated.admin@example.com")).thenReturn(false, false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$12$hashed");
        when(userRepository.saveAndFlush(any(User.class))).thenThrow(originalException);

        DataIntegrityViolationException ex = assertThrows(DataIntegrityViolationException.class,
                () -> staffProvisioningService.provisionStaff(request));

        assertSame(originalException, ex);
        verify(userRepository, times(2)).existsByEmailIgnoreCase("unrelated.admin@example.com");
    }

    @Test
    @DisplayName("Normalizes blank or whitespace-only phone to null")
    void provisionStaff_blankPhone_normalizedToNull() {
        StaffProvisioningRequest request = new StaffProvisioningRequest(
                "Frank",
                "Assistant",
                "frank@example.com",
                "    ",
                Role.DENTAL_ASSISTANT,
                "Password123"
        );

        when(userRepository.existsByEmailIgnoreCase("frank@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$12$hashed");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(7L);
            user.setCreatedAt(LocalDateTime.now());
            return user;
        });

        staffProvisioningService.provisionStaff(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        assertNull(captor.getValue().getPhone());
    }
}
