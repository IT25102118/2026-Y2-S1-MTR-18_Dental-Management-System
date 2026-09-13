-- =============================================================================
-- DentCare Dental Management System
-- MF-04: Prescription Management
-- Migration: 001_create_prescription_tables.sql
-- Description: Creates the prescriptions and prescription_items tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: prescriptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    dentist_id BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    replaced_by_prescription_id BIGINT,
    finalized_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES users (id),
    CONSTRAINT fk_prescriptions_dentist FOREIGN KEY (dentist_id) REFERENCES users (id),
    CONSTRAINT fk_prescriptions_replaced FOREIGN KEY (replaced_by_prescription_id) REFERENCES prescriptions (id),
    CONSTRAINT chk_prescriptions_status CHECK (status IN ('DRAFT', 'FINALIZED', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_prescriptions_patient ON prescriptions (patient_id);
CREATE INDEX idx_prescriptions_dentist ON prescriptions (dentist_id);
CREATE INDEX idx_prescriptions_status ON prescriptions (status);

-- -----------------------------------------------------------------------------
-- Table: prescription_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescription_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    prescription_id BIGINT NOT NULL,
    medicine_name VARCHAR(150) NOT NULL,
    strength VARCHAR(100),
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    instructions TEXT,
    CONSTRAINT fk_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions (id) ON DELETE CASCADE,
    CONSTRAINT chk_prescription_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_prescription_items_prescription ON prescription_items (prescription_id);
