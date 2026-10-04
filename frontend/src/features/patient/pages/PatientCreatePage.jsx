import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPatient } from '../api/patientApi';
import { validatePatientForm } from '../patientValidation';
import '../patient.css';

export default function PatientCreatePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    patientCode: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    allergies: '',
    medicalConditions: '',
    currentMedications: '',
    dentalHistory: '',
    notes: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);

    const clientErrors = validatePatientForm(formData, true);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      const created = await createPatient(formData);
      navigate(`/patients/${created.id}`, { replace: true });
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      setGeneralError(err.message || 'Failed to create patient record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="patient-container">
      <nav className="patient-nav" aria-label="Breadcrumb">
        <Link to="/patients">← Back to Patients</Link>
      </nav>

      <div className="patient-header">
        <h1>Register New Patient</h1>
      </div>

      {generalError && (
        <div className="error-alert" role="alert">
          <p>{generalError}</p>
        </div>
      )}

      <form className="patient-form" onSubmit={handleSubmit} noValidate>
        {/* Section 1: Identification & Demographics */}
        <section className="form-section">
          <h2>Demographics & Identification</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="patientCode">
                Patient Code <span className="required">*</span>
              </label>
              <input
                id="patientCode"
                name="patientCode"
                type="text"
                className="form-input"
                maxLength={30}
                placeholder="e.g. PAT-2026-001"
                value={formData.patientCode}
                onChange={handleChange}
                disabled={submitting}
                required
                data-testid="patient-code-input"
              />
              {fieldErrors.patientCode && (
                <span className="field-error" data-testid="error-patientCode">
                  {fieldErrors.patientCode}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="firstName">
                First Name <span className="required">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                className="form-input"
                maxLength={60}
                value={formData.firstName}
                onChange={handleChange}
                disabled={submitting}
                required
                data-testid="first-name-input"
              />
              {fieldErrors.firstName && (
                <span className="field-error" data-testid="error-firstName">
                  {fieldErrors.firstName}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">
                Last Name <span className="required">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                className="form-input"
                maxLength={60}
                value={formData.lastName}
                onChange={handleChange}
                disabled={submitting}
                required
                data-testid="last-name-input"
              />
              {fieldErrors.lastName && (
                <span className="field-error" data-testid="error-lastName">
                  {fieldErrors.lastName}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="dateOfBirth">
                Date of Birth <span className="required">*</span>
              </label>
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                className="form-input"
                max={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                value={formData.dateOfBirth}
                onChange={handleChange}
                disabled={submitting}
                required
                data-testid="dob-input"
              />
              {fieldErrors.dateOfBirth && (
                <span className="field-error" data-testid="error-dateOfBirth">
                  {fieldErrors.dateOfBirth}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="gender">
                Gender <span className="required">*</span>
              </label>
              <select
                id="gender"
                name="gender"
                className="form-select"
                value={formData.gender}
                onChange={handleChange}
                disabled={submitting}
                required
                data-testid="gender-select"
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
              {fieldErrors.gender && (
                <span className="field-error" data-testid="error-gender">
                  {fieldErrors.gender}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Contact Information */}
        <section className="form-section">
          <h2>Contact Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="phone">
                Phone Number <span className="required">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                className="form-input"
                maxLength={25}
                placeholder="e.g. +1 555-0100"
                value={formData.phone}
                onChange={handleChange}
                disabled={submitting}
                required
                data-testid="phone-input"
              />
              {fieldErrors.phone && (
                <span className="field-error" data-testid="error-phone">
                  {fieldErrors.phone}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-input"
                maxLength={150}
                placeholder="patient@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
                data-testid="email-input"
              />
              {fieldErrors.email && (
                <span className="field-error" data-testid="error-email">
                  {fieldErrors.email}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="addressLine1">Address Line 1</label>
              <input
                id="addressLine1"
                name="addressLine1"
                type="text"
                className="form-input"
                maxLength={150}
                value={formData.addressLine1}
                onChange={handleChange}
                disabled={submitting}
              />
              {fieldErrors.addressLine1 && (
                <span className="field-error">{fieldErrors.addressLine1}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="addressLine2">Address Line 2</label>
              <input
                id="addressLine2"
                name="addressLine2"
                type="text"
                className="form-input"
                maxLength={150}
                value={formData.addressLine2}
                onChange={handleChange}
                disabled={submitting}
              />
              {fieldErrors.addressLine2 && <span className="field-error">{fieldErrors.addressLine2}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="city">City</label>
              <input
                id="city"
                name="city"
                type="text"
                className="form-input"
                maxLength={100}
                value={formData.city}
                onChange={handleChange}
                disabled={submitting}
              />
              {fieldErrors.city && <span className="field-error">{fieldErrors.city}</span>}
            </div>
          </div>
        </section>

        {/* Section 3: Emergency Contact */}
        <section className="form-section">
          <h2>Emergency Contact</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="emergencyContactName">Contact Name</label>
              <input
                id="emergencyContactName"
                name="emergencyContactName"
                type="text"
                className="form-input"
                maxLength={120}
                value={formData.emergencyContactName}
                onChange={handleChange}
                disabled={submitting}
              />
              {fieldErrors.emergencyContactName && <span className="field-error">{fieldErrors.emergencyContactName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContactPhone">Contact Phone</label>
              <input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                type="tel"
                className="form-input"
                maxLength={25}
                value={formData.emergencyContactPhone}
                onChange={handleChange}
                disabled={submitting}
              />
              {fieldErrors.emergencyContactPhone && <span className="field-error">{fieldErrors.emergencyContactPhone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContactRelationship">Relationship</label>
              <input
                id="emergencyContactRelationship"
                name="emergencyContactRelationship"
                type="text"
                className="form-input"
                maxLength={50}
                placeholder="e.g. Spouse, Parent, Guardian"
                value={formData.emergencyContactRelationship}
                onChange={handleChange}
                disabled={submitting}
              />
              {fieldErrors.emergencyContactRelationship && <span className="field-error">{fieldErrors.emergencyContactRelationship}</span>}
            </div>
          </div>
        </section>

        {/* Section 4: Clinical & Medical History */}
        <section className="form-section">
          <h2>Medical & Dental Information</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="allergies">Allergies</label>
              <textarea
                id="allergies"
                name="allergies"
                className="form-textarea"
                placeholder="Known drug or environmental allergies..."
                value={formData.allergies}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="medicalConditions">Medical Conditions</label>
              <textarea
                id="medicalConditions"
                name="medicalConditions"
                className="form-textarea"
                placeholder="Systemic conditions (diabetes, hypertension, etc.)..."
                value={formData.medicalConditions}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="currentMedications">Current Medications</label>
              <textarea
                id="currentMedications"
                name="currentMedications"
                className="form-textarea"
                placeholder="List current prescription or OTC medications..."
                value={formData.currentMedications}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dentalHistory">Dental History</label>
              <textarea
                id="dentalHistory"
                name="dentalHistory"
                className="form-textarea"
                placeholder="Past dental procedures or history..."
                value={formData.dentalHistory}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

          </div>
        </section>

        <section className="form-section">
          <h2>Notes</h2>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                className="form-textarea"
                placeholder="Additional administrative or clinical notes..."
                value={formData.notes}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>
        </section>

        <div className="form-actions">
          <Link to="/patients" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            data-testid="save-patient-button"
          >
            {submitting ? 'Saving...' : 'Save Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
