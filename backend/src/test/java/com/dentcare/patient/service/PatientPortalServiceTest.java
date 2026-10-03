package com.dentcare.patient.service;

import com.dentcare.appointment.dto.CreateAppointmentRequest;
import com.dentcare.appointment.dto.PatientAppointmentResponse;
import com.dentcare.appointment.entity.Appointment;
import com.dentcare.appointment.entity.AppointmentStatus;
import com.dentcare.patient.dto.PatientDashboardSummaryResponse;
import com.dentcare.patient.dto.PatientPrescriptionItemResponse;
import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.repository.PatientRepository;
import com.dentcare.prescription.entity.Prescription;
import com.dentcare.prescription.entity.PrescriptionItem;
import com.dentcare.prescription.entity.PrescriptionStatus;
import com.dentcare.prescription.repository.PrescriptionRepository;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatientPortalServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @Mock
    private com.dentcare.appointment.repository.AppointmentRepository appointmentRepository;

    private PatientPortalService patientPortalService;

    private User patientUser1;
    private User patientUser2;
    private User dentistUser;

    @BeforeEach
    void setUp() {
        patientPortalService = new PatientPortalServiceImpl(
                userRepository,
                patientRepository,
                prescriptionRepository,
                appointmentRepository
        );

        patientUser1 = new User("patient1@dentcare.test", "hash1", "Alice", "Smith", "+1 555-0101", Role.PATIENT);
        patientUser1.setId(101L);

        patientUser2 = new User("patient2@dentcare.test", "hash2", "Bob", "Jones", "+1 555-0102", Role.PATIENT);
        patientUser2.setId(102L);

        dentistUser = new User("dentist@dentcare.test", "hash3", "Sarah", "Connor", "+1 555-0103", Role.DENTIST);
        dentistUser.setId(201L);
    }

    @Test
    @DisplayName("getDashboardSummary resolves user by session email and returns linked clinical profile")
    void testGetDashboardSummaryWithLinkedProfile() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Patient patientRecord = new Patient();
        patientRecord.setId(501L);
        patientRecord.setUserId(101L);
        patientRecord.setPatientCode("PAT-101");
        patientRecord.setFirstName("Alice");
        patientRecord.setLastName("Smith");
        patientRecord.setDateOfBirth(LocalDate.of(1990, 5, 15));
        patientRecord.setGender(Gender.FEMALE);
        patientRecord.setPhone("+1 555-0101");

        when(patientRepository.findByUserId(101L)).thenReturn(Optional.of(patientRecord));

        Prescription prescription = new Prescription();
        prescription.setPatient(patientUser1);
        prescription.setDentist(dentistUser);
        prescription.setStatus(PrescriptionStatus.FINALIZED);
        prescription.setNotes("Post-extraction care");

        when(prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(eq(101L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(prescription)));
        when(prescriptionRepository.findByPatientIdAndStatusOrderByCreatedAtDesc(eq(101L), eq(PrescriptionStatus.FINALIZED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(prescription)));

        PatientDashboardSummaryResponse response = patientPortalService.getDashboardSummary("patient1@dentcare.test");

        assertThat(response).isNotNull();
        assertThat(response.patient().firstName()).isEqualTo("Alice");
        assertThat(response.patient().patientCode()).isEqualTo("PAT-101");
        assertThat(response.patient().hasClinicalProfile()).isTrue();
        assertThat(response.clinicalStatus().intakeStatus()).isEqualTo("COMPLETED");
        assertThat(response.prescriptionsSummary().totalCount()).isEqualTo(1L);
        assertThat(response.prescriptionsSummary().activeCount()).isEqualTo(1L);

        // Verify available features: appointments is AVAILABLE with /patient/appointments, billing is COMING_SOON
        assertThat(response.availableFeatures()).hasSize(4);
        var apptFeature = response.availableFeatures().stream()
                .filter(f -> f.id().equals("appointments"))
                .findFirst().orElseThrow();
        assertThat(apptFeature.status()).isEqualTo("AVAILABLE");
        assertThat(apptFeature.route()).isEqualTo("/patient/appointments");
    }

    @Test
    @DisplayName("getDashboardSummary safely handles self-registered patient without clinical record (pending intake)")
    void testGetDashboardSummaryWithoutClinicalProfile() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(patientRepository.findByUserId(101L)).thenReturn(Optional.empty());

        when(prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(eq(101L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(prescriptionRepository.findByPatientIdAndStatusOrderByCreatedAtDesc(eq(101L), eq(PrescriptionStatus.FINALIZED), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        PatientDashboardSummaryResponse response = patientPortalService.getDashboardSummary("patient1@dentcare.test");

        assertThat(response).isNotNull();
        assertThat(response.patient().firstName()).isEqualTo("Alice");
        assertThat(response.patient().hasClinicalProfile()).isFalse();
        assertThat(response.patient().patientCode()).isNull();
        assertThat(response.clinicalStatus().intakeStatus()).isEqualTo("PENDING_CLINICAL_INTAKE");
        assertThat(response.prescriptionsSummary().totalCount()).isEqualTo(0L);
        assertThat(response.prescriptionsSummary().recentPrescriptions()).isEmpty();
    }

    @Test
    @DisplayName("getPatientPrescriptionById allows patient to access their own prescription")
    void testGetPatientPrescriptionByIdSuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Prescription prescription = new Prescription();
        prescription.setPatient(patientUser1);
        prescription.setDentist(dentistUser);
        prescription.setStatus(PrescriptionStatus.FINALIZED);
        prescription.setNotes("Take with food");

        PrescriptionItem item = new PrescriptionItem("Amoxicillin", "500mg", "TID", "7 days", 21);
        prescription.setItems(List.of(item));

        when(prescriptionRepository.findByIdWithItems(1L)).thenReturn(Optional.of(prescription));

        PatientPrescriptionItemResponse response = patientPortalService.getPatientPrescriptionById("patient1@dentcare.test", 1L);

        assertThat(response).isNotNull();
        assertThat(response.dentistName()).contains("Dr. Sarah Connor");
        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).medicineName()).isEqualTo("Amoxicillin");
    }

    @Test
    @DisplayName("CRITICAL DATA ISOLATION: Patient A cannot view Patient B's prescription (403 Forbidden)")
    void testGetPatientPrescriptionByIdIsolationRejection() {
        // Authenticated as Patient 1 (Alice)
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        // Prescription belongs to Patient 2 (Bob)
        Prescription prescriptionOfBob = new Prescription();
        prescriptionOfBob.setPatient(patientUser2);
        prescriptionOfBob.setDentist(dentistUser);

        when(prescriptionRepository.findByIdWithItems(999L)).thenReturn(Optional.of(prescriptionOfBob));

        assertThatThrownBy(() -> patientPortalService.getPatientPrescriptionById("patient1@dentcare.test", 999L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("Access denied");
                });
    }

    @Test
    @DisplayName("getPatientPrescriptionById throws 404 when prescription does not exist")
    void testGetPatientPrescriptionByIdNotFound() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(prescriptionRepository.findByIdWithItems(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patientPortalService.getPatientPrescriptionById("patient1@dentcare.test", 9999L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                });
    }

    @Test
    @DisplayName("createAppointmentRequest with future date succeeds and saves PENDING appointment")
    void testCreateAppointmentRequestSuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        LocalDate futureDate = LocalDate.now().plusDays(5);
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                futureDate,
                "10:30",
                "Routine checkup and dental cleaning",
                "Prefer morning slot if possible"
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(5001L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(5001L);
        assertThat(response.appointmentDate()).isEqualTo(futureDate);
        assertThat(response.preferredTime()).isEqualTo("10:30");
        assertThat(response.reason()).isEqualTo("Routine checkup and dental cleaning");
        assertThat(response.notes()).isEqualTo("Prefer morning slot if possible");
        assertThat(response.status()).isEqualTo("PENDING");
        assertThat(response.statusDescription()).isEqualTo("Pending confirmation");
        assertThat(response.dentistName()).isNull();
    }

    @Test
    @DisplayName("createAppointmentRequest with today's date and future time succeeds")
    void testCreateAppointmentRequestTodaySuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        LocalDate today = LocalDate.now();
        // Use a time safely in future (23:59)
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                today,
                "23:59",
                "Urgent tooth pain evaluation",
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(5002L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(5002L);
        assertThat(response.appointmentDate()).isEqualTo(today);
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("createAppointmentRequest with past date is rejected with 400 Bad Request")
    void testCreateAppointmentRequestPastDateRejected() {
        LocalDate pastDate = LocalDate.now().minusDays(1);
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                pastDate,
                "10:00",
                "Checkup",
                null
        );

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Appointment date cannot be earlier than today");
                });
    }

    @Test
    @DisplayName("createAppointmentRequest with today's date and past time is rejected with 400 Bad Request")
    void testCreateAppointmentRequestTodayPastTimeRejected() {
        LocalDate today = LocalDate.now();
        // Time definitely in the past: 00:01 (unless test runs at exactly 00:00, which is handled)
        if (java.time.LocalTime.now().isAfter(java.time.LocalTime.of(0, 1))) {
            CreateAppointmentRequest request = new CreateAppointmentRequest(
                    today,
                    "00:01",
                    "Checkup",
                    null
            );

            assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", request))
                    .isInstanceOf(ResponseStatusException.class)
                    .satisfies(ex -> {
                        ResponseStatusException rse = (ResponseStatusException) ex;
                        assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                        assertThat(rse.getReason()).contains("Appointment time cannot be earlier than current time today");
                    });
        }
    }

    @Test
    @DisplayName("createAppointmentRequest with missing or blank reason is rejected with 400 Bad Request")
    void testCreateAppointmentRequestBlankReasonRejected() {
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(1),
                "10:00",
                "   ",
                null
        );

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Reason for visit is required");
                });
    }

    @Test
    @DisplayName("createAppointmentRequest with null preferredTime succeeds and saves null time")
    void testCreateAppointmentRequestNullPreferredTimeAccepted() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        LocalDate futureDate = LocalDate.now().plusDays(4);
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                futureDate,
                null,
                "Consultation",
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(5010L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.preferredTime()).isNull();
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("createAppointmentRequest with blank preferredTime normalizes to null")
    void testCreateAppointmentRequestBlankPreferredTimeNormalizesToNull() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        LocalDate futureDate = LocalDate.now().plusDays(4);
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                futureDate,
                "   ",
                "Consultation",
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(5011L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.preferredTime()).isNull();
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("createAppointmentRequest with 09:30 on future date succeeds")
    void testCreateAppointmentRequestFutureTime0930Accepted() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        LocalDate futureDate = LocalDate.now().plusDays(3);
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                futureDate,
                "09:30",
                "Morning cleaning",
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(5012L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.preferredTime()).isEqualTo("09:30");
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("createAppointmentRequest with 23:59 on future date succeeds")
    void testCreateAppointmentRequestFutureTime2359Accepted() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        LocalDate futureDate = LocalDate.now().plusDays(3);
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                futureDate,
                "23:59",
                "Late slot request",
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(5013L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.preferredTime()).isEqualTo("23:59");
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("createAppointmentRequest with 'morning' is rejected with 400 Bad Request")
    void testCreateAppointmentRequestMalformedTimeMorningRejected() {
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(3),
                "morning",
                "Checkup",
                null
        );

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Preferred time must be in HH:mm 24-hour format");
                });
    }

    @Test
    @DisplayName("createAppointmentRequest with '9am' is rejected with 400 Bad Request")
    void testCreateAppointmentRequestMalformedTime9amRejected() {
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(3),
                "9am",
                "Checkup",
                null
        );

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Preferred time must be in HH:mm 24-hour format");
                });
    }

    @Test
    @DisplayName("createAppointmentRequest with '25:00' is rejected with 400 Bad Request")
    void testCreateAppointmentRequestInvalidHour2500Rejected() {
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(3),
                "25:00",
                "Checkup",
                null
        );

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Preferred time must be in HH:mm 24-hour format");
                });
    }

    @Test
    @DisplayName("createAppointmentRequest with '09:75' is rejected with 400 Bad Request")
    void testCreateAppointmentRequestInvalidMinute0975Rejected() {
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(3),
                "09:75",
                "Checkup",
                null
        );

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Preferred time must be in HH:mm 24-hour format");
                });
    }

    @Test
    @DisplayName("Self-registered patient without clinical intake can submit appointment request")
    void testCreateAppointmentForUserWithoutClinicalRecord() {
        // Patient has active User account but no clinical patient intake row
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(2),
                "14:00",
                "Initial consultation and exam",
                "New patient"
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(5003L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(5003L);
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("getPatientAppointments returns only patient-owned appointments")
    void testGetPatientAppointmentsReturnsPatientOwnedRecords() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Appointment appt1 = new Appointment(patientUser1, LocalDate.now().plusDays(3), "09:00", "Cleaning", null);
        appt1.setId(1001L);
        appt1.setStatus(AppointmentStatus.PENDING);

        Appointment appt2 = new Appointment(patientUser1, LocalDate.now().plusDays(10), "14:00", "Filling", null);
        appt2.setId(1002L);
        appt2.setStatus(AppointmentStatus.CONFIRMED);
        appt2.setDentist(dentistUser);

        when(appointmentRepository.findByPatientIdOrderByAppointmentDateDescCreatedAtDesc(101L))
                .thenReturn(List.of(appt1, appt2));

        List<PatientAppointmentResponse> list = patientPortalService.getPatientAppointments("patient1@dentcare.test");

        assertThat(list).hasSize(2);
        assertThat(list.get(0).reason()).isEqualTo("Cleaning");
        assertThat(list.get(0).dentistName()).isNull();
        assertThat(list.get(0).statusDescription()).isEqualTo("Pending confirmation");

        assertThat(list.get(1).reason()).isEqualTo("Filling");
        assertThat(list.get(1).dentistName()).contains("Dr. Sarah Connor");
        assertThat(list.get(1).statusDescription()).isEqualTo("Confirmed");
    }

    @Test
    @DisplayName("getPatientAppointmentById allows patient to access their own appointment")
    void testGetPatientAppointmentByIdSuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Appointment appt = new Appointment(patientUser1, LocalDate.now().plusDays(2), "11:00", "Checkup", null);
        appt.setId(2001L);
        appt.setStatus(AppointmentStatus.PENDING);

        when(appointmentRepository.findByIdWithDentist(2001L)).thenReturn(Optional.of(appt));

        PatientAppointmentResponse response = patientPortalService.getPatientAppointmentById("patient1@dentcare.test", 2001L);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(2001L);
        assertThat(response.reason()).isEqualTo("Checkup");
    }

    @Test
    @DisplayName("CRITICAL DATA ISOLATION: Patient A cannot view Patient B's appointment (403 Forbidden)")
    void testGetPatientAppointmentByIdIsolationRejection() {
        // Authenticated as Patient 1 (Alice)
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        // Appointment belongs to Patient 2 (Bob)
        Appointment apptOfBob = new Appointment(patientUser2, LocalDate.now().plusDays(2), "11:00", "Checkup", null);
        apptOfBob.setId(2002L);

        when(appointmentRepository.findByIdWithDentist(2002L)).thenReturn(Optional.of(apptOfBob));

        assertThatThrownBy(() -> patientPortalService.getPatientAppointmentById("patient1@dentcare.test", 2002L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("Access denied");
                });
    }

    @Test
    @DisplayName("getPatientAppointmentById throws 404 when appointment does not exist")
    void testGetPatientAppointmentByIdNotFound() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(appointmentRepository.findByIdWithDentist(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patientPortalService.getPatientAppointmentById("patient1@dentcare.test", 9999L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                });
    }
}
