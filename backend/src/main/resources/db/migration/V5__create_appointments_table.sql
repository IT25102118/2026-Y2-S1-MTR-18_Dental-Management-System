-- Flyway migration V5: Create appointments table for patient booking/request workflow
CREATE TABLE IF NOT EXISTS appointments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    dentist_id BIGINT NULL,
    appointment_date DATE NOT NULL,
    preferred_time VARCHAR(30) NULL,
    reason VARCHAR(255) NOT NULL,
    notes TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_appointments_dentist FOREIGN KEY (dentist_id) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT chk_appointments_status CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
    KEY idx_appointments_patient (patient_id),
    KEY idx_appointments_dentist (dentist_id),
    KEY idx_appointments_date (appointment_date),
    KEY idx_appointments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
