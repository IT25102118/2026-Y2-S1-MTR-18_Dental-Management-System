-- Flyway migration V11: Add processing lease and retry budget fields to appointment_email_outbox
ALTER TABLE appointment_email_outbox
    ADD COLUMN locked_at TIMESTAMP NULL,
    ADD COLUMN locked_by VARCHAR(128) NULL,
    ADD COLUMN lease_until TIMESTAMP NULL,
    ADD COLUMN max_attempts INT NOT NULL DEFAULT 3;

ALTER TABLE appointment_email_outbox
    ADD CONSTRAINT chk_appointment_email_max_attempts CHECK (max_attempts >= 1);

CREATE INDEX idx_appointment_email_lease ON appointment_email_outbox (status, lease_until);
