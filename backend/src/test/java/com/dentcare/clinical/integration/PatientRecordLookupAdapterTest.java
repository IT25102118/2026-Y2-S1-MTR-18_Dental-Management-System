package com.dentcare.clinical.integration;

import com.dentcare.clinical.dto.PatientMedicalSummaryDto;
import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.repository.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PatientRecordLookupAdapter Unit Tests")
class PatientRecordLookupAdapterTest {

    @Mock
    private PatientRepository patientRepository;

    @InjectMocks
    private PatientRecordLookupAdapter adapter;

    private Patient activePatient;
    private Patient inactivePatient;

    @BeforeEach
    void setUp() {
        activePatient = new Patient(
                "PAT-0001",
                "Alice",
                "Walker",
                LocalDate.of(1990, 5, 15),
                Gender.FEMALE,
                "0771234567"
        );
        activePatient.setId(10L);
        activePatient.setActive(true);
        activePatient.setAllergies("Penicillin, Latex");
        activePatient.setMedicalConditions("Type 2 Diabetes, Mild Asthma");
        activePatient.setCurrentMedications("Metformin 500mg, Salbutamol inhaler");
        activePatient.setDentalHistory("Root canal on tooth 16 in 2023; wisdom tooth extraction in 2021");
        activePatient.setNotes("Requires antibiotic premedication protocol before surgical procedures");

        inactivePatient = new Patient(
                "PAT-0002",
                "Bob",
                "Ross",
                LocalDate.of(1985, 2, 20),
                Gender.MALE,
                "0779876543"
        );
        inactivePatient.setId(20L);
        inactivePatient.setActive(false);
    }

    @Test
    @DisplayName("active Patient.id returns true")
    void existsActivePatient_activePatient_returnsTrue() {
        when(patientRepository.findById(10L)).thenReturn(Optional.of(activePatient));

        boolean exists = adapter.existsActivePatient(10L);

        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("inactive Patient.id returns false")
    void existsActivePatient_inactivePatient_returnsFalse() {
        when(patientRepository.findById(20L)).thenReturn(Optional.of(inactivePatient));

        boolean exists = adapter.existsActivePatient(20L);

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("unknown Patient.id returns false")
    void existsActivePatient_unknownPatient_returnsFalse() {
        when(patientRepository.findById(999L)).thenReturn(Optional.empty());

        boolean exists = adapter.existsActivePatient(999L);

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("null Patient.id returns false")
    void existsActivePatient_nullId_returnsFalse() {
        boolean exists = adapter.existsActivePatient(null);

        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("medical summary maps allergies")
    void getPatientMedicalSummary_mapsAllergies() {
        when(patientRepository.findById(10L)).thenReturn(Optional.of(activePatient));

        Optional<PatientMedicalSummaryDto> summaryOpt = adapter.getPatientMedicalSummary(10L);

        assertThat(summaryOpt).isPresent();
        assertThat(summaryOpt.get().allergies()).isEqualTo("Penicillin, Latex");
    }

    @Test
    @DisplayName("medical summary maps medicalConditions")
    void getPatientMedicalSummary_mapsMedicalConditions() {
        when(patientRepository.findById(10L)).thenReturn(Optional.of(activePatient));

        Optional<PatientMedicalSummaryDto> summaryOpt = adapter.getPatientMedicalSummary(10L);

        assertThat(summaryOpt).isPresent();
        assertThat(summaryOpt.get().medicalConditions()).isEqualTo("Type 2 Diabetes, Mild Asthma");
    }

    @Test
    @DisplayName("medical summary maps currentMedications")
    void getPatientMedicalSummary_mapsCurrentMedications() {
        when(patientRepository.findById(10L)).thenReturn(Optional.of(activePatient));

        Optional<PatientMedicalSummaryDto> summaryOpt = adapter.getPatientMedicalSummary(10L);

        assertThat(summaryOpt).isPresent();
        assertThat(summaryOpt.get().currentMedications()).isEqualTo("Metformin 500mg, Salbutamol inhaler");
    }

    @Test
    @DisplayName("medical summary maps dentalHistory")
    void getPatientMedicalSummary_mapsDentalHistory() {
        when(patientRepository.findById(10L)).thenReturn(Optional.of(activePatient));

        Optional<PatientMedicalSummaryDto> summaryOpt = adapter.getPatientMedicalSummary(10L);

        assertThat(summaryOpt).isPresent();
        assertThat(summaryOpt.get().dentalHistory()).isEqualTo("Root canal on tooth 16 in 2023; wisdom tooth extraction in 2021");
    }

    @Test
    @DisplayName("medical summary maps notes")
    void getPatientMedicalSummary_mapsNotes() {
        when(patientRepository.findById(10L)).thenReturn(Optional.of(activePatient));

        Optional<PatientMedicalSummaryDto> summaryOpt = adapter.getPatientMedicalSummary(10L);

        assertThat(summaryOpt).isPresent();
        assertThat(summaryOpt.get().notes()).isEqualTo("Requires antibiotic premedication protocol before surgical procedures");
    }

    @Test
    @DisplayName("unknown patient returns Optional.empty()")
    void getPatientMedicalSummary_unknownPatient_returnsEmpty() {
        when(patientRepository.findById(999L)).thenReturn(Optional.empty());

        Optional<PatientMedicalSummaryDto> summaryOpt = adapter.getPatientMedicalSummary(999L);

        assertThat(summaryOpt).isEmpty();
    }

    @Test
    @DisplayName("null patientId returns Optional.empty()")
    void getPatientMedicalSummary_nullId_returnsEmpty() {
        Optional<PatientMedicalSummaryDto> summaryOpt = adapter.getPatientMedicalSummary(null);

        assertThat(summaryOpt).isEmpty();
    }
}
