-- Patient Records Management: simple SQL examples.
-- Run file 01 first. Use MySQL Workbench to run this file.
-- Creating triggers/procedures requires TRIGGER and CREATE ROUTINE privileges.
-- The examples below change only a demo patient and finish with ROLLBACK.
-- The trigger and procedure remain installed because DDL is not rolled back.

USE dentcare_db;

-- 1. SELECT: list active patients.
SELECT id, patient_code, first_name, last_name, phone, city
FROM patients
WHERE active = TRUE
ORDER BY last_name, first_name;

-- SELECT: search by part of a name. Change 'Perera' as needed.
SELECT id, patient_code, first_name, last_name, phone
FROM patients
WHERE first_name LIKE '%Perera%' OR last_name LIKE '%Perera%';

-- 2. TRIGGER: reject a new patient with a future birth date.
-- A trigger runs automatically when its event happens.
-- These names belong to these examples; rerunning replaces these definitions.
DROP TRIGGER IF EXISTS patient_records_check_birth_date;
DROP PROCEDURE IF EXISTS GetPatientRecord;

-- DELIMITER lets Workbench read a complete BEGIN ... END block.
DELIMITER $$

CREATE TRIGGER patient_records_check_birth_date
BEFORE INSERT ON patients
FOR EACH ROW
BEGIN
    IF NEW.date_of_birth > CURRENT_DATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Date of birth cannot be in the future';
    END IF;
END$$

-- 3. PROCEDURE: retrieve one patient's complete record using their ID.
CREATE PROCEDURE GetPatientRecord(IN p_patient_id BIGINT)
BEGIN
    SELECT *
    FROM patients
    WHERE id = p_patient_id;
END$$

DELIMITER ;

-- Start a transaction so the demo changes can be undone.
START TRANSACTION;

-- Create a demo patient to use in the update and delete examples.
-- UUID gives this example a new patient code on each run.
SET @demo_code = CONCAT('DEMO-', LEFT(UUID(), 8));

INSERT INTO patients (
    patient_code, first_name, last_name, date_of_birth, gender,
    phone, city, allergies, dental_history
)
VALUES (
    @demo_code, 'Nimal', 'Perera', '2000-05-15', 'MALE',
    '0771234567', 'Colombo', 'Penicillin', 'Previous tooth filling'
);

-- Save the ID of the demo patient just inserted.
SET @demo_patient_id = LAST_INSERT_ID();

-- Call the procedure to display this patient's record.
CALL GetPatientRecord(@demo_patient_id);

-- 4. UPDATE: change contact details and clinical notes for one patient.
-- Increment version so the backend can detect that the row changed.
UPDATE patients
SET phone = '0777654321',
    city = 'Kandy',
    notes = 'Patient requested an afternoon appointment.',
    version = version + 1
WHERE id = @demo_patient_id;

-- Display the updated patient.
CALL GetPatientRecord(@demo_patient_id);

-- Deactivation: the application keeps patient history instead of deleting it.
UPDATE patients
SET active = FALSE,
    deactivation_reason = 'Demo patient moved to another clinic',
    deactivated_at = CURRENT_TIMESTAMP,
    version = version + 1
WHERE id = @demo_patient_id;

-- 5. DELETE: remove only the demo row created above.
-- Use physical deletion only for disposable demo records without linked history.
DELETE FROM patients
WHERE id = @demo_patient_id AND patient_code = @demo_code;

-- Undo the demo insert, updates and delete; existing patients are unchanged.
-- Keep this statement when running the full example.
ROLLBACK;

-- To retrieve a real patient later, run CALL GetPatientRecord(123);
-- Replace 123 with an actual patient ID.
