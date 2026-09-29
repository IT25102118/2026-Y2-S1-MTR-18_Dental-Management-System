-- =============================================================================
-- DentCare Dental Management System
-- MF-03: Clinical Examination & Treatment Plan Management
-- Test Schema for H2 Database (MODE=MySQL)
-- Description: Creates clinical_examinations, tooth_findings, treatment_plans,
--              treatment_procedures, and clinical_progress_notes tables for tests.
-- Note: MySQL engine/charset directives are omitted for H2 compatibility.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table 1: clinical_examinations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_examinations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    dentist_id BIGINT NOT NULL,
    recorded_by_user_id BIGINT NOT NULL,
    appointment_id BIGINT NULL,
    examination_date DATE NOT NULL,
    chief_complaint TEXT NOT NULL,
    clinical_observations TEXT NULL,
    provisional_diagnosis VARCHAR(500) NULL,
    confirmed_diagnosis VARCHAR(500) NULL,
    is_diagnosis_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_by_dentist_id BIGINT NULL,
    diagnosis_confirmed_at TIMESTAMP NULL,
    follow_up_date DATE NULL,
    follow_up_notes VARCHAR(500) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_clinical_examinations_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_clinical_examinations_dentist FOREIGN KEY (dentist_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_clinical_examinations_recorded_by FOREIGN KEY (recorded_by_user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_clinical_examinations_confirmed_by FOREIGN KEY (confirmed_by_dentist_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_clinical_examinations_status CHECK (status IN ('DRAFT', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_clinical_examinations_patient ON clinical_examinations (patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_examinations_dentist ON clinical_examinations (dentist_id);
CREATE INDEX IF NOT EXISTS idx_clinical_examinations_date ON clinical_examinations (examination_date);
CREATE INDEX IF NOT EXISTS idx_clinical_examinations_appointment ON clinical_examinations (appointment_id);

-- -----------------------------------------------------------------------------
-- Table 2: tooth_findings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tooth_findings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    examination_id BIGINT NOT NULL,
    tooth_number INT NULL,
    is_general BOOLEAN NOT NULL DEFAULT FALSE,
    condition_name VARCHAR(150) NOT NULL,
    notes VARCHAR(500) NULL,
    recorded_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tooth_findings_exam FOREIGN KEY (examination_id) REFERENCES clinical_examinations (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_tooth_findings_recorded_by FOREIGN KEY (recorded_by_user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_tooth_findings_general_tooth CHECK (
        (is_general = TRUE AND tooth_number IS NULL) OR
        (is_general = FALSE AND tooth_number IS NOT NULL)
    ),
    CONSTRAINT chk_tooth_findings_fdi CHECK (
        tooth_number IS NULL OR (
            (tooth_number BETWEEN 11 AND 18) OR
            (tooth_number BETWEEN 21 AND 28) OR
            (tooth_number BETWEEN 31 AND 38) OR
            (tooth_number BETWEEN 41 AND 48) OR
            (tooth_number BETWEEN 51 AND 55) OR
            (tooth_number BETWEEN 61 AND 65) OR
            (tooth_number BETWEEN 71 AND 75) OR
            (tooth_number BETWEEN 81 AND 85)
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_tooth_findings_exam ON tooth_findings (examination_id);
CREATE INDEX IF NOT EXISTS idx_tooth_findings_tooth ON tooth_findings (tooth_number);

-- -----------------------------------------------------------------------------
-- Table 3: treatment_plans
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS treatment_plans (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    dentist_id BIGINT NOT NULL,
    examination_id BIGINT NULL,
    created_by_user_id BIGINT NOT NULL,
    plan_name VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
    total_estimated_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_actual_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    approved_by_dentist_id BIGINT NULL,
    approved_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancellation_reason VARCHAR(255) NULL,
    clinical_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT fk_treatment_plans_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_treatment_plans_dentist FOREIGN KEY (dentist_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_treatment_plans_exam FOREIGN KEY (examination_id) REFERENCES clinical_examinations (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_treatment_plans_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_treatment_plans_approved_by FOREIGN KEY (approved_by_dentist_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_treatment_plans_status CHECK (status IN ('PROPOSED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_treatment_plans_est_cost CHECK (total_estimated_cost >= 0.00),
    CONSTRAINT chk_treatment_plans_act_cost CHECK (total_actual_cost >= 0.00)
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient ON treatment_plans (patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_dentist ON treatment_plans (dentist_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON treatment_plans (status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_exam ON treatment_plans (examination_id);

-- -----------------------------------------------------------------------------
-- Table 4: treatment_procedures
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS treatment_procedures (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    treatment_plan_id BIGINT NOT NULL,
    tooth_number INT NULL,
    procedure_name VARCHAR(150) NOT NULL,
    procedure_code VARCHAR(50) NULL,
    sequence_number INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    estimated_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    actual_cost DECIMAL(12, 2) NULL,
    completion_date DATE NULL,
    performed_by_dentist_id BIGINT NULL,
    assisted_by_user_id BIGINT NULL,
    clinical_progress_notes TEXT NULL,
    cancellation_reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_treatment_procedures_plan FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_treatment_procedures_performed_by FOREIGN KEY (performed_by_dentist_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_treatment_procedures_assisted_by FOREIGN KEY (assisted_by_user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_treatment_procedures_status CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT chk_treatment_procedures_est_cost CHECK (estimated_cost >= 0.00),
    CONSTRAINT chk_treatment_procedures_act_cost CHECK (actual_cost IS NULL OR actual_cost >= 0.00),
    CONSTRAINT chk_treatment_procedures_completion CHECK (status != 'COMPLETED' OR completion_date IS NOT NULL),
    CONSTRAINT chk_treatment_procedures_fdi CHECK (
        tooth_number IS NULL OR (
            (tooth_number BETWEEN 11 AND 18) OR
            (tooth_number BETWEEN 21 AND 28) OR
            (tooth_number BETWEEN 31 AND 38) OR
            (tooth_number BETWEEN 41 AND 48) OR
            (tooth_number BETWEEN 51 AND 55) OR
            (tooth_number BETWEEN 61 AND 65) OR
            (tooth_number BETWEEN 71 AND 75) OR
            (tooth_number BETWEEN 81 AND 85)
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_treatment_procedures_plan ON treatment_procedures (treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_treatment_procedures_status ON treatment_procedures (status);
CREATE INDEX IF NOT EXISTS idx_treatment_procedures_tooth ON treatment_procedures (tooth_number);

-- -----------------------------------------------------------------------------
-- Table 5: clinical_progress_notes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_progress_notes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    treatment_plan_id BIGINT NOT NULL,
    treatment_procedure_id BIGINT NULL,
    author_user_id BIGINT NOT NULL,
    note_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note_content TEXT NOT NULL,
    follow_up_date DATE NULL,
    CONSTRAINT fk_progress_notes_plan FOREIGN KEY (treatment_plan_id) REFERENCES treatment_plans (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_progress_notes_procedure FOREIGN KEY (treatment_procedure_id) REFERENCES treatment_procedures (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_progress_notes_author FOREIGN KEY (author_user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_progress_notes_plan ON clinical_progress_notes (treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_procedure ON clinical_progress_notes (treatment_procedure_id);
