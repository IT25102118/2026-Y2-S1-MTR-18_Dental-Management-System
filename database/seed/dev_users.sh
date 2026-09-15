#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# DentCare Development Database Seeder
# Seeds standard development users (DENTIST, RECEPTIONIST, PATIENT).
# Source password for all seeded users: Password1!
# BCrypt hash generated with BCryptPasswordEncoder (default strength 10).
# ==============================================================================

DB_NAME="${DB_NAME:-dentcare}"
DB_USER="${DB_USER:-root}"

# Known-good BCrypt hash for password: Password1!
BCRYPT_HASH='$2a$10$spLbGIyx2Dmy5s0Tq3vSxeWNl14yA22DBuD.ZWv0D9zPpBuoYZpR6'

echo "==> Seeding development users into database '${DB_NAME}'..."

MYSQL_CMD=(mysql -u "${DB_USER}")
if [ -n "${DB_PASSWORD:-}" ]; then
    MYSQL_CMD+=("-p${DB_PASSWORD}")
fi

"${MYSQL_CMD[@]}" "${DB_NAME}" << EOF
-- Idempotent clean-up of development users
DELETE FROM users WHERE email IN (
    'dentist@dentcare.local',
    'reception@dentcare.local',
    'patient@dentcare.local'
);

-- Insert development test accounts
INSERT INTO users (email, password_hash, first_name, last_name, phone, role, active)
VALUES
  ('dentist@dentcare.local',   '${BCRYPT_HASH}', 'Sarah', 'Connor', '0771234567', 'DENTIST',      1),
  ('reception@dentcare.local', '${BCRYPT_HASH}', 'John',  'Carter',  '0779876543', 'RECEPTIONIST', 1),
  ('patient@dentcare.local',   '${BCRYPT_HASH}', 'Jane',  'Doe',     NULL,         'PATIENT',      1);
EOF

echo "==> Development users successfully seeded:"
"${MYSQL_CMD[@]}" "${DB_NAME}" -e "SELECT id, email, role, active FROM users WHERE email IN ('dentist@dentcare.local','reception@dentcare.local','patient@dentcare.local');"
echo "==> All development accounts configured with password: Password1!"
