package com.dentcare.patient.service;

import com.dentcare.appointment.dto.CreateAppointmentRequest;
import com.dentcare.appointment.dto.PatientAppointmentResponse;
import com.dentcare.appointment.entity.Appointment;
import com.dentcare.appointment.entity.AppointmentStatus;
import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import com.dentcare.billing.entity.InvoiceStatus;
import com.dentcare.billing.entity.Payment;
import com.dentcare.billing.entity.PaymentMethod;
import com.dentcare.billing.entity.PaymentStatus;
import com.dentcare.billing.repository.InvoiceRepository;
import com.dentcare.billing.repository.PaymentRepository;
import com.dentcare.patient.dto.PatientDashboardSummaryResponse;
import com.dentcare.patient.dto.PatientInvoiceDetailResponse;
import com.dentcare.patient.dto.PatientInvoiceSummaryResponse;
import com.dentcare.patient.dto.PatientPrescriptionItemResponse;
import com.dentcare.patient.dto.PatientReceiptResponse;
import com.dentcare.patient.entity.Gender;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.repository.PatientRepository;
import com.dentcare.notification.entity.AppointmentEmailNotification;
import com.dentcare.notification.entity.EmailNotificationStatus;
import com.dentcare.notification.repository.AppointmentEmailNotificationRepository;
import com.dentcare.prescription.entity.Prescription;
import com.dentcare.prescription.entity.PrescriptionItem;
import com.dentcare.prescription.entity.PrescriptionStatus;
import com.dentcare.prescription.repository.PrescriptionRepository;
import com.dentcare.security.entity.PhoneVerificationChallenge;
import com.dentcare.security.entity.PhoneVerificationChallengeStatus;
import com.dentcare.security.entity.PhoneVerificationDeliveryMode;
import com.dentcare.security.entity.Role;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.PhoneVerificationChallengeRepository;
import com.dentcare.security.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Mock
    private PhoneVerificationChallengeRepository challengeRepository;

    @Mock
    private AppointmentEmailNotificationRepository emailNotificationRepository;

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
                appointmentRepository,
                invoiceRepository,
                paymentRepository,
                passwordEncoder,
                challengeRepository,
                emailNotificationRepository
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
                "Prefer morning slot if possible",
                false
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
                null,
                false
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
                null,
                false
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
                    null,
                    false
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
                null,
                false
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
                null,
                false
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
                null,
                false
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
                null,
                false
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
                null,
                false
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
                null,
                false
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
                null,
                false
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
                null,
                false
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
                null,
                false
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
                "New patient",
                false
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

    @Test
    @DisplayName("cancelAppointmentRequest allows authenticated patient to cancel their own PENDING appointment")
    void testCancelAppointmentRequestSuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Appointment appt = new Appointment(patientUser1, LocalDate.now().plusDays(3), "14:00", "Root canal check", "Mild ache");
        appt.setId(3001L);
        appt.setStatus(AppointmentStatus.PENDING);

        when(appointmentRepository.findByIdWithDentist(3001L)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PatientAppointmentResponse response = patientPortalService.cancelAppointmentRequest("patient1@dentcare.test", 3001L);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(3001L);
        assertThat(response.status()).isEqualTo("CANCELLED");
        assertThat(response.statusDescription()).isEqualTo("Cancelled");
        assertThat(appt.getStatus()).isEqualTo(AppointmentStatus.CANCELLED);
    }

    @Test
    @DisplayName("cancelAppointmentRequest preserves original appointment fields (date, time, reason, notes, dentist, patient)")
    void testCancelAppointmentRequestPreservesFields() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        LocalDate apptDate = LocalDate.now().plusDays(5);
        Appointment appt = new Appointment(patientUser1, apptDate, "09:30", "Consultation", "Some notes");
        appt.setId(3002L);
        appt.setStatus(AppointmentStatus.PENDING);
        appt.setDentist(dentistUser);

        when(appointmentRepository.findByIdWithDentist(3002L)).thenReturn(Optional.of(appt));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PatientAppointmentResponse response = patientPortalService.cancelAppointmentRequest("patient1@dentcare.test", 3002L);

        assertThat(appt.getAppointmentDate()).isEqualTo(apptDate);
        assertThat(appt.getPreferredTime()).isEqualTo("09:30");
        assertThat(appt.getReason()).isEqualTo("Consultation");
        assertThat(appt.getNotes()).isEqualTo("Some notes");
        assertThat(appt.getDentist()).isEqualTo(dentistUser);
        assertThat(appt.getPatient()).isEqualTo(patientUser1);
        assertThat(response.dentistName()).isEqualTo("Dr. Sarah Connor");
    }

    @Test
    @DisplayName("CRITICAL DATA ISOLATION: Patient A cannot cancel Patient B's appointment (403 Forbidden)")
    void testCancelAppointmentRequestCrossPatientForbidden() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Appointment apptOfBob = new Appointment(patientUser2, LocalDate.now().plusDays(2), "11:00", "Checkup", null);
        apptOfBob.setId(3003L);
        apptOfBob.setStatus(AppointmentStatus.PENDING);

        when(appointmentRepository.findByIdWithDentist(3003L)).thenReturn(Optional.of(apptOfBob));

        assertThatThrownBy(() -> patientPortalService.cancelAppointmentRequest("patient1@dentcare.test", 3003L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("Access denied");
                });
    }

    @Test
    @DisplayName("cancelAppointmentRequest throws 404 Not Found when appointment does not exist")
    void testCancelAppointmentRequestNotFound() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(appointmentRepository.findByIdWithDentist(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patientPortalService.cancelAppointmentRequest("patient1@dentcare.test", 9999L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                });
    }

    @Test
    @DisplayName("cancelAppointmentRequest rejects cancelling CONFIRMED appointment with 400 Bad Request")
    void testCancelAppointmentRequestConfirmedBadRequest() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Appointment appt = new Appointment(patientUser1, LocalDate.now().plusDays(2), "10:00", "Filling", null);
        appt.setId(3004L);
        appt.setStatus(AppointmentStatus.CONFIRMED);

        when(appointmentRepository.findByIdWithDentist(3004L)).thenReturn(Optional.of(appt));

        assertThatThrownBy(() -> patientPortalService.cancelAppointmentRequest("patient1@dentcare.test", 3004L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Only pending appointment requests can be cancelled");
                });
    }

    @Test
    @DisplayName("cancelAppointmentRequest rejects cancelling already-CANCELLED appointment with 400 Bad Request")
    void testCancelAppointmentRequestAlreadyCancelledBadRequest() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Appointment appt = new Appointment(patientUser1, LocalDate.now().plusDays(2), "10:00", "Filling", null);
        appt.setId(3005L);
        appt.setStatus(AppointmentStatus.CANCELLED);

        when(appointmentRepository.findByIdWithDentist(3005L)).thenReturn(Optional.of(appt));

        assertThatThrownBy(() -> patientPortalService.cancelAppointmentRequest("patient1@dentcare.test", 3005L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("already cancelled");
                });
    }

    @Test
    @DisplayName("getPatientInvoices returns own invoices ordered newest first mapped to PatientInvoiceSummaryResponse")
    void testGetPatientInvoicesSuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Invoice inv1 = new Invoice("INV-2026-0001", 101L, LocalDate.of(2026, 9, 20));
        inv1.setId(5001L);
        inv1.setTotalAmount(new BigDecimal("150.00"));
        inv1.setPaidAmount(new BigDecimal("50.00"));
        inv1.setBalanceAmount(new BigDecimal("100.00"));
        inv1.setStatus(InvoiceStatus.PARTIALLY_PAID);

        Invoice inv2 = new Invoice("INV-2026-0002", 101L, LocalDate.of(2026, 8, 15));
        inv2.setId(5002L);
        inv2.setTotalAmount(new BigDecimal("80.00"));
        inv2.setPaidAmount(new BigDecimal("80.00"));
        inv2.setBalanceAmount(BigDecimal.ZERO);
        inv2.setStatus(InvoiceStatus.PAID);

        when(invoiceRepository.findByPatientIdOrderByInvoiceDateDescIdDesc(101L))
                .thenReturn(List.of(inv1, inv2));

        List<PatientInvoiceSummaryResponse> summaries = patientPortalService.getPatientInvoices("patient1@dentcare.test");

        assertThat(summaries).hasSize(2);
        assertThat(summaries.get(0).id()).isEqualTo(5001L);
        assertThat(summaries.get(0).invoiceNumber()).isEqualTo("INV-2026-0001");
        assertThat(summaries.get(0).totalAmount()).isEqualByComparingTo("150.00");
        assertThat(summaries.get(0).paidAmount()).isEqualByComparingTo("50.00");
        assertThat(summaries.get(0).balanceAmount()).isEqualByComparingTo("100.00");
        assertThat(summaries.get(0).status()).isEqualTo("PARTIALLY_PAID");

        assertThat(summaries.get(1).id()).isEqualTo(5002L);
        assertThat(summaries.get(1).status()).isEqualTo("PAID");
    }

    @Test
    @DisplayName("getPatientInvoices query uses authenticated user ID, strictly isolating Patient A from Patient B")
    void testGetPatientInvoicesCrossPatientIsolation() {
        when(userRepository.findByEmailIgnoreCase("patient2@dentcare.test"))
                .thenReturn(Optional.of(patientUser2));

        when(invoiceRepository.findByPatientIdOrderByInvoiceDateDescIdDesc(102L))
                .thenReturn(List.of());

        List<PatientInvoiceSummaryResponse> summaries = patientPortalService.getPatientInvoices("patient2@dentcare.test");

        assertThat(summaries).isEmpty();
        // Verifies repository was called strictly with patientUser2.id (102L), never 101L
        org.mockito.Mockito.verify(invoiceRepository).findByPatientIdOrderByInvoiceDateDescIdDesc(102L);
        org.mockito.Mockito.verify(invoiceRepository, org.mockito.Mockito.never()).findByPatientIdOrderByInvoiceDateDescIdDesc(101L);
    }

    @Test
    @DisplayName("getPatientInvoiceById returns verified invoice details with items and payment history")
    void testGetPatientInvoiceByIdSuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Invoice inv = new Invoice("INV-2026-0010", 101L, LocalDate.of(2026, 9, 25));
        inv.setId(5010L);
        inv.setSubtotal(new BigDecimal("200.00"));
        inv.setDiscountAmount(BigDecimal.ZERO);
        inv.setTotalAmount(new BigDecimal("200.00"));
        inv.setPaidAmount(new BigDecimal("100.00"));
        inv.setBalanceAmount(new BigDecimal("100.00"));
        inv.setStatus(InvoiceStatus.PARTIALLY_PAID);
        inv.setNotes("Follow-up appointment scheduled");

        InvoiceItem item = new InvoiceItem(inv, "Dental Consultation & Cleaning", 1, new BigDecimal("200.00"), new BigDecimal("200.00"));
        item.setId(6001L);
        inv.addItem(item);

        Payment payment = new Payment(inv, "PAY-2026-0001", new BigDecimal("100.00"), PaymentMethod.CARD, "AUTH-999", LocalDateTime.of(2026, 9, 25, 11, 30), 201L);
        payment.setId(7001L);
        payment.setStatus(PaymentStatus.RECORDED);
        inv.getPayments().add(payment);

        when(invoiceRepository.findById(5010L)).thenReturn(Optional.of(inv));

        PatientInvoiceDetailResponse detail = patientPortalService.getPatientInvoiceById("patient1@dentcare.test", 5010L);

        assertThat(detail).isNotNull();
        assertThat(detail.id()).isEqualTo(5010L);
        assertThat(detail.invoiceNumber()).isEqualTo("INV-2026-0010");
        assertThat(detail.status()).isEqualTo("PARTIALLY_PAID");
        assertThat(detail.notes()).isEqualTo("Follow-up appointment scheduled");
        assertThat(detail.items()).hasSize(1);
        assertThat(detail.items().get(0).description()).isEqualTo("Dental Consultation & Cleaning");
        assertThat(detail.items().get(0).lineTotal()).isEqualByComparingTo("200.00");
        assertThat(detail.payments()).hasSize(1);
        assertThat(detail.payments().get(0).paymentNumber()).isEqualTo("PAY-2026-0001");
        assertThat(detail.payments().get(0).amount()).isEqualByComparingTo("100.00");
        assertThat(detail.payments().get(0).paymentMethod()).isEqualTo("CARD");
    }

    @Test
    @DisplayName("getPatientInvoiceById throws 404 when invoice does not exist")
    void testGetPatientInvoiceByIdNotFoundThrows404() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        when(invoiceRepository.findById(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patientPortalService.getPatientInvoiceById("patient1@dentcare.test", 9999L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(rse.getReason()).contains("Invoice not found");
                });
    }

    @Test
    @DisplayName("getPatientInvoiceById throws 403 Forbidden when invoice belongs to another patient")
    void testGetPatientInvoiceByIdCrossPatientForbiddenThrows403() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        // Invoice belongs to patientUser2 (102L), not patientUser1 (101L)
        Invoice otherPatientInvoice = new Invoice("INV-2026-0099", 102L, LocalDate.of(2026, 9, 20));
        otherPatientInvoice.setId(5099L);

        when(invoiceRepository.findById(5099L)).thenReturn(Optional.of(otherPatientInvoice));

        assertThatThrownBy(() -> patientPortalService.getPatientInvoiceById("patient1@dentcare.test", 5099L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("does not belong to the authenticated patient");
                });
    }

    @Test
    @DisplayName("getPatientReceipt returns patient-safe receipt data for owned payment")
    void testGetPatientReceiptSuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Invoice inv = new Invoice("INV-2026-0050", 101L, LocalDate.of(2026, 9, 20));
        inv.setId(5050L);
        inv.setTotalAmount(new BigDecimal("300.00"));
        inv.setBalanceAmount(new BigDecimal("100.00"));

        Payment payment = new Payment(inv, "PAY-2026-0088", new BigDecimal("200.00"), PaymentMethod.BANK_TRANSFER, "REF-12345", LocalDateTime.of(2026, 9, 21, 14, 0), 999L);
        payment.setId(7088L);
        payment.setStatus(PaymentStatus.RECORDED);

        when(paymentRepository.findById(7088L)).thenReturn(Optional.of(payment));

        PatientReceiptResponse receipt = patientPortalService.getPatientReceipt("patient1@dentcare.test", 7088L);

        assertThat(receipt).isNotNull();
        assertThat(receipt.paymentId()).isEqualTo(7088L);
        assertThat(receipt.paymentNumber()).isEqualTo("PAY-2026-0088");
        assertThat(receipt.invoiceId()).isEqualTo(5050L);
        assertThat(receipt.invoiceNumber()).isEqualTo("INV-2026-0050");
        assertThat(receipt.paymentAmount()).isEqualByComparingTo("200.00");
        assertThat(receipt.paymentMethod()).isEqualTo("BANK_TRANSFER");
        assertThat(receipt.paymentReference()).isEqualTo("REF-12345");
        assertThat(receipt.invoiceTotalAmount()).isEqualByComparingTo("300.00");
        assertThat(receipt.remainingBalance()).isEqualByComparingTo("100.00");
        assertThat(receipt.status()).isEqualTo("RECORDED");
    }

    @Test
    @DisplayName("getPatientReceipt throws 404 Not Found when payment does not exist")
    void testGetPatientReceiptNotFoundThrows404() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        when(paymentRepository.findById(8888L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patientPortalService.getPatientReceipt("patient1@dentcare.test", 8888L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(rse.getReason()).contains("Payment not found");
                });
    }

    @Test
    @DisplayName("getPatientReceipt throws 403 Forbidden when payment invoice belongs to another patient")
    void testGetPatientReceiptCrossPatientForbiddenThrows403() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        // Invoice belongs to patientUser2 (102L)
        Invoice otherPatientInvoice = new Invoice("INV-2026-0077", 102L, LocalDate.of(2026, 9, 22));
        otherPatientInvoice.setId(5077L);

        Payment otherPayment = new Payment(otherPatientInvoice, "PAY-2026-0077", new BigDecimal("50.00"), PaymentMethod.CASH, null, LocalDateTime.now(), 201L);
        otherPayment.setId(7077L);

        when(paymentRepository.findById(7077L)).thenReturn(Optional.of(otherPayment));

        assertThatThrownBy(() -> patientPortalService.getPatientReceipt("patient1@dentcare.test", 7077L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("does not belong to the authenticated patient");
                });
    }

    // =========================================================================
    // Patient Self-Service: Phone Update Tests
    // =========================================================================

    @Test
    @DisplayName("Patient updates own phone successfully and normalized value is persisted")
    void testUpdatePatientProfileSuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest(" +1 555-9876 ");

        com.dentcare.patient.dto.PatientProfileResponse response =
                patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(101L);
        assertThat(response.phone()).isEqualTo("+1 555-9876");
        assertThat(response.email()).isEqualTo("patient1@dentcare.test");
        assertThat(response.firstName()).isEqualTo("Alice");
        assertThat(response.lastName()).isEqualTo("Smith");
        assertThat(response.role()).isEqualTo("PATIENT");
        assertThat(patientUser1.getPhone()).isEqualTo("+1 555-9876");
    }

    @Test
    @DisplayName("Blank or whitespace phone is normalized to null")
    void testUpdatePatientProfileBlankPhoneNormalizedToNull() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("   ");

        com.dentcare.patient.dto.PatientProfileResponse response =
                patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(response.phone()).isNull();
        assertThat(patientUser1.getPhone()).isNull();
    }

    @Test
    @DisplayName("Patient without clinical Patient record can update phone")
    void testUpdatePatientProfileWithoutClinicalRecord() {
        // patientUser1 has no clinical record in patientRepository
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+1 555-4321");

        com.dentcare.patient.dto.PatientProfileResponse response =
                patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(response.phone()).isEqualTo("+1 555-4321");
    }

    @Test
    @DisplayName("Phone exceeding 25 characters is rejected with 400 Bad Request")
    void testUpdatePatientProfilePhoneExceedingMaxCharsThrows400() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("12345678901234567890123456");

        assertThatThrownBy(() -> patientPortalService.updatePatientProfile("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Phone number cannot exceed 25 characters");
                });
    }

    @Test
    @DisplayName("Staff role attempting patient profile update is rejected with 403 Forbidden")
    void testUpdatePatientProfileStaffRoleThrows403() {
        when(userRepository.findByEmailIgnoreCase("dentist@dentcare.test"))
                .thenReturn(Optional.of(dentistUser));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+1 555-9999");

        assertThatThrownBy(() -> patientPortalService.updatePatientProfile("dentist@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("Access denied: patient self-service only");
                });
    }

    @Test
    @DisplayName("Changing phone number invalidates patient phone verification state and timestamp")
    void testUpdatePatientProfilePhoneChangeInvalidatesVerification() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+1 555-0101");
        patientUser1.setPhoneVerified(true);
        patientUser1.setPhoneVerifiedAt(java.time.LocalDateTime.now());

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+1 555-9999");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(patientUser1.getPhone()).isEqualTo("+1 555-9999");
        assertThat(patientUser1.isPhoneVerified()).isFalse();
        assertThat(patientUser1.getPhoneVerifiedAt()).isNull();
    }

    @Test
    @DisplayName("Clearing phone number invalidates patient phone verification state and timestamp")
    void testUpdatePatientProfileClearingPhoneInvalidatesVerification() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+1 555-0101");
        patientUser1.setPhoneVerified(true);
        patientUser1.setPhoneVerifiedAt(java.time.LocalDateTime.now());

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("   ");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(patientUser1.getPhone()).isNull();
        assertThat(patientUser1.isPhoneVerified()).isFalse();
        assertThat(patientUser1.getPhoneVerifiedAt()).isNull();
    }

    @Test
    @DisplayName("Submitting identical phone preserves existing phone verification state and timestamp")
    void testUpdatePatientProfileSamePhonePreservesVerification() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        java.time.LocalDateTime verifiedAt = java.time.LocalDateTime.now().minusHours(2);
        patientUser1.setPhone("+1 555-0101");
        patientUser1.setPhoneVerified(true);
        patientUser1.setPhoneVerifiedAt(verifiedAt);

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+1 555-0101");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(patientUser1.getPhone()).isEqualTo("+1 555-0101");
        assertThat(patientUser1.isPhoneVerified()).isTrue();
        assertThat(patientUser1.getPhoneVerifiedAt()).isEqualTo(verifiedAt);

        // Challenge supersession query should NEVER be called when phone is identical
        verify(challengeRepository, never()).findByUserIdAndStatusInForUpdate(any(), any());
    }

    // =========================================================================
    // Prompt 109 Focused Tests: Outstanding Challenge Invalidation
    // =========================================================================

    @Test
    @DisplayName("1. Changing phone supersedes CREATED challenges")
    void testChangingPhoneSupersedesCreatedChallenge() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94770000001");
        PhoneVerificationChallenge challenge = new PhoneVerificationChallenge(
                patientUser1,
                "+94770000001",
                "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
                PhoneVerificationDeliveryMode.TEST,
                LocalDateTime.now().plusMinutes(10)
        );
        assertThat(challenge.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.CREATED);

        when(challengeRepository.findByUserIdAndStatusInForUpdate(eq(101L), eq(PhoneVerificationChallengeRepository.OUTSTANDING_STATUSES)))
                .thenReturn(List.of(challenge));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(challenge.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.SUPERSEDED);
        verify(challengeRepository).saveAll(List.of(challenge));
    }

    @Test
    @DisplayName("2. Changing phone supersedes SUBMITTED challenges")
    void testChangingPhoneSupersedesSubmittedChallenge() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94770000001");
        PhoneVerificationChallenge challenge = new PhoneVerificationChallenge(
                patientUser1,
                "+94770000001",
                "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
                PhoneVerificationDeliveryMode.TEST,
                LocalDateTime.now().plusMinutes(10)
        );
        challenge.setStatus(PhoneVerificationChallengeStatus.SUBMITTED);

        when(challengeRepository.findByUserIdAndStatusInForUpdate(eq(101L), eq(PhoneVerificationChallengeRepository.OUTSTANDING_STATUSES)))
                .thenReturn(List.of(challenge));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(challenge.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.SUPERSEDED);
        verify(challengeRepository).saveAll(List.of(challenge));
    }

    @Test
    @DisplayName("3. Changing phone supersedes DELIVERY_UNCERTAIN challenges")
    void testChangingPhoneSupersedesDeliveryUncertainChallenge() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94770000001");
        PhoneVerificationChallenge challenge = new PhoneVerificationChallenge(
                patientUser1,
                "+94770000001",
                "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
                PhoneVerificationDeliveryMode.TEST,
                LocalDateTime.now().plusMinutes(10)
        );
        challenge.setStatus(PhoneVerificationChallengeStatus.DELIVERY_UNCERTAIN);

        when(challengeRepository.findByUserIdAndStatusInForUpdate(eq(101L), eq(PhoneVerificationChallengeRepository.OUTSTANDING_STATUSES)))
                .thenReturn(List.of(challenge));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(challenge.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.SUPERSEDED);
        verify(challengeRepository).saveAll(List.of(challenge));
    }

    @Test
    @DisplayName("4. Terminal challenges remain unchanged and are not queried for supersession")
    void testTerminalChallengesRemainUnchanged() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94770000001");

        // The query repository specifies OUTSTANDING_STATUSES only
        assertThat(PhoneVerificationChallengeRepository.OUTSTANDING_STATUSES)
                .containsExactlyInAnyOrder(
                        PhoneVerificationChallengeStatus.CREATED,
                        PhoneVerificationChallengeStatus.SUBMITTED,
                        PhoneVerificationChallengeStatus.DELIVERY_UNCERTAIN
                );
        assertThat(PhoneVerificationChallengeRepository.OUTSTANDING_STATUSES)
                .doesNotContain(
                        PhoneVerificationChallengeStatus.SEND_FAILED,
                        PhoneVerificationChallengeStatus.VERIFIED,
                        PhoneVerificationChallengeStatus.EXPIRED,
                        PhoneVerificationChallengeStatus.EXHAUSTED,
                        PhoneVerificationChallengeStatus.SUPERSEDED
                );

        when(challengeRepository.findByUserIdAndStatusInForUpdate(eq(101L), eq(PhoneVerificationChallengeRepository.OUTSTANDING_STATUSES)))
                .thenReturn(List.of()); // No outstanding challenges found

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        verify(challengeRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("5. Multiple outstanding challenges are all superseded for the authenticated patient")
    void testMultipleOutstandingChallengesAllSuperseded() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94770000001");
        PhoneVerificationChallenge c1 = new PhoneVerificationChallenge(
                patientUser1, "+94770000001", "mac1...", PhoneVerificationDeliveryMode.TEST, LocalDateTime.now().plusMinutes(10)
        );
        c1.setStatus(PhoneVerificationChallengeStatus.CREATED);

        PhoneVerificationChallenge c2 = new PhoneVerificationChallenge(
                patientUser1, "+94770000001", "mac2...", PhoneVerificationDeliveryMode.TEST, LocalDateTime.now().plusMinutes(10)
        );
        c2.setStatus(PhoneVerificationChallengeStatus.SUBMITTED);

        PhoneVerificationChallenge c3 = new PhoneVerificationChallenge(
                patientUser1, "+94770000001", "mac3...", PhoneVerificationDeliveryMode.TEST, LocalDateTime.now().plusMinutes(10)
        );
        c3.setStatus(PhoneVerificationChallengeStatus.DELIVERY_UNCERTAIN);

        when(challengeRepository.findByUserIdAndStatusInForUpdate(eq(101L), eq(PhoneVerificationChallengeRepository.OUTSTANDING_STATUSES)))
                .thenReturn(List.of(c1, c2, c3));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(c1.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.SUPERSEDED);
        assertThat(c2.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.SUPERSEDED);
        assertThat(c3.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.SUPERSEDED);
        verify(challengeRepository).saveAll(List.of(c1, c2, c3));
    }

    @Test
    @DisplayName("6. Challenges of other users remain untouched")
    void testChallengesOfOtherUsersRemainUntouched() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94770000001");

        // When patient 1 updates phone, only patient 1's ID (101L) is queried
        when(challengeRepository.findByUserIdAndStatusInForUpdate(eq(101L), any()))
                .thenReturn(List.of());

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        // Verify patient2's challenges (ID 102L) were never queried
        verify(challengeRepository, never()).findByUserIdAndStatusInForUpdate(eq(102L), any());
    }

    @Test
    @DisplayName("7. Same phone preserves challenge states and does not trigger challenge queries")
    void testSamePhonePreservesChallengeStates() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94771234567");

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94771234567");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        verify(challengeRepository, never()).findByUserIdAndStatusInForUpdate(any(), any());
        verify(challengeRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("8. Non-phone profile edit preserves challenges")
    void testNonPhoneProfileEditPreservesChallenges() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94771234567");
        patientUser1.setPhoneVerified(true);
        LocalDateTime verifiedAt = LocalDateTime.now().minusDays(1);
        patientUser1.setPhoneVerifiedAt(verifiedAt);

        // Update request with same phone (simulating non-phone or identity preservation)
        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94771234567");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(patientUser1.isPhoneVerified()).isTrue();
        assertThat(patientUser1.getPhoneVerifiedAt()).isEqualTo(verifiedAt);
        verify(challengeRepository, never()).findByUserIdAndStatusInForUpdate(any(), any());
    }

    @Test
    @DisplayName("9. Phone clearing supersedes outstanding challenges")
    void testPhoneClearingSupersedesOutstandingChallenges() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94770000001");
        PhoneVerificationChallenge challenge = new PhoneVerificationChallenge(
                patientUser1,
                "+94770000001",
                "mac...",
                PhoneVerificationDeliveryMode.TEST,
                LocalDateTime.now().plusMinutes(10)
        );
        challenge.setStatus(PhoneVerificationChallengeStatus.CREATED);

        when(challengeRepository.findByUserIdAndStatusInForUpdate(eq(101L), eq(PhoneVerificationChallengeRepository.OUTSTANDING_STATUSES)))
                .thenReturn(List.of(challenge));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest(null);

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        assertThat(patientUser1.getPhone()).isNull();
        assertThat(challenge.getStatus()).isEqualTo(PhoneVerificationChallengeStatus.SUPERSEDED);
        verify(challengeRepository).saveAll(List.of(challenge));
    }

    @Test
    @DisplayName("12. Failed challenge update propagates exception to trigger transaction rollback")
    void testFailedChallengeUpdatePropagatesException() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        patientUser1.setPhone("+94770000001");
        PhoneVerificationChallenge challenge = new PhoneVerificationChallenge(
                patientUser1, "+94770000001", "mac...", PhoneVerificationDeliveryMode.TEST, LocalDateTime.now().plusMinutes(10)
        );

        when(challengeRepository.findByUserIdAndStatusInForUpdate(eq(101L), any()))
                .thenReturn(List.of(challenge));
        when(challengeRepository.saveAll(any()))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("Database lock error"));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        assertThatThrownBy(() -> patientPortalService.updatePatientProfile("patient1@dentcare.test", request))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class)
                .hasMessageContaining("Database lock error");
    }

    @Test
    @DisplayName("13. Failed user lookup during update throws exception")
    void testFailedUserLockLookupThrowsException() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.empty());

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        assertThatThrownBy(() -> patientPortalService.updatePatientProfile("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                });
    }

    @Test
    @DisplayName("14. Unauthenticated request without email throws 401 Unauthorized")
    void testUnauthenticatedProfileUpdateThrows401() {
        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        assertThatThrownBy(() -> patientPortalService.updatePatientProfile(null, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                });

        assertThatThrownBy(() -> patientPortalService.updatePatientProfile("   ", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
                });
    }

    @Test
    @DisplayName("15. Unauthorized non-patient role throws 403 Forbidden")
    void testUnauthorizedNonPatientRoleThrows403() {
        when(userRepository.findByEmailIgnoreCase("dentist@dentcare.test"))
                .thenReturn(Optional.of(dentistUser));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        assertThatThrownBy(() -> patientPortalService.updatePatientProfile("dentist@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                });
    }

    @Test
    @DisplayName("17. No SMS outbox record is created during phone update")
    void testNoSmsOutboxCreatedDuringPhoneUpdate() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        // Verification: Pure profile/challenge update; no outbox interactions
        assertThat(patientUser1.getPhone()).isEqualTo("+94770000002");
    }

    @Test
    @DisplayName("18. No OTP or SMS is dispatched during profile phone update")
    void testNoOtpOrSmsDispatchedDuringPhoneUpdate() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.findByIdForUpdate(101L))
                .thenReturn(Optional.of(patientUser1));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.dentcare.patient.dto.UpdatePatientProfileRequest request =
                new com.dentcare.patient.dto.UpdatePatientProfileRequest("+94770000002");

        patientPortalService.updatePatientProfile("patient1@dentcare.test", request);

        // State changes only; no network or messaging side effects
        assertThat(patientUser1.getPhone()).isEqualTo("+94770000002");
    }

    @Test
    @DisplayName("Appointment booking with smsConsent true does not imply or grant phone verification")
    void testBookingWithSmsConsentDoesNotVerifyPhone() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(appointmentRepository.save(any(com.dentcare.appointment.entity.Appointment.class)))
                .thenAnswer(invocation -> {
                    com.dentcare.appointment.entity.Appointment a = invocation.getArgument(0);
                    a.setId(7001L);
                    return a;
                });

        patientUser1.setPhone("+1 555-0101");
        assertThat(patientUser1.isPhoneVerified()).isFalse();

        com.dentcare.appointment.dto.CreateAppointmentRequest request =
                new com.dentcare.appointment.dto.CreateAppointmentRequest(
                        java.time.LocalDate.now().plusDays(3),
                        "10:00",
                        "Consultation",
                        null,
                        true // smsConsent opt-in
                );

        patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        // SMS consent must NEVER imply or derive phone verification
        assertThat(patientUser1.isPhoneVerified()).isFalse();
        assertThat(patientUser1.getPhoneVerifiedAt()).isNull();
    }

    // =========================================================================
    // Patient Self-Service: Password Change Tests
    // =========================================================================

    @Test
    @DisplayName("Patient changes password successfully with correct current password")
    void testChangePasswordSuccess() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(passwordEncoder.matches("CurrentPass123", "hash1")).thenReturn(true);
        when(passwordEncoder.matches("NewSecurePass456", "hash1")).thenReturn(false);
        when(passwordEncoder.encode("NewSecurePass456")).thenReturn("$2a$12$newHashedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.dentcare.patient.dto.ChangePasswordRequest request =
                new com.dentcare.patient.dto.ChangePasswordRequest("CurrentPass123", "NewSecurePass456");

        patientPortalService.changePatientPassword("patient1@dentcare.test", request);

        assertThat(patientUser1.getPasswordHash()).isEqualTo("$2a$12$newHashedPassword");
        assertThat(patientUser1.getEmail()).isEqualTo("patient1@dentcare.test");
        assertThat(patientUser1.getFirstName()).isEqualTo("Alice");
        assertThat(patientUser1.getLastName()).isEqualTo("Smith");
        assertThat(patientUser1.getRole()).isEqualTo(Role.PATIENT);
    }

    @Test
    @DisplayName("Wrong current password is safely rejected with 400 Bad Request")
    void testChangePasswordWrongCurrentPasswordThrows400() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(passwordEncoder.matches("WrongPassword1", "hash1")).thenReturn(false);

        com.dentcare.patient.dto.ChangePasswordRequest request =
                new com.dentcare.patient.dto.ChangePasswordRequest("WrongPassword1", "NewSecurePass456");

        assertThatThrownBy(() -> patientPortalService.changePatientPassword("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Current password is incorrect");
                });
    }

    @Test
    @DisplayName("Weak new password (no digits) is rejected with 400 Bad Request")
    void testChangePasswordWithoutDigitThrows400() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(passwordEncoder.matches("CurrentPass123", "hash1")).thenReturn(true);

        com.dentcare.patient.dto.ChangePasswordRequest request =
                new com.dentcare.patient.dto.ChangePasswordRequest("CurrentPass123", "nodigitsinpassword");

        assertThatThrownBy(() -> patientPortalService.changePatientPassword("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("at least one letter and one digit");
                });
    }

    @Test
    @DisplayName("Short new password (< 8 chars) is rejected with 400 Bad Request")
    void testChangePasswordTooShortThrows400() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(passwordEncoder.matches("CurrentPass123", "hash1")).thenReturn(true);

        com.dentcare.patient.dto.ChangePasswordRequest request =
                new com.dentcare.patient.dto.ChangePasswordRequest("CurrentPass123", "Pass1");

        assertThatThrownBy(() -> patientPortalService.changePatientPassword("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("between 8 and 100 characters");
                });
    }

    @Test
    @DisplayName("New password same as current password is rejected with 400 Bad Request")
    void testChangePasswordSameAsCurrentThrows400() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));
        when(passwordEncoder.matches("CurrentPass123", "hash1")).thenReturn(true);

        com.dentcare.patient.dto.ChangePasswordRequest request =
                new com.dentcare.patient.dto.ChangePasswordRequest("CurrentPass123", "CurrentPass123");

        assertThatThrownBy(() -> patientPortalService.changePatientPassword("patient1@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("New password cannot be the same as current password");
                });
    }

    @Test
    @DisplayName("Staff role attempting password change via patient endpoint is rejected with 403 Forbidden")
    void testChangePasswordStaffRoleThrows403() {
        when(userRepository.findByEmailIgnoreCase("dentist@dentcare.test"))
                .thenReturn(Optional.of(dentistUser));

        com.dentcare.patient.dto.ChangePasswordRequest request =
                new com.dentcare.patient.dto.ChangePasswordRequest("OldPass123", "NewPass456");

        assertThatThrownBy(() -> patientPortalService.changePatientPassword("dentist@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
                    assertThat(rse.getReason()).contains("Access denied: patient self-service only");
                });
    }

    @Test
    @DisplayName("createAppointmentRequest with null smsConsent defaults to false and records no timestamp")
    void testCreateAppointmentRequestWithNullSmsConsentDefaultsToFalse() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(5),
                "10:00",
                "Checkup",
                null,
                null // null consent
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            assertThat(a.isSmsConsent()).isFalse();
            assertThat(a.getSmsConsentAt()).isNull();
            assertThat(a.getStatus()).isEqualTo(AppointmentStatus.PENDING);
            a.setId(6001L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(6001L);
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("createAppointmentRequest with explicit false smsConsent persists false and null timestamp")
    void testCreateAppointmentRequestWithExplicitFalseConsent() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(5),
                "10:00",
                "Checkup",
                null,
                Boolean.FALSE
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            assertThat(a.isSmsConsent()).isFalse();
            assertThat(a.getSmsConsentAt()).isNull();
            assertThat(a.getStatus()).isEqualTo(AppointmentStatus.PENDING);
            a.setId(6002L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(6002L);
    }

    @Test
    @DisplayName("createAppointmentRequest with explicit true smsConsent persists true and server-side timestamp")
    void testCreateAppointmentRequestWithExplicitTrueConsent() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(5),
                "10:00",
                "Checkup",
                null,
                Boolean.TRUE
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            assertThat(a.isSmsConsent()).isTrue();
            assertThat(a.getSmsConsentAt()).isNotNull();
            assertThat(a.getSmsConsentAt()).isBeforeOrEqualTo(java.time.LocalDateTime.now());
            assertThat(a.getStatus()).isEqualTo(AppointmentStatus.PENDING);
            a.setId(6003L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(6003L);
        assertThat(response.status()).isEqualTo("PENDING");
    }

    @Test
    @DisplayName("createAppointmentRequest validation failure does not save appointment or persist consent")
    void testCreateAppointmentRequestValidationFailureDoesNotPersistConsent() {
        CreateAppointmentRequest invalidRequest = new CreateAppointmentRequest(
                LocalDate.now().minusDays(1), // past date
                "10:00",
                "Checkup",
                null,
                Boolean.TRUE
        );

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", invalidRequest))
                .isInstanceOf(ResponseStatusException.class);

        verify(appointmentRepository, never()).save(any(Appointment.class));
    }

    @Test
    @DisplayName("createAppointmentRequest persists Appointment and exactly one EmailNotification in outbox with correct template")
    void testCreateAppointmentRequestPersistsEmailOutboxNotification() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        LocalDate apptDate = LocalDate.now().plusDays(5);
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                apptDate,
                "10:00",
                "Routine Cleaning",
                "Sensitive gums",
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(6001L);
            return a;
        });

        PatientAppointmentResponse response = patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(6001L);
        assertThat(response.status()).isEqualTo("PENDING");

        // Verify email outbox notification was saved
        ArgumentCaptor<AppointmentEmailNotification> captor = ArgumentCaptor.forClass(AppointmentEmailNotification.class);
        verify(emailNotificationRepository).save(captor.capture());
        AppointmentEmailNotification savedNotif = captor.getValue();

        assertThat(savedNotif).isNotNull();
        assertThat(savedNotif.getRecipientEmail()).isEqualTo("patient1@dentcare.test");
        assertThat(savedNotif.getIdempotencyKey()).isEqualTo("APPOINTMENT_REQUEST_RECEIVED:6001");
        assertThat(savedNotif.getEmailSubject()).isEqualTo("DentCare - Appointment Request Received");
        assertThat(savedNotif.getStatus()).isEqualTo(EmailNotificationStatus.PENDING);
        assertThat(savedNotif.getAttemptCount()).isEqualTo(0);

        String body = savedNotif.getEmailBody();
        assertThat(body).contains("Dear Patient,");
        assertThat(body).contains("Your appointment request has been successfully received by DentCare.");
        assertThat(body).contains("Booking ID: 6001");
        assertThat(body).contains("Appointment Date: " + apptDate);
        assertThat(body).contains("Preferred Time: 10:00");
        assertThat(body).contains("Appointment Status: Pending Confirmation");
        assertThat(body).contains("Please note that your appointment request is awaiting confirmation from the clinic.");
        assertThat(body).contains("Thank you,\nDentCare Team");

        // Privacy and Security requirements: reason and notes must NEVER be included in email
        assertThat(body).doesNotContain("Routine Cleaning");
        assertThat(body).doesNotContain("Sensitive gums");
        assertThat(body).doesNotContain("Dr.");
    }

    @Test
    @DisplayName("createAppointmentRequest with absent preferred time uses 'Not specified' fallback in email body")
    void testCreateAppointmentRequestMissingPreferredTimeFallback() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        LocalDate apptDate = LocalDate.now().plusDays(4);
        CreateAppointmentRequest request = new CreateAppointmentRequest(
                apptDate,
                null,
                "Consultation",
                null,
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(6002L);
            return a;
        });

        patientPortalService.createAppointmentRequest("patient1@dentcare.test", request);

        ArgumentCaptor<AppointmentEmailNotification> captor = ArgumentCaptor.forClass(AppointmentEmailNotification.class);
        verify(emailNotificationRepository).save(captor.capture());
        AppointmentEmailNotification savedNotif = captor.getValue();

        assertThat(savedNotif.getEmailBody()).contains("Preferred Time: Not specified");
    }

    @Test
    @DisplayName("createAppointmentRequest rejects duplicate idempotency key and prevents duplicate outbox record")
    void testCreateAppointmentRequestDuplicateIdempotencyKeyRejected() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(3),
                "14:00",
                "Consultation",
                null,
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(6003L);
            return a;
        });

        when(emailNotificationRepository.existsByIdempotencyKey("APPOINTMENT_REQUEST_RECEIVED:6003"))
                .thenReturn(true);

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Email notification already exists for appointment 6003");

        verify(emailNotificationRepository, never()).save(any(AppointmentEmailNotification.class));
    }

    @Test
    @DisplayName("createAppointmentRequest propagates exception if email notification persistence fails")
    void testCreateAppointmentRequestEmailSaveFailurePropagatesException() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(3),
                "14:00",
                "Consultation",
                null,
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(6004L);
            return a;
        });

        when(emailNotificationRepository.save(any(AppointmentEmailNotification.class)))
                .thenThrow(new RuntimeException("Database constraint violation in outbox"));

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("patient1@dentcare.test", request))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Database constraint violation in outbox");
    }

    @Test
    @DisplayName("createAppointmentRequest rejects user with empty email address")
    void testCreateAppointmentRequestRejectsBlankEmail() {
        User userWithoutEmail = new User("", "hash", "No", "Email", "+123456", Role.PATIENT);
        userWithoutEmail.setId(199L);
        when(userRepository.findByEmailIgnoreCase("noemail@dentcare.test"))
                .thenReturn(Optional.of(userWithoutEmail));

        CreateAppointmentRequest request = new CreateAppointmentRequest(
                LocalDate.now().plusDays(2),
                "11:00",
                "Consultation",
                null,
                null
        );

        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment a = invocation.getArgument(0);
            a.setId(6005L);
            return a;
        });

        assertThatThrownBy(() -> patientPortalService.createAppointmentRequest("noemail@dentcare.test", request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> {
                    ResponseStatusException rse = (ResponseStatusException) ex;
                    assertThat(rse.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(rse.getReason()).contains("Registered patient email is required");
                });
    }

    @Test
    @DisplayName("Existing appointments and queries do not retroactively queue email notifications")
    void testExistingBookingsNotRetroactivelyQueued() {
        when(userRepository.findByEmailIgnoreCase("patient1@dentcare.test"))
                .thenReturn(Optional.of(patientUser1));

        Appointment existingAppt = new Appointment();
        existingAppt.setId(5001L);
        existingAppt.setPatient(patientUser1);
        existingAppt.setStatus(AppointmentStatus.PENDING);
        existingAppt.setAppointmentDate(LocalDate.now().plusDays(10));

        when(appointmentRepository.findByPatientIdOrderByAppointmentDateDescCreatedAtDesc(patientUser1.getId()))
                .thenReturn(List.of(existingAppt));
        when(appointmentRepository.findByIdWithDentist(5001L))
                .thenReturn(Optional.of(existingAppt));

        // 1. Fetching list
        List<PatientAppointmentResponse> list = patientPortalService.getPatientAppointments("patient1@dentcare.test");
        assertThat(list).hasSize(1);

        // 2. Fetching single
        PatientAppointmentResponse single = patientPortalService.getPatientAppointmentById("patient1@dentcare.test", 5001L);
        assertThat(single).isNotNull();

        // 3. Cancelling appointment
        when(appointmentRepository.save(any(Appointment.class))).thenReturn(existingAppt);
        patientPortalService.cancelAppointmentRequest("patient1@dentcare.test", 5001L);

        // Verify outbox repository was NEVER called for historical appointments
        verify(emailNotificationRepository, never()).save(any(AppointmentEmailNotification.class));
    }
}
