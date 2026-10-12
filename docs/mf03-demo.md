# MF-03 Clinical Management Developer Demo Guide

## Overview
MF-03 (Clinical Examination and Treatment Plan Management) implements the end-to-end clinical workflow for dental practitioners in DentCare. It provides capabilities to record clinical examinations, map tooth-level findings using FDI notation, confirm clinical diagnoses, formulate treatment plans, schedule clinical follow-ups, and manage treatment procedures through their planned, in-progress, and completed lifecycles.

## Prerequisites
- MySQL 8.x running locally on port 3306 (default user `root`, no password or configured via env)
- JDK 21
- Node.js (v18+) and npm
- Maven wrapper (`backend/mvnw`)

## Database Setup
Run the following commands to initialize the schema and seed dev accounts:
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS dentcare;"
mysql -u root dentcare < database/migrations/auth/001_create_users_table.sql
mysql -u root dentcare < database/migrations/clinical/001_create_clinical_tables.sql
mysql -u root dentcare < database/migrations/inventory/001_create_inventory_tables.sql
./database/seed/dev_users.sh
```

## Seed Users Table
All accounts are provisioned with the standard password: `Password1!`

| ID | Email | Role | Name | Status |
|:---|:------|:-----|:-----|:-------|
| 4 | `dentist@dentcare.local` | `DENTIST` | Sarah Connor | Active |
| 5 | `reception@dentcare.local` | `RECEPTIONIST` | John Carter | Active |
| 6 | `patient@dentcare.local` | `PATIENT` | Jane Doe | Active |

## Stack Startup
Open two separate terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend && DB_NAME=dentcare ./mvnw spring-boot:run
```

**Terminal 2 (Frontend):**
```bash
cd frontend && npm run dev
```
Note the port Vite prints (typically 5173, but may be 3000 or 3001 if other processes occupy those ports). Open that URL in the browser.

## Demo Walkthrough
Follow this 10-step browser sequence to demonstrate MF-03:
1. **Log In**: Navigate to the URL Vite printed in the previous step, and append /login, and log in as `dentist@dentcare.local` / `Password1!`.
2. **Clinical Management**: From the main navigation, select **Clinical Management**.
3. **Examinations**: Click **Examinations** in the sub-navigation.
4. **Enter Patient ID**: In the **Patient ID** input field (`#patientIdSearch`), enter `6` and click **Load**.
5. **Create Examination**: Click **Create Examination**, enter examination notes / chief complaint, and submit.
6. **View Examination**: Click on the newly created examination record in the list table to view details.
7. **Add Tooth Finding**: In the tooth findings section, add a finding (e.g. FDI tooth `11`, condition `CARIES`).
8. **Confirm Diagnosis**: Click **Confirm Diagnosis** to finalize the clinical diagnosis.
9. **Treatment Plans**: Navigate to **Treatment Plans**, click **Create Plan** for Patient ID `6`.
10. **Add Procedure & Complete**: Add a procedure to the plan, click **Approve**, click **Start** (`IN_PROGRESS`), and finally click **Complete**.

## Known Gaps for the Demo
- **Patient Lookup**: MF-03 resolves patient validity via `UserPatientLookupAdapter` checking the `users` table for an active account with `role = PATIENT` (Seed Patient ID is `6`).
- **Module MF-01 Independence**: The full Patient Registration & Management module (MF-01) is not yet integrated into the stack; the standalone legacy `patients` table has been dropped as no clinical code queried it.

## Troubleshooting
- **Reset Database**: Re-run migrations and the dev user seeder:
  ```bash
  mysql -u root -e "DROP DATABASE IF EXISTS dentcare; CREATE DATABASE dentcare;"
  mysql -u root dentcare < database/migrations/auth/001_create_users_table.sql
  mysql -u root dentcare < database/migrations/clinical/001_create_clinical_tables.sql
  ./database/seed/dev_users.sh
  ```
- **Restart Stack**: Terminate processes in Terminal 1 and Terminal 2 using `Ctrl+C`, ensure port 8080 (backend) and whichever port Vite printed (frontend) are free, and re-execute the startup commands.
