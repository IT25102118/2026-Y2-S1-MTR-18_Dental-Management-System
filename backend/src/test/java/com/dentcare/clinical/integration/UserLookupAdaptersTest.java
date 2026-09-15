package com.dentcare.clinical.integration;

import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserLookupAdaptersTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserPatientLookupAdapter patientLookupAdapter;

    @InjectMocks
    private UserDentistLookupAdapter dentistLookupAdapter;

    private User patientUser;
    private User dentistUser;
    private User receptionistUser;

    @BeforeEach
    void setUp() {
        patientUser = new User("patient@dentcare.com", "hash", "Jane", "Doe", "0771112233", Role.PATIENT);
        patientUser.setId(101L);
        patientUser.setActive(true);

        dentistUser = new User("dentist@dentcare.com", "hash", "Dr. John", "Smith", "0774445566", Role.DENTIST);
        dentistUser.setId(202L);
        dentistUser.setActive(true);

        receptionistUser = new User("reception@dentcare.com", "hash", "Bob", "Taylor", "0777778899", Role.RECEPTIONIST);
        receptionistUser.setId(303L);
        receptionistUser.setActive(true);
    }

    // --- Patient Lookup Tests ---

    @Test
    @DisplayName("Patient lookup: returns true for existing active PATIENT user")
    void existsActivePatient_existingActivePatient_returnsTrue() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(patientUser));

        boolean exists = patientLookupAdapter.existsActivePatient(101L);

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Patient lookup: returns false for inactive PATIENT user")
    void existsActivePatient_inactivePatient_returnsFalse() {
        patientUser.setActive(false);
        when(userRepository.findById(101L)).thenReturn(Optional.of(patientUser));

        boolean exists = patientLookupAdapter.existsActivePatient(101L);

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Patient lookup: returns false for non-PATIENT user role")
    void existsActivePatient_nonPatientRole_returnsFalse() {
        when(userRepository.findById(202L)).thenReturn(Optional.of(dentistUser));

        boolean exists = patientLookupAdapter.existsActivePatient(202L);

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Patient lookup: returns false for nonexistent user")
    void existsActivePatient_nonexistentUser_returnsFalse() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        boolean exists = patientLookupAdapter.existsActivePatient(999L);

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Patient lookup: returns false when null patient ID is passed")
    void existsActivePatient_nullId_returnsFalse() {
        boolean exists = patientLookupAdapter.existsActivePatient(null);

        assertThat(exists).isFalse();
    }

    // --- Dentist Lookup Tests ---

    @Test
    @DisplayName("Dentist lookup: returns true for existing active DENTIST user")
    void existsActiveDentist_existingActiveDentist_returnsTrue() {
        when(userRepository.findById(202L)).thenReturn(Optional.of(dentistUser));

        boolean exists = dentistLookupAdapter.existsActiveDentist(202L);

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Dentist lookup: returns false for inactive DENTIST user")
    void existsActiveDentist_inactiveDentist_returnsFalse() {
        dentistUser.setActive(false);
        when(userRepository.findById(202L)).thenReturn(Optional.of(dentistUser));

        boolean exists = dentistLookupAdapter.existsActiveDentist(202L);

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Dentist lookup: returns false for non-DENTIST user role")
    void existsActiveDentist_nonDentistRole_returnsFalse() {
        when(userRepository.findById(101L)).thenReturn(Optional.of(patientUser));

        boolean exists = dentistLookupAdapter.existsActiveDentist(101L);

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Dentist lookup: returns false for nonexistent user")
    void existsActiveDentist_nonexistentUser_returnsFalse() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        boolean exists = dentistLookupAdapter.existsActiveDentist(999L);

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Dentist lookup: returns false when null dentist ID is passed")
    void existsActiveDentist_nullId_returnsFalse() {
        boolean exists = dentistLookupAdapter.existsActiveDentist(null);

        assertThat(exists).isFalse();
    }
}
