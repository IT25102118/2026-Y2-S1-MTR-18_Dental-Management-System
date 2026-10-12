ALTER TABLE prescriptions
    ADD COLUMN examination_id BIGINT NULL;

CREATE INDEX idx_prescriptions_examination_id
    ON prescriptions (examination_id);