-- Flyway migration V7: Add optional SMS consent capture columns to appointments table
ALTER TABLE appointments
    ADD COLUMN sms_consent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN sms_consent_at TIMESTAMP NULL;
