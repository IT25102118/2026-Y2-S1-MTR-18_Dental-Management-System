-- Flyway migration V8: Add phone verification state columns to users table
ALTER TABLE users
    ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN phone_verified_at TIMESTAMP NULL;
