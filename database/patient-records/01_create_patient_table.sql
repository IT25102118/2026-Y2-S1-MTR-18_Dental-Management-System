-- Patient Records Management: table creation.
-- Open this file in MySQL Workbench and run it before file 02.
-- This matches the application's patients table.
-- The shared users table must already exist (created by the backend).
-- user_id is optional: a patient can have a record without a login account.

USE dentcare_db;

CREATE TABLE IF NOT EXISTS patients (
    -- Patient identity and optional login account.
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_code VARCHAR(30) NOT NULL,
    user_id BIGINT NULL,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,

    -- Contact details.
    email VARCHAR(150) NULL,
    phone VARCHAR(25) NOT NULL,
    address_line1 VARCHAR(150) NULL,
    address_line2 VARCHAR(150) NULL,
    city VARCHAR(100) NULL,

    -- Emergency contact details.
    emergency_contact_name VARCHAR(120) NULL,
    emergency_contact_phone VARCHAR(25) NULL,
    emergency_contact_relationship VARCHAR(50) NULL,

    -- Medical and dental history.
    allergies TEXT NULL,
    medical_conditions TEXT NULL,
    current_medications TEXT NULL,
    dental_history TEXT NULL,
    notes TEXT NULL,

    -- Deactivate a patient to keep their history in the application.
    active BOOLEAN NOT NULL DEFAULT TRUE,
    deactivation_reason VARCHAR(255) NULL,
    deactivated_at TIMESTAMP NULL,

    -- Version is used by the backend to detect conflicting edits.
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Each patient code and linked login account must be unique.
    CONSTRAINT uk_patients_code UNIQUE (patient_code),
    CONSTRAINT uk_patients_user UNIQUE (user_id),
    -- Removing a login account keeps the patient record.
    CONSTRAINT fk_patients_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_patients_gender CHECK (
        gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')
    ),

    -- Indexes speed up patient searches.
    KEY idx_patients_code (patient_code),
    KEY idx_patients_name (last_name, first_name),
    KEY idx_patients_phone (phone),
    KEY idx_patients_active (active),
    KEY idx_patients_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IF NOT EXISTS leaves an existing table unchanged.
-- Display the table's columns after creation.
DESCRIBE patients;
