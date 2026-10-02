import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPatientById, updatePatient } from '../api/patientApi';
import '../patient.css';

export default function PatientEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patientCode, setPatientCode] = useState('');
  const [formData, setFormData] = useState({
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

  const [loading, setLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadPatient = useCallback(async () => {
    setLoading(true);
    setGeneralError(null);
    try {
      const data = await getPatientById(id);
      setPatientCode(data.patientCode || '');
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        dateOfBirth: data.dateOfBirth || '',
        gender: data.gender || '',
        email: data.email || '',
        phone: data.phone || '',
        addressLine1: data.addressLine1 || '',
        addressLine2: data.addressLine2 || '',
        city: data.city || '',
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        emergencyContactRelationship: data.emergencyContactRelationship || '',
        allergies: data.allergies || '',
        medicalConditions: data.medicalConditions || '',
        currentMedications: data.currentMedications || '',
        dentalHistory: data.dentalHistory || '',
        notes: data.notes || ''
      });
    } catch (err) {
      setGeneralError(err.message || 'Failed to load patient record for editing.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

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

  const validateClient = () => {
    const errors = {};
    if (!formData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length > 60) {
      errors.firstName = 'First name cannot exceed 60 characters';
    }

    if (!formData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length > 60) {
      errors.lastName = 'Last name cannot exceed 60 characters';
    }

    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const today = new Date().toISOString().split('T')[0];
      if (formData.dateOfBirth > today) {
        errors.dateOfBirth = 'Date of birth cannot be in the future';
      }
    }

    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }

    if (!formData.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (formData.phone.trim().length > 25) {
      errors.phone = 'Phone number cannot exceed 25 characters';
    }

    if (formData.email?.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
        errors.email = 'Email must be a valid email address';
      } else if (formData.email.trim().length > 150) {
        errors.email = 'Email cannot exceed 150 characters';
      }
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);

    const clientErrors = validateClient();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    try {
      await updatePatient(id, formData);
      navigate(`/patients/${id}`, { replace: true });
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      }
      setGeneralError(err.message || 'Failed to update patient record.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="patient-container">
        <div className="loading-state" role="status">
          Loading patient details for editing...
        </div>
      </div>
    );
  }

  return (
    <div className="patient-container">
      <nav className="patient-nav" aria-label="Breadcrumb">
        <Link to={`/patients/${id}`}>← Back to Patient Details</Link>
      </nav>

      <div className="patient-header">
        <div>
          <h1>Edit Patient Profile</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>
            Editing patient code: <strong>{patientCode}</strong> (Code cannot be modified)
          </p>
        </div>
      </div>

      {generalError && (
        <div className="error-alert" role="alert">
          <p>{generalError}</p>
        </div>
      )}

      <form className="patient-form" onSubmit={handleSubmit} noValidate>
        {/* Section 1: Demographics */}
        <section className="form-section">
          <h2>Demographics</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="patientCodeDisplay">Patient Code (Immutable)</label>
              <input
                id="patientCodeDisplay"
                type="text"
                className="form-input"
                value={patientCode}
                disabled
                readOnly
              />
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
                data-testid="edit-first-name-input"
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
                data-testid="edit-last-name-input"
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
                max={new Date().toISOString().split('T')[0]}
                value={formData.dateOfBirth}
                onChange={handleChange}
                disabled={submitting}
                required
                data-testid="edit-dob-input"
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
                data-testid="edit-gender-select"
              >
                <option value="">Select Gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
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
                value={formData.phone}
                onChange={handleChange}
                disabled={submitting}
                required
                data-testid="edit-phone-input"
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
                value={formData.email}
                onChange={handleChange}
                disabled={submitting}
                data-testid="edit-email-input"
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
            </div>

            <div className="form-group">
              <label htmlFor="emergencyContactRelationship">Relationship</label>
              <input
                id="emergencyContactRelationship"
                name="emergencyContactRelationship"
                type="text"
                className="form-input"
                maxLength={50}
                value={formData.emergencyContactRelationship}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Clinical & Medical History */}
        <section className="form-section">
          <h2>Clinical & Medical History</h2>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="allergies">Allergies</label>
              <textarea
                id="allergies"
                name="allergies"
                className="form-textarea"
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
                value={formData.dentalHistory}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                className="form-textarea"
                value={formData.notes}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>
        </section>

        <div className="form-actions">
          <Link to={`/patients/${id}`} className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            data-testid="update-patient-button"
          >
            {submitting ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
