-- =============================================================================
-- DentCare Dental Management System
-- Test Schema for H2 Database (MODE=MySQL)
-- Auth Foundation (PR-A)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    phone VARCHAR(25),
    role VARCHAR(30) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMINISTRATOR', 'RECEPTIONIST', 'DENTIST', 'DENTAL_ASSISTANT', 'PATIENT'))
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (active);

CREATE TABLE IF NOT EXISTS phone_verification_challenges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    phone_snapshot VARCHAR(30) NOT NULL,
    otp_mac VARCHAR(128) NOT NULL,
    status VARCHAR(30) NOT NULL,
    delivery_mode VARCHAR(20) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    expires_at TIMESTAMP NOT NULL,
    submitted_at TIMESTAMP NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pvc_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT chk_pvc_status CHECK (status IN ('CREATED', 'SUBMITTED', 'DELIVERY_UNCERTAIN', 'SEND_FAILED', 'VERIFIED', 'EXPIRED', 'EXHAUSTED', 'SUPERSEDED')),
    CONSTRAINT chk_pvc_delivery_mode CHECK (delivery_mode IN ('TEST', 'LIVE')),
    CONSTRAINT chk_pvc_attempt_count CHECK (attempt_count >= 0),
    CONSTRAINT chk_pvc_max_attempts CHECK (max_attempts > 0)
);

CREATE INDEX IF NOT EXISTS idx_pvc_user ON phone_verification_challenges (user_id);
CREATE INDEX IF NOT EXISTS idx_pvc_user_created ON phone_verification_challenges (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pvc_phone_created ON phone_verification_challenges (phone_snapshot, created_at);
CREATE INDEX IF NOT EXISTS idx_pvc_status_expires ON phone_verification_challenges (status, expires_at);

