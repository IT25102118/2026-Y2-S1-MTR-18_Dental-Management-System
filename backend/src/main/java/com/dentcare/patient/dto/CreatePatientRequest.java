package com.dentcare.patient.dto;

import com.dentcare.patient.entity.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Request payload for creating a new authoritative patient record.
 * Requires an explicit patient code; code generation and account linking are outside this contract.
 */
public class CreatePatientRequest {

    @NotBlank(message = "Patient code is required")
    @Size(max = 30, message = "Patient code cannot exceed 30 characters")
    private String patientCode;

    @NotBlank(message = "First name is required")
    @Size(max = 60, message = "First name cannot exceed 60 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 60, message = "Last name cannot exceed 60 characters")
    private String lastName;

    @NotNull(message = "Date of birth is required")
    @PastOrPresent(message = "Date of birth cannot be in the future")
    private LocalDate dateOfBirth;

    @NotNull(message = "Gender is required")
    private Gender gender;

    @Email(message = "Email must be a valid email address")
    @Size(max = 150, message = "Email cannot exceed 150 characters")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Size(max = 25, message = "Phone number cannot exceed 25 characters")
    private String phone;

    @Size(max = 150, message = "Address line 1 cannot exceed 150 characters")
    private String addressLine1;

    @Size(max = 150, message = "Address line 2 cannot exceed 150 characters")
    private String addressLine2;

    @Size(max = 100, message = "City cannot exceed 100 characters")
    private String city;

    @Size(max = 120, message = "Emergency contact name cannot exceed 120 characters")
    private String emergencyContactName;

    @Size(max = 25, message = "Emergency contact phone cannot exceed 25 characters")
    private String emergencyContactPhone;

    @Size(max = 50, message = "Emergency contact relationship cannot exceed 50 characters")
    private String emergencyContactRelationship;

    private String allergies;

    private String medicalConditions;

    private String currentMedications;

    private String dentalHistory;

    private String notes;

    public CreatePatientRequest() {
    }

    public CreatePatientRequest(String firstName, String lastName, LocalDate dateOfBirth, Gender gender, String phone) {
        this(null, firstName, lastName, dateOfBirth, gender, null, phone, null, null, null, null, null, null, null, null, null, null, null);
    }

    public CreatePatientRequest(String patientCode, String firstName, String lastName, LocalDate dateOfBirth, Gender gender, String phone) {
        this(patientCode, firstName, lastName, dateOfBirth, gender, null, phone, null, null, null, null, null, null, null, null, null, null, null);
    }

    public CreatePatientRequest(String patientCode, String firstName, String lastName,
                                LocalDate dateOfBirth, Gender gender, String email, String phone,
                                String addressLine1, String addressLine2, String city,
                                String emergencyContactName, String emergencyContactPhone,
                                String emergencyContactRelationship, String allergies,
                                String medicalConditions, String currentMedications,
                                String dentalHistory, String notes) {
        this.patientCode = patientCode;
        this.firstName = firstName;
        this.lastName = lastName;
        this.dateOfBirth = dateOfBirth;
        this.gender = gender;
        this.email = email;
        this.phone = phone;
        this.addressLine1 = addressLine1;
        this.addressLine2 = addressLine2;
        this.city = city;
        this.emergencyContactName = emergencyContactName;
        this.emergencyContactPhone = emergencyContactPhone;
        this.emergencyContactRelationship = emergencyContactRelationship;
        this.allergies = allergies;
        this.medicalConditions = medicalConditions;
        this.currentMedications = currentMedications;
        this.dentalHistory = dentalHistory;
        this.notes = notes;
    }

    public String getPatientCode() {
        return patientCode;
    }

    public void setPatientCode(String patientCode) {
        this.patientCode = patientCode;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddressLine1() {
        return addressLine1;
    }

    public void setAddressLine1(String addressLine1) {
        this.addressLine1 = addressLine1;
    }

    public String getAddressLine2() {
        return addressLine2;
    }

    public void setAddressLine2(String addressLine2) {
        this.addressLine2 = addressLine2;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getEmergencyContactName() {
        return emergencyContactName;
    }

    public void setEmergencyContactName(String emergencyContactName) {
        this.emergencyContactName = emergencyContactName;
    }

    public String getEmergencyContactPhone() {
        return emergencyContactPhone;
    }

    public void setEmergencyContactPhone(String emergencyContactPhone) {
        this.emergencyContactPhone = emergencyContactPhone;
    }

    public String getEmergencyContactRelationship() {
        return emergencyContactRelationship;
    }

    public void setEmergencyContactRelationship(String emergencyContactRelationship) {
        this.emergencyContactRelationship = emergencyContactRelationship;
    }

    public String getAllergies() {
        return allergies;
    }

    public void setAllergies(String allergies) {
        this.allergies = allergies;
    }

    public String getMedicalConditions() {
        return medicalConditions;
    }

    public void setMedicalConditions(String medicalConditions) {
        this.medicalConditions = medicalConditions;
    }

    public String getCurrentMedications() {
        return currentMedications;
    }

    public void setCurrentMedications(String currentMedications) {
        this.currentMedications = currentMedications;
    }

    public String getDentalHistory() {
        return dentalHistory;
    }

    public void setDentalHistory(String dentalHistory) {
        this.dentalHistory = dentalHistory;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
