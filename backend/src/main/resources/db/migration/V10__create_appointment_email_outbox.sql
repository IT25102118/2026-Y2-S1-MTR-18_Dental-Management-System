-- Flyway migration V10: Create appointment_email_outbox table for resilient transactional email dispatch
CREATE TABLE appointment_email_outbox (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL,
    recipient_email VARCHAR(150) NOT NULL,
    email_subject VARCHAR(255) NOT NULL,
    email_body TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    attempt_count INT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    last_error VARCHAR(500) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_appointment_email_idempotency_key UNIQUE (idempotency_key),
    CONSTRAINT fk_appointment_email_appointment FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE RESTRICT,
    CONSTRAINT chk_appointment_email_status CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DELIVERY_UNCERTAIN')),
    CONSTRAINT chk_appointment_email_attempt_count CHECK (attempt_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_appointment_email_polling ON appointment_email_outbox (status, next_retry_at);
CREATE INDEX idx_appointment_email_appointment ON appointment_email_outbox (appointment_id);
