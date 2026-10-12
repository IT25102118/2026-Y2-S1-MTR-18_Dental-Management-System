import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    createPrescription,
    getPatientSafety,
    getExaminationContext
} from '../api/prescriptionApi';
import { useAuth } from '../../auth/context/AuthContext';
import PrescriptionItemEditor from '../components/PrescriptionItemEditor';
import PrescriptionNav from '../components/PrescriptionNav';
import '../prescription.css';

/**
 * Page for creating a new DRAFT prescription with:
 * - patient / dentist validation
 * - optional Clinical Examination integration
 * - recorded patient-allergy safety information
 */
export default function PrescriptionCreatePage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Logged-in dentist is automatically selected.
    const defaultDentistId =
        user?.role === 'DENTIST' ? String(user.id) : '';

    const [formData, setFormData] = useState({
        examinationId: '',
        patientId: '',
        dentistId: defaultDentistId,
        notes: '',
        items: [
            {
                medicineName: '',
                strength: '',
                dosage: '',
                frequency: '',
                duration: '',
                quantity: 1,
                instructions: ''
            }
        ]
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);

    // Clinical Examination state
    const [examinationContext, setExaminationContext] = useState(null);
    const [examinationLoading, setExaminationLoading] = useState(false);
    const [examinationError, setExaminationError] = useState(null);

    // Patient allergy / safety state
    const [patientSafety, setPatientSafety] = useState(null);
    const [safetyLoading, setSafetyLoading] = useState(false);
    const [safetyError, setSafetyError] = useState(null);

    /**
     * When an optional Clinical Examination ID is entered,
     * read the examination using the Prescription API.
     *
     * The API converts:
     *
     * Clinical patients.id
     *      ->
     * patients.user_id
     *      ->
     * Prescription patient user ID
     */
    useEffect(() => {
        const rawExaminationId =
            String(formData.examinationId || '').trim();

        setExaminationContext(null);
        setExaminationError(null);

        // Examination is optional.
        if (!rawExaminationId) {
            setExaminationLoading(false);
            return undefined;
        }

        const numericExaminationId = Number(rawExaminationId);

        if (
            Number.isNaN(numericExaminationId) ||
            numericExaminationId <= 0
        ) {
            setExaminationLoading(false);
            setExaminationError(
                'Clinical Examination ID must be a positive number.'
            );
            return undefined;
        }

        let active = true;

        const timer = window.setTimeout(async () => {
            setExaminationLoading(true);

            try {
                const data =
                    await getExaminationContext(numericExaminationId);

                if (!active) {
                    return;
                }

                setExaminationContext(data);
                setExaminationError(null);

                /*
                 * Automatically use the PATIENT user ID that belongs
                 * to the selected Clinical Examination.
                 */
                if (data?.patientUserId) {
                    setFormData((prev) => ({
                        ...prev,
                        patientId: String(data.patientUserId)
                    }));

                    setErrors((prev) => ({
                        ...prev,
                        examinationId: null,
                        patientId: null
                    }));
                }
            } catch (err) {
                if (active) {
                    setExaminationContext(null);
                    setExaminationError(
                        err?.message ||
                        'Unable to load Clinical Examination information.'
                    );
                }
            } finally {
                if (active) {
                    setExaminationLoading(false);
                }
            }
        }, 400);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [formData.examinationId]);

    /**
     * Automatically loads recorded allergy information whenever
     * a valid PATIENT user ID is available.
     *
     * This also runs after an Examination automatically selects
     * its linked patient user.
     */
    useEffect(() => {
        const rawPatientId =
            String(formData.patientId || '').trim();

        const numericPatientId = Number(rawPatientId);

        setPatientSafety(null);
        setSafetyError(null);

        if (
            !rawPatientId ||
            Number.isNaN(numericPatientId) ||
            numericPatientId <= 0
        ) {
            setSafetyLoading(false);
            return undefined;
        }

        let active = true;

        const timer = window.setTimeout(async () => {
            setSafetyLoading(true);

            try {
                const data =
                    await getPatientSafety(numericPatientId);

                if (active) {
                    setPatientSafety(data);
                    setSafetyError(null);
                }
            } catch (err) {
                if (active) {
                    setPatientSafety(null);
                    setSafetyError(
                        err?.message ||
                        'Unable to load patient allergy information.'
                    );
                }
            } finally {
                if (active) {
                    setSafetyLoading(false);
                }
            }
        }, 400);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [formData.patientId]);

    const validate = () => {
        const errs = {};

        // Optional Clinical Examination ID validation.
        if (
            formData.examinationId &&
            String(formData.examinationId).trim() !== ''
        ) {
            if (
                Number.isNaN(Number(formData.examinationId)) ||
                Number(formData.examinationId) <= 0
            ) {
                errs.examinationId =
                    'Clinical Examination ID must be a valid positive number.';
            } else if (examinationError || !examinationContext) {
                errs.examinationId =
                    'Enter a valid Clinical Examination ID before saving.';
            }
        }

        // Patient ID validation.
        if (
            !formData.patientId ||
            String(formData.patientId).trim() === ''
        ) {
            errs.patientId = 'Patient ID is required.';
        } else if (
            Number.isNaN(Number(formData.patientId)) ||
            Number(formData.patientId) <= 0
        ) {
            errs.patientId =
                'Patient ID must be a valid positive number.';
        }

        // Dentist ID validation.
        if (
            !formData.dentistId ||
            String(formData.dentistId).trim() === ''
        ) {
            errs.dentistId = 'Dentist ID is required.';
        } else if (
            Number.isNaN(Number(formData.dentistId)) ||
            Number(formData.dentistId) <= 0
        ) {
            errs.dentistId =
                'Dentist ID must be a valid positive number.';
        }

        // Notes validation.
        if (
            formData.notes &&
            formData.notes.length > 2000
        ) {
            errs.notes = 'Notes cannot exceed 2000 characters.';
        }

        // Medicine validation.
        if (
            !formData.items ||
            formData.items.length === 0
        ) {
            errs.items =
                'At least one medicine item is required.';
        } else {
            formData.items.forEach((item, index) => {
                const itemErr = {};

                if (
                    !item.medicineName ||
                    item.medicineName.trim() === ''
                ) {
                    itemErr.medicineName =
                        'Medicine name is required.';
                }

                if (
                    !item.dosage ||
                    item.dosage.trim() === ''
                ) {
                    itemErr.dosage =
                        'Dosage is required.';
                }

                if (
                    !item.frequency ||
                    item.frequency.trim() === ''
                ) {
                    itemErr.frequency =
                        'Frequency is required.';
                }

                if (
                    !item.duration ||
                    item.duration.trim() === ''
                ) {
                    itemErr.duration =
                        'Duration is required.';
                }

                if (
                    item.quantity === undefined ||
                    item.quantity === null ||
                    String(item.quantity).trim() === ''
                ) {
                    itemErr.quantity =
                        'Quantity is required.';
                } else if (
                    Number.isNaN(Number(item.quantity)) ||
                    Number(item.quantity) <= 0
                ) {
                    itemErr.quantity =
                        'Quantity must be greater than zero.';
                }

                if (Object.keys(itemErr).length > 0) {
                    errs[`item_${index}`] = itemErr;
                }
            });
        }

        setErrors(errs);

        return Object.keys(errs).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors((prev) => ({
                ...prev,
                [name]: null
            }));
        }
    };

    const handleItemsChange = (newItems) => {
        setFormData((prev) => ({
            ...prev,
            items: newItems
        }));

        if (errors.items) {
            setErrors((prev) => ({
                ...prev,
                items: null
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setApiError(null);

        if (!validate()) {
            return;
        }

        setSubmitting(true);

        try {
            const request = {
                patientId: Number(formData.patientId),
                dentistId: Number(formData.dentistId),

                /*
                 * Keep old Prescription creation exactly the same
                 * when no examination is selected.
                 */
                ...(formData.examinationId
                    ? {
                        examinationId:
                            Number(formData.examinationId)
                    }
                    : {}),

                notes: formData.notes?.trim() || '',

                items: formData.items.map((item) => ({
                    ...item,
                    quantity: Number(item.quantity)
                }))
            };

            const created =
                await createPrescription(request);

            navigate(`/prescriptions/${created.id}`, {
                state: {
                    message:
                        'Prescription draft created successfully!'
                }
            });
        } catch (err) {
            if (
                err.fieldErrors &&
                Object.keys(err.fieldErrors).length > 0
            ) {
                setErrors((prev) => ({
                    ...prev,
                    ...err.fieldErrors
                }));
            }

            setApiError(
                err.message ||
                'Failed to create prescription. Please verify the patient, dentist and examination information.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="prescription-container">
            <PrescriptionNav />

            {/* Page heading */}
            <div
                className="prescription-header"
                style={{
                    marginBottom: '1.75rem'
                }}
            >
                <div>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            padding: '0.35rem 0.7rem',
                            background: '#eff6ff',
                            color: '#2563eb',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.05em',
                            marginBottom: '0.8rem'
                        }}
                    >
                        NEW PRESCRIPTION
                    </div>

                    <h1
                        style={{
                            marginBottom: '0.35rem'
                        }}
                    >
                        Create New Prescription
                    </h1>

                    <p
                        style={{
                            margin: 0,
                            color: '#64748b',
                            fontSize: '0.92rem'
                        }}
                    >
                        Create a safe medication order for your
                        patient. New prescriptions are saved as a
                        draft first.
                    </p>
                </div>

                <Link
                    to="/prescriptions"
                    className="btn btn-secondary"
                >
                    Cancel
                </Link>
            </div>

            {apiError && (
                <div
                    className="error-alert"
                    role="alert"
                >
                    <strong>
                        Error creating prescription:
                    </strong>

                    <p style={{ margin: 0 }}>
                        {apiError}
                    </p>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                noValidate
            >
                {/* Clinical details */}
                <div
                    className="prescription-card"
                    style={{
                        padding: 0,
                        overflow: 'hidden',
                        border: '1px solid #dbeafe',
                        boxShadow:
                            '0 8px 28px rgba(37, 99, 235, 0.07)'
                    }}
                >
                    <div
                        style={{
                            height: '4px',
                            background:
                                'linear-gradient(90deg, #2563eb, #38bdf8)'
                        }}
                    />

                    <div
                        style={{
                            padding: '1.5rem'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.9rem',
                                paddingBottom: '1rem',
                                marginBottom: '1.35rem',
                                borderBottom:
                                    '1px solid #e2e8f0'
                            }}
                        >
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#dbeafe',
                                    color: '#1d4ed8',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    fontWeight: 800
                                }}
                            >
                                01
                            </div>

                            <div>
                                <h2
                                    style={{
                                        fontSize: '1.2rem',
                                        margin: 0,
                                        color: '#0f172a'
                                    }}
                                >
                                    Clinical Details
                                </h2>

                                <p
                                    style={{
                                        margin: '0.2rem 0 0',
                                        color: '#64748b',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    Optionally link a Clinical
                                    Examination, then review patient
                                    allergy information before
                                    prescribing.
                                </p>
                            </div>
                        </div>

                        {/* Clinical Examination */}
                        <div
                            className="form-group"
                            style={{
                                marginBottom: '1.25rem'
                            }}
                        >
                            <label htmlFor="examinationId">
                                Clinical Examination ID

                                <span
                                    style={{
                                        color: '#94a3b8',
                                        fontWeight: 400,
                                        marginLeft: '0.4rem'
                                    }}
                                >
                                    Optional
                                </span>
                            </label>

                            <input
                                id="examinationId"
                                name="examinationId"
                                type="number"
                                min="1"
                                placeholder="Enter Clinical Examination ID (e.g. 1)"
                                value={formData.examinationId}
                                onChange={handleChange}
                                disabled={submitting}
                                className={
                                    errors.examinationId
                                        ? 'has-error'
                                        : ''
                                }
                            />

                            {errors.examinationId && (
                                <span className="field-error">
                                    {errors.examinationId}
                                </span>
                            )}

                            <span className="form-help">
                                Optional. Enter an existing Clinical
                                Examination ID to link the prescription
                                to the patient's examination.
                            </span>
                        </div>

                        {/* Examination loading */}
                        {examinationLoading && (
                            <div
                                role="status"
                                data-testid="examination-loading"
                                style={{
                                    marginBottom: '1rem',
                                    padding: '0.9rem 1rem',
                                    borderRadius: '10px',
                                    border:
                                        '1px solid #bfdbfe',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    fontSize: '0.86rem'
                                }}
                            >
                                Checking Clinical Examination...
                            </div>
                        )}

                        {/* Examination error */}
                        {!examinationLoading &&
                            examinationError && (
                                <div
                                    role="alert"
                                    data-testid="examination-error"
                                    style={{
                                        marginBottom: '1rem',
                                        padding: '0.95rem 1rem',
                                        borderRadius: '10px',
                                        border:
                                            '1px solid #fecaca',
                                        background: '#fef2f2',
                                        color: '#991b1b'
                                    }}
                                >
                                    <strong>
                                        Clinical Examination
                                        unavailable
                                    </strong>

                                    <div
                                        style={{
                                            marginTop: '0.3rem',
                                            fontSize: '0.84rem'
                                        }}
                                    >
                                        {examinationError}
                                    </div>
                                </div>
                            )}

                        {/* Examination success */}
                        {!examinationLoading &&
                            examinationContext && (
                                <div
                                    role="status"
                                    data-testid="examination-context"
                                    style={{
                                        marginBottom: '1.25rem',
                                        padding: '1rem',
                                        borderRadius: '10px',
                                        border:
                                            '1px solid #93c5fd',
                                        background: '#eff6ff',
                                        color: '#1e3a8a'
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 800,
                                            fontSize: '0.92rem',
                                            marginBottom: '0.55rem'
                                        }}
                                    >
                                        ✓ Clinical Examination Linked
                                    </div>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(auto-fit, minmax(180px, 1fr))',
                                            gap: '0.7rem',
                                            fontSize: '0.84rem'
                                        }}
                                    >
                                        <div>
                                            <strong>
                                                Examination:
                                            </strong>{' '}
                                            #
                                            {
                                                examinationContext.examinationId
                                            }
                                        </div>

                                        <div>
                                            <strong>
                                                Patient:
                                            </strong>{' '}
                                            {
                                                examinationContext.patientName
                                            }
                                        </div>

                                        <div>
                                            <strong>
                                                Patient User ID:
                                            </strong>{' '}
                                            {
                                                examinationContext.patientUserId
                                            }
                                        </div>

                                        <div>
                                            <strong>
                                                Date:
                                            </strong>{' '}
                                            {
                                                examinationContext.examinationDate
                                            }
                                        </div>

                                        <div>
                                            <strong>
                                                Status:
                                            </strong>{' '}
                                            {
                                                examinationContext.examinationStatus
                                            }
                                        </div>
                                    </div>

                                    {examinationContext.clinicalContext && (
                                        <div
                                            style={{
                                                marginTop: '0.8rem',
                                                paddingTop: '0.8rem',
                                                borderTop:
                                                    '1px solid #bfdbfe',
                                                fontSize: '0.84rem',
                                                lineHeight: 1.5
                                            }}
                                        >
                                            <strong>
                                                Clinical context:
                                            </strong>{' '}
                                            {
                                                examinationContext.clinicalContext
                                            }
                                        </div>
                                    )}

                                    <div
                                        style={{
                                            marginTop: '0.65rem',
                                            fontSize: '0.78rem'
                                        }}
                                    >
                                        Patient User ID{' '}
                                        <strong>
                                            {
                                                examinationContext.patientUserId
                                            }
                                        </strong>{' '}
                                        was selected automatically from
                                        this examination.
                                    </div>
                                </div>
                            )}

                        <div className="grid-2">
                            {/* Patient */}
                            <div className="form-group">
                                <label htmlFor="patientId">
                                    Patient ID{' '}
                                    <span
                                        style={{
                                            color: '#dc2626'
                                        }}
                                    >
                                        *
                                    </span>
                                </label>

                                <input
                                    id="patientId"
                                    name="patientId"
                                    type="number"
                                    min="1"
                                    placeholder="Enter patient user ID (e.g. 1)"
                                    value={formData.patientId}
                                    onChange={handleChange}
                                    disabled={submitting}
                                    className={
                                        errors.patientId
                                            ? 'has-error'
                                            : ''
                                    }
                                    required
                                />

                                {errors.patientId && (
                                    <span className="field-error">
                                        {errors.patientId}
                                    </span>
                                )}

                                <span className="form-help">
                                    Must reference a registered user
                                    with PATIENT role.
                                </span>
                            </div>

                            {/* Dentist */}
                            <div className="form-group">
                                <label htmlFor="dentistId">
                                    Prescribing Dentist ID{' '}
                                    <span
                                        style={{
                                            color: '#dc2626'
                                        }}
                                    >
                                        *
                                    </span>
                                </label>

                                <input
                                    id="dentistId"
                                    name="dentistId"
                                    type="number"
                                    min="1"
                                    placeholder="Enter dentist user ID (e.g. 2)"
                                    value={formData.dentistId}
                                    onChange={handleChange}
                                    readOnly={
                                        user?.role === 'DENTIST'
                                    }
                                    disabled={submitting}
                                    className={
                                        errors.dentistId
                                            ? 'has-error'
                                            : ''
                                    }
                                    required
                                />

                                {errors.dentistId && (
                                    <span className="field-error">
                                        {errors.dentistId}
                                    </span>
                                )}

                                {user?.role === 'DENTIST' ? (
                                    <span
                                        className="form-help"
                                        style={{
                                            color: '#15803d',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            fontWeight: 500
                                        }}
                                    >
                                        ✓ Logged-in dentist:{' '}
                                        {user.firstName}{' '}
                                        {user.lastName} — ID{' '}
                                        {user.id}. This field is
                                        read-only.
                                    </span>
                                ) : (
                                    <span className="form-help">
                                        Must reference a registered
                                        user with DENTIST role.
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Automatic allergy safety information */}
                        {safetyLoading && (
                            <div
                                role="status"
                                data-testid="patient-safety-loading"
                                style={{
                                    marginTop: '0.5rem',
                                    padding: '0.85rem 1rem',
                                    borderRadius: '10px',
                                    border:
                                        '1px solid #bfdbfe',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    fontSize: '0.86rem'
                                }}
                            >
                                Checking recorded patient allergy
                                information...
                            </div>
                        )}

                        {!safetyLoading &&
                            safetyError && (
                                <div
                                    role="alert"
                                    data-testid="patient-safety-error"
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '0.9rem 1rem',
                                        borderRadius: '10px',
                                        border:
                                            '1px solid #fecaca',
                                        background: '#fef2f2',
                                        color: '#991b1b'
                                    }}
                                >
                                    <strong>
                                        Patient safety information
                                        unavailable
                                    </strong>

                                    <div
                                        style={{
                                            marginTop: '0.25rem',
                                            fontSize: '0.84rem'
                                        }}
                                    >
                                        {safetyError}
                                    </div>
                                </div>
                            )}

                        {!safetyLoading &&
                            patientSafety &&
                            !patientSafety.medicalProfileAvailable && (
                                <div
                                    role="status"
                                    data-testid="patient-profile-unavailable"
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '0.95rem 1rem',
                                        borderRadius: '10px',
                                        border:
                                            '1px solid #fde68a',
                                        background: '#fffbeb',
                                        color: '#92400e'
                                    }}
                                >
                                    <strong>
                                        ⚠ Medical profile not
                                        available
                                    </strong>

                                    <div
                                        style={{
                                            marginTop: '0.3rem',
                                            fontSize: '0.84rem'
                                        }}
                                    >
                                        Patient:{' '}
                                        <strong>
                                            {
                                                patientSafety.patientName
                                            }
                                        </strong>
                                        . No linked medical profile is
                                        available, so recorded allergy
                                        information cannot be
                                        displayed.
                                    </div>
                                </div>
                            )}

                        {!safetyLoading &&
                            patientSafety?.medicalProfileAvailable &&
                            patientSafety?.hasRecordedAllergies && (
                                <div
                                    role="alert"
                                    data-testid="allergy-warning"
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '1rem',
                                        borderRadius: '10px',
                                        border:
                                            '1px solid #fca5a5',
                                        background: '#fef2f2',
                                        color: '#991b1b',
                                        boxShadow:
                                            '0 4px 14px rgba(220, 38, 38, 0.08)'
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 800,
                                            fontSize: '0.92rem'
                                        }}
                                    >
                                        ⚠ Recorded Allergy Warning
                                    </div>

                                    <div
                                        style={{
                                            marginTop: '0.35rem',
                                            fontSize: '0.85rem',
                                            lineHeight: 1.5
                                        }}
                                    >
                                        Patient:{' '}
                                        <strong>
                                            {
                                                patientSafety.patientName
                                            }
                                        </strong>
                                    </div>

                                    <div
                                        style={{
                                            marginTop: '0.2rem',
                                            fontSize: '0.85rem',
                                            lineHeight: 1.5
                                        }}
                                    >
                                        Recorded allergies:{' '}
                                        <strong>
                                            {
                                                patientSafety.allergies
                                            }
                                        </strong>
                                    </div>

                                    <div
                                        style={{
                                            marginTop: '0.5rem',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        Review the patient's recorded
                                        allergies before prescribing
                                        any medication.
                                    </div>
                                </div>
                            )}

                        {!safetyLoading &&
                            patientSafety?.medicalProfileAvailable &&
                            !patientSafety?.hasRecordedAllergies && (
                                <div
                                    role="status"
                                    data-testid="no-recorded-allergies"
                                    style={{
                                        marginTop: '0.5rem',
                                        padding: '0.9rem 1rem',
                                        borderRadius: '10px',
                                        border:
                                            '1px solid #bbf7d0',
                                        background: '#f0fdf4',
                                        color: '#166534'
                                    }}
                                >
                                    <strong>
                                        ✓ No recorded allergies
                                    </strong>

                                    <div
                                        style={{
                                            marginTop: '0.25rem',
                                            fontSize: '0.84rem'
                                        }}
                                    >
                                        Patient:{' '}
                                        <strong>
                                            {
                                                patientSafety.patientName
                                            }
                                        </strong>
                                        . No allergies are currently
                                        recorded in the patient's
                                        medical profile.
                                    </div>
                                </div>
                            )}

                        {/* Notes */}
                        <div
                            className="form-group"
                            style={{
                                marginBottom: 0,
                                marginTop: '1.25rem'
                            }}
                        >
                            <label htmlFor="notes">
                                Prescription Notes / Clinical Notes

                                <span
                                    style={{
                                        color: '#94a3b8',
                                        fontWeight: 400,
                                        marginLeft: '0.4rem'
                                    }}
                                >
                                    Optional
                                </span>
                            </label>

                            <textarea
                                id="notes"
                                name="notes"
                                rows={4}
                                placeholder="e.g. Post-extraction pain management, medication plan, relevant clinical information..."
                                value={formData.notes}
                                onChange={handleChange}
                                disabled={submitting}
                                className={
                                    errors.notes
                                        ? 'has-error'
                                        : ''
                                }
                                style={{
                                    resize: 'vertical',
                                    minHeight: '105px'
                                }}
                            />

                            {errors.notes && (
                                <span className="field-error">
                                    {errors.notes}
                                </span>
                            )}

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent:
                                        'space-between',
                                    gap: '1rem',
                                    flexWrap: 'wrap'
                                }}
                            >
                                <span className="form-help">
                                    Add relevant clinical information
                                    for this prescription if required.
                                </span>

                                <span className="form-help">
                                    {formData.notes.length} / 2000
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Medication section */}
                <div
                    className="prescription-card"
                    style={{
                        padding: 0,
                        overflow: 'hidden',
                        border: '1px solid #ccfbf1',
                        boxShadow:
                            '0 8px 28px rgba(13, 148, 136, 0.07)'
                    }}
                >
                    <div
                        style={{
                            height: '4px',
                            background:
                                'linear-gradient(90deg, #0d9488, #22c55e)'
                        }}
                    />

                    <div
                        style={{
                            padding: '1.5rem'
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.9rem',
                                marginBottom: '1rem'
                            }}
                        >
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#ccfbf1',
                                    color: '#0f766e',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    fontWeight: 800
                                }}
                            >
                                02
                            </div>

                            <div>
                                <h2
                                    style={{
                                        fontSize: '1.2rem',
                                        margin: 0,
                                        color: '#0f172a'
                                    }}
                                >
                                    Medication Order
                                </h2>

                                <p
                                    style={{
                                        margin: '0.2rem 0 0',
                                        color: '#64748b',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    Enter medicine, dosage,
                                    frequency, duration and quantity.
                                </p>
                            </div>
                        </div>

                        <PrescriptionItemEditor
                            items={formData.items}
                            onChange={handleItemsChange}
                            errors={errors}
                            disabled={submitting}
                        />
                    </div>
                </div>

                {/* Bottom action area */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                        marginTop: '1.5rem',
                        padding: '1rem 1.25rem',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        boxShadow:
                            '0 6px 20px rgba(15, 23, 42, 0.05)'
                    }}
                >
                    <div>
                        <strong
                            style={{
                                display: 'block',
                                color: '#0f172a',
                                fontSize: '0.9rem'
                            }}
                        >
                            Ready to save?
                        </strong>

                        <span
                            style={{
                                color: '#64748b',
                                fontSize: '0.76rem'
                            }}
                        >
                            The prescription will be saved as a
                            DRAFT and can be edited before
                            finalization.
                        </span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: '0.75rem',
                            alignItems: 'center'
                        }}
                    >
                        <Link
                            to="/prescriptions"
                            className="btn btn-secondary"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            id="btn-save-draft"
                            disabled={
                                submitting ||
                                examinationLoading
                            }
                            style={{
                                minWidth: '145px',
                                boxShadow:
                                    '0 5px 14px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            {submitting
                                ? 'Saving Draft...'
                                : 'Save as Draft'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}