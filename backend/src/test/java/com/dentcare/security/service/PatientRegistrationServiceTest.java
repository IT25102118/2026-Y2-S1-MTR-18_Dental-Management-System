package com.dentcare.security.service;

import com.dentcare.security.dto.PatientRegistrationRequest;
import com.dentcare.security.dto.PatientRegistrationResponse;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.exception.DuplicateEmailException;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PatientRegistrationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PatientRegistrationServiceImpl registrationService;

    @Test
    @DisplayName("Successfully registers patient, encodes password, sets role PATIENT, and returns clean response")
    void register_validRequest_persistsPatientWithHashedPasswordAndReturnsResponse() {
        PatientRegistrationRequest request = new PatientRegistrationRequest(
                "  John  ",
                "  Doe  ",
                "  John.Doe@Example.COM  ",
                "  +1 555-0199  ",
                "SecurePass123"
        );

        when(userRepository.existsByEmailIgnoreCase("john.doe@example.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePass123")).thenReturn("$2a$12$hashedPasswordValue");

        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(10L);
            user.setCreatedAt(LocalDateTime.now());
            return user;
        });

        PatientRegistrationResponse response = registrationService.registerPatient(request);

        assertNotNull(response);
        assertEquals(10L, response.id());
        assertEquals("john.doe@example.com", response.email());
        assertEquals("John", response.firstName());
        assertEquals("Doe", response.lastName());
        assertEquals("+1 555-0199", response.phone());
        assertEquals(Role.PATIENT, response.role());
        assertTrue(response.active());
        assertNotNull(response.createdAt());

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        User savedUser = userCaptor.getValue();

        assertEquals("john.doe@example.com", savedUser.getEmail());
        assertEquals("$2a$12$hashedPasswordValue", savedUser.getPasswordHash());
        assertEquals(Role.PATIENT, savedUser.getRole());
        assertEquals("John", savedUser.getFirstName());
        assertEquals("Doe", savedUser.getLastName());
        assertEquals("+1 555-0199", savedUser.getPhone());
        assertTrue(savedUser.isActive());
        assertNotEquals("SecurePass123", savedUser.getPasswordHash());
    }

    @Test
    @DisplayName("Persisted role is unconditionally Role.PATIENT")
    void register_persistedRole_isAlwaysPatient() {
        PatientRegistrationRequest request = new PatientRegistrationRequest(
                "Jane",
                "Smith",
                "jane@example.com",
                null,
                "Password99"
        );

        when(userRepository.existsByEmailIgnoreCase("jane@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$12$hashed");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(1L);
            user.setCreatedAt(LocalDateTime.now());
            return user;
        });

        PatientRegistrationResponse response = registrationService.registerPatient(request);

        assertEquals(Role.PATIENT, response.role());
        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        assertEquals(Role.PATIENT, captor.getValue().getRole());
    }

    @Test
    @DisplayName("Pre-check detects duplicate email and throws DuplicateEmailException")
    void register_duplicateEmailPreCheck_throwsDuplicateEmailException() {
        PatientRegistrationRequest request = new PatientRegistrationRequest(
                "Alice",
                "Wonder",
                "ALICE@example.com",
                null,
                "Password123"
        );

        when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(true);

        DuplicateEmailException ex = assertThrows(DuplicateEmailException.class,
                () -> registrationService.registerPatient(request));

        assertTrue(ex.getMessage().contains("already exists"));
        verify(userRepository, never()).saveAndFlush(any());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    @DisplayName("Translates DataIntegrityViolationException on race condition to DuplicateEmailException")
    void register_duplicateEmailRaceCondition_throwsDuplicateEmailException() {
        PatientRegistrationRequest request = new PatientRegistrationRequest(
                "Bob",
                "Builder",
                "bob@example.com",
                null,
                "Password123"
        );

        when(userRepository.existsByEmailIgnoreCase("bob@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$12$hashed");
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("Duplicate entry 'bob@example.com' for key 'uk_users_email'"));

        DuplicateEmailException ex = assertThrows(DuplicateEmailException.class,
                () -> registrationService.registerPatient(request));

        assertTrue(ex.getMessage().contains("already exists"));
    }

    @Test
    @DisplayName("Normalizes blank or whitespace-only phone to null")
    void register_blankPhone_normalizedToNull() {
        PatientRegistrationRequest request = new PatientRegistrationRequest(
                "Charlie",
                "Brown",
                "charlie@example.com",
                "    ",
                "Password123"
        );

        when(userRepository.existsByEmailIgnoreCase("charlie@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$12$hashed");
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(2L);
            user.setCreatedAt(LocalDateTime.now());
            return user;
        });

        registrationService.registerPatient(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(captor.capture());
        assertNull(captor.getValue().getPhone());
    }
}
