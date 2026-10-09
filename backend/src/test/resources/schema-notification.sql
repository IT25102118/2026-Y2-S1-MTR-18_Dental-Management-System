-- =============================================================================
-- DentCare Dental Management System
-- Test Schema for H2 Database (MODE=MySQL)
-- Notifications / SMS Outbox Module
-- =============================================================================

CREATE TABLE IF NOT EXISTS sms_outbox_notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL,
    appointment_id BIGINT NOT NULL,
    recipient_phone VARCHAR(30) NOT NULL,
    message_body VARCHAR(500) NOT NULL,
    status VARCHAR(30) NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP NULL,
    provider_name VARCHAR(50) NULL,
    provider_message_id VARCHAR(100) NULL,
    last_error_category VARCHAR(50) NULL,
    last_error_message VARCHAR(500) NULL,
    locked_at TIMESTAMP NULL,
    locked_by VARCHAR(100) NULL,
    consent_obtained BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_sms_outbox_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT fk_sms_outbox_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE RESTRICT,
    CONSTRAINT chk_sms_outbox_status CHECK (status IN ('PENDING', 'PROCESSING', 'SUBMITTED', 'DELIVERED', 'FAILED', 'UNCERTAIN', 'SIMULATED', 'CANCELLED')),
    CONSTRAINT chk_sms_outbox_retry_count CHECK (retry_count >= 0),
    CONSTRAINT chk_sms_outbox_max_retries CHECK (max_retries >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sms_outbox_polling ON sms_outbox_notifications (status, next_retry_at, locked_at);
CREATE INDEX IF NOT EXISTS idx_sms_outbox_appointment ON sms_outbox_notifications (appointment_id);
