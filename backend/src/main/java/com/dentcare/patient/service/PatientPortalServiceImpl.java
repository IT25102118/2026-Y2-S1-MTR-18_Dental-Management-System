package com.dentcare.patient.service;

import com.dentcare.appointment.dto.CreateAppointmentRequest;
import com.dentcare.appointment.dto.PatientAppointmentResponse;
import com.dentcare.appointment.entity.Appointment;
import com.dentcare.appointment.entity.AppointmentStatus;
import com.dentcare.appointment.repository.AppointmentRepository;
import com.dentcare.patient.dto.PatientDashboardSummaryResponse;
import com.dentcare.patient.dto.PatientPrescriptionItemResponse;
import com.dentcare.patient.entity.Patient;
import com.dentcare.patient.repository.PatientRepository;
import com.dentcare.prescription.entity.Prescription;
import com.dentcare.prescription.entity.PrescriptionStatus;
import com.dentcare.prescription.repository.PrescriptionRepository;
import com.dentcare.security.entity.User;
import com.dentcare.security.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * Implementation of PatientPortalService enforcing strict session-derived ownership.
 * Guarantees that patient users can only access their own clinical records and prescriptions.
 */
@Service
@Transactional(readOnly = true)
public class PatientPortalServiceImpl implements PatientPortalService {

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final com.dentcare.appointment.repository.AppointmentRepository appointmentRepository;

    public PatientPortalServiceImpl(
            UserRepository userRepository,
            PatientRepository patientRepository,
            PrescriptionRepository prescriptionRepository,
            com.dentcare.appointment.repository.AppointmentRepository appointmentRepository
    ) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Override
    public PatientDashboardSummaryResponse getDashboardSummary(String authenticatedEmail) {
        User user = resolveAuthenticatedUser(authenticatedEmail);
        Patient patient = null;
        try {
            patient = patientRepository.findByUserId(user.getId()).orElse(null);
        } catch (Exception ex) {
            patient = null;
        }

        long totalPrescriptions = 0;
        long activePrescriptions = 0;
        List<PatientPrescriptionItemResponse> recentPrescriptions = List.of();
        try {
            Page<Prescription> prescriptionPage = prescriptionRepository
                    .findByPatientIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 5));
            totalPrescriptions = prescriptionPage.getTotalElements();

            activePrescriptions = prescriptionRepository
                    .findByPatientIdAndStatusOrderByCreatedAtDesc(user.getId(), PrescriptionStatus.FINALIZED, PageRequest.of(0, 1))
                    .getTotalElements();

            recentPrescriptions = prescriptionPage.getContent().stream()
                    .map(this::mapToPrescriptionResponse)
                    .toList();
        } catch (Exception ex) {
            // Prescriptions table empty or unmigrated; default to empty list
        }

        PatientDashboardSummaryResponse.PatientProfileSummary profileSummary =
                new PatientDashboardSummaryResponse.PatientProfileSummary(
                        user.getId(),
                        user.getFirstName(),
                        user.getLastName(),
                        user.getEmail(),
                        user.getPhone(),
                        user.getRole().name(),
                        user.isActive(),
                        user.getCreatedAt(),
                        patient != null ? patient.getPatientCode() : null,
                        patient != null,
                        patient != null && patient.getGender() != null ? patient.getGender().name() : null,
                        patient != null ? patient.getDateOfBirth() : null
                );

        PatientDashboardSummaryResponse.ClinicalStatus clinicalStatus =
                new PatientDashboardSummaryResponse.ClinicalStatus(
                        patient != null,
                        patient != null ? patient.getPatientCode() : null,
                        patient != null ? "COMPLETED" : "PENDING_CLINICAL_INTAKE",
                        patient != null
                                ? "Your clinical patient record is active at DentCare."
                                : "Your patient account is active. Clinical demographic intake will be completed during your initial clinic visit."
                );

        PatientDashboardSummaryResponse.PrescriptionsSummary prescriptionsSummary =
                new PatientDashboardSummaryResponse.PrescriptionsSummary(
                        totalPrescriptions,
                        activePrescriptions,
                        recentPrescriptions
                );

        List<PatientDashboardSummaryResponse.PortalFeatureResponse> features = List.of(
                new PatientDashboardSummaryResponse.PortalFeatureResponse(
                        "profile",
                        "My Profile",
                        "Review and manage your contact details and account security",
                        "/account",
                        "AVAILABLE"
                ),
                new PatientDashboardSummaryResponse.PortalFeatureResponse(
                        "prescriptions",
                        "My Prescriptions",
                        "Access medications and verified prescriptions issued by your dentist",
                        "/patient/dashboard",
                        "AVAILABLE"
                ),
                new PatientDashboardSummaryResponse.PortalFeatureResponse(
                        "appointments",
                        "Appointments",
                        "Online visit scheduling and reminders",
                        "/patient/appointments",
                        "AVAILABLE"
                ),
                new PatientDashboardSummaryResponse.PortalFeatureResponse(
                        "billing",
                        "Invoices & Payments",
                        "Direct patient digital statements and payment records",
                        null,
                        "COMING_SOON"
                )
        );

        return new PatientDashboardSummaryResponse(
                profileSummary,
                clinicalStatus,
                prescriptionsSummary,
                features
        );
    }

    @Override
    public List<PatientPrescriptionItemResponse> getPatientPrescriptions(String authenticatedEmail) {
        User user = resolveAuthenticatedUser(authenticatedEmail);
        try {
            Page<Prescription> page = prescriptionRepository
                    .findByPatientIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(0, 50));
            return page.getContent().stream()
                    .map(this::mapToPrescriptionResponse)
                    .toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    @Override
    public PatientPrescriptionItemResponse getPatientPrescriptionById(String authenticatedEmail, Long prescriptionId) {
        if (prescriptionId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prescription ID is required");
        }

        User user = resolveAuthenticatedUser(authenticatedEmail);
        Prescription prescription = prescriptionRepository.findByIdWithItems(prescriptionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prescription not found"));

        // Critical Data Isolation Check: Must match authenticated user
        if (prescription.getPatient() == null || !user.getId().equals(prescription.getPatient().getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied: prescription does not belong to the authenticated patient"
            );
        }

        return mapToPrescriptionResponse(prescription);
    }

    private User resolveAuthenticatedUser(String authenticatedEmail) {
        if (authenticatedEmail == null || authenticatedEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userRepository.findByEmailIgnoreCase(authenticatedEmail.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User account not found"));
    }

    private PatientPrescriptionItemResponse mapToPrescriptionResponse(Prescription prescription) {
        String dentistName = prescription.getDentist() != null
                ? "Dr. " + prescription.getDentist().getFirstName() + " " + prescription.getDentist().getLastName()
                : "DentCare Clinical Team";

        List<PatientPrescriptionItemResponse.PatientPrescriptionItemDetail> items = new ArrayList<>();
        if (prescription.getItems() != null) {
            items = prescription.getItems().stream()
                    .map(item -> new PatientPrescriptionItemResponse.PatientPrescriptionItemDetail(
                            item.getId(),
                            item.getMedicineName(),
                            item.getDosage(),
                            item.getFrequency(),
                            item.getDuration(),
                            item.getInstructions()
                    ))
                    .toList();
        }

        return new PatientPrescriptionItemResponse(
                prescription.getId(),
                prescription.getStatus() != null ? prescription.getStatus().name() : "DRAFT",
                dentistName,
                prescription.getNotes(),
                prescription.getCreatedAt(),
                prescription.getFinalizedAt(),
                items
        );
    }

    @Override
    @Transactional
    public PatientAppointmentResponse createAppointmentRequest(String authenticatedEmail, CreateAppointmentRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment request body is required");
        }
        if (request.appointmentDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment date is required");
        }
        if (request.appointmentDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment date cannot be earlier than today");
        }
        if (request.reason() == null || request.reason().trim().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason for visit is required");
        }

        LocalTime parsedTime = null;
        if (request.preferredTime() != null && !request.preferredTime().isBlank()) {
            try {
                parsedTime = LocalTime.parse(request.preferredTime().trim(), TIME_FORMATTER);
            } catch (DateTimeParseException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preferred time must be in HH:mm 24-hour format");
            }
        }

        if (parsedTime != null && request.appointmentDate().isEqual(LocalDate.now())) {
            if (parsedTime.isBefore(LocalTime.now())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment time cannot be earlier than current time today");
            }
        }

        User patient = resolveAuthenticatedUser(authenticatedEmail);

        Appointment appointment = new Appointment(
                patient,
                request.appointmentDate(),
                parsedTime != null ? parsedTime.format(TIME_FORMATTER) : null,
                request.reason().trim(),
                request.notes() != null && !request.notes().isBlank() ? request.notes().trim() : null
        );
        appointment.setStatus(AppointmentStatus.PENDING);

        Appointment saved = appointmentRepository.save(appointment);
        return mapToAppointmentResponse(saved);
    }

    @Override
    public List<PatientAppointmentResponse> getPatientAppointments(String authenticatedEmail) {
        User user = resolveAuthenticatedUser(authenticatedEmail);
        try {
            List<Appointment> list = appointmentRepository
                    .findByPatientIdOrderByAppointmentDateDescCreatedAtDesc(user.getId());
            return list.stream()
                    .map(this::mapToAppointmentResponse)
                    .toList();
        } catch (Exception ex) {
            return List.of();
        }
    }

    @Override
    public PatientAppointmentResponse getPatientAppointmentById(String authenticatedEmail, Long appointmentId) {
        if (appointmentId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Appointment ID is required");
        }
        User user = resolveAuthenticatedUser(authenticatedEmail);
        Appointment appointment = appointmentRepository.findByIdWithDentist(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        if (appointment.getPatient() == null || !user.getId().equals(appointment.getPatient().getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Access denied: appointment does not belong to the authenticated patient"
            );
        }
        return mapToAppointmentResponse(appointment);
    }

    private PatientAppointmentResponse mapToAppointmentResponse(Appointment appointment) {
        String dentistName = appointment.getDentist() != null
                ? "Dr. " + appointment.getDentist().getFirstName() + " " + appointment.getDentist().getLastName()
                : null;
        String statusDesc;
        if (appointment.getStatus() == AppointmentStatus.PENDING) {
            statusDesc = "Pending confirmation";
        } else if (appointment.getStatus() == AppointmentStatus.CONFIRMED) {
            statusDesc = "Confirmed";
        } else if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            statusDesc = "Cancelled";
        } else {
            statusDesc = appointment.getStatus() != null ? appointment.getStatus().name() : "PENDING";
        }

        return new PatientAppointmentResponse(
                appointment.getId(),
                appointment.getAppointmentDate(),
                appointment.getPreferredTime(),
                appointment.getReason(),
                appointment.getNotes(),
                appointment.getStatus() != null ? appointment.getStatus().name() : "PENDING",
                statusDesc,
                dentistName,
                appointment.getCreatedAt()
        );
    }
}
