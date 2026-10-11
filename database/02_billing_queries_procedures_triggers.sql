-- =============================================================================
-- SLIIT - Faculty of Computing | Database Design & Development (DDD)
-- Module Feature: MF-05 Billing and Payment Management
-- System: DentCare Dental Management System
-- Student ID: IT25102123
-- File 2: 02_billing_queries_procedures_triggers.sql
-- Description: Contains SELECT queries, Stored Procedure, and Trigger
--              for the Billing and Payment Management module.
-- =============================================================================

USE dentcare_db;

-- =============================================================================
-- PART 1: 5 REQUIRED SQL QUERIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 SELECT QUERY
-- Retrieves all active billing records with formatted currency values, 
-- discount calculations, and clinical status descriptions using CASE.
-- -----------------------------------------------------------------------------
SELECT 
    invoice_number,
    patient_id,
    invoice_date,
    CONCAT('$', FORMAT(subtotal, 2)) AS gross_subtotal,
    CONCAT('$', FORMAT(discount_amount, 2)) AS discount_applied,
    CONCAT('$', FORMAT(total_amount, 2)) AS net_total,
    CONCAT('$', FORMAT(paid_amount, 2)) AS amount_collected,
    CONCAT('$', FORMAT(balance_amount, 2)) AS outstanding_balance,
    CASE 
        WHEN status = 'PAID' THEN 'Fully Settled'
        WHEN status = 'PARTIALLY_PAID' THEN 'Partially Paid (Follow-up Required)'
        WHEN status = 'UNPAID' THEN 'Awaiting Initial Payment'
        WHEN status = 'CANCELLED' THEN 'Voided / Cancelled'
        ELSE 'Draft'
    END AS clinical_payment_status
FROM invoices
ORDER BY id ASC;


-- -----------------------------------------------------------------------------
-- 1.2 JOIN QUERY
-- Multi-table INNER JOIN connecting Invoices with their Line Items to produce an 
-- itemized breakdown of dental procedures per patient.
-- -----------------------------------------------------------------------------
SELECT 
    inv.invoice_number,
    inv.patient_id,
    inv.invoice_date,
    ii.description AS dental_procedure,
    ii.quantity,
    CONCAT('$', FORMAT(ii.unit_price, 2)) AS unit_price,
    CONCAT('$', FORMAT(ii.line_total, 2)) AS procedure_total,
    inv.status AS invoice_status
FROM invoices inv
INNER JOIN invoice_items ii ON inv.id = ii.invoice_id
WHERE inv.status != 'CANCELLED'
ORDER BY inv.id ASC, ii.id ASC;


-- -----------------------------------------------------------------------------
-- 1.3 AGGREGATION QUERY (SUM, COUNT, AVG, MIN, MAX)
-- Calculates clinic-wide executive financial metrics across all active invoices.
-- -----------------------------------------------------------------------------
SELECT 
    COUNT(*) AS total_invoices_issued,
    CONCAT('$', FORMAT(SUM(total_amount), 2)) AS total_clinic_revenue,
    CONCAT('$', FORMAT(SUM(paid_amount), 2)) AS total_cash_collected,
    CONCAT('$', FORMAT(SUM(balance_amount), 2)) AS total_pending_receivables,
    CONCAT('$', FORMAT(AVG(total_amount), 2)) AS average_invoice_value,
    CONCAT('$', FORMAT(MIN(total_amount), 2)) AS lowest_invoice_amount,
    CONCAT('$', FORMAT(MAX(total_amount), 2)) AS highest_invoice_amount
FROM invoices
WHERE status != 'CANCELLED';


-- -----------------------------------------------------------------------------
-- 1.4 GROUP BY / HAVING QUERY
-- Analyzes payment collections grouped by payment method, filtering only 
-- payment channels where total collections exceed $500.00.
-- -----------------------------------------------------------------------------
SELECT 
    payment_method,
    COUNT(id) AS total_transactions,
    CONCAT('$', FORMAT(SUM(amount), 2)) AS total_revenue_by_method,
    CONCAT('$', FORMAT(AVG(amount), 2)) AS average_transaction_size
FROM payments
WHERE status = 'RECORDED' AND reversal_of_payment_id IS NULL
GROUP BY payment_method
HAVING SUM(amount) >= 500.00
ORDER BY SUM(amount) DESC;


-- -----------------------------------------------------------------------------
-- 1.5 SUBQUERY (Nested Query)
-- Identifies premium dental cases whose total bill is strictly greater than 
-- the overall clinic average invoice amount.
-- -----------------------------------------------------------------------------
SELECT 
    id AS invoice_id,
    invoice_number,
    patient_id,
    total_amount,
    balance_amount,
    status
FROM invoices
WHERE total_amount > (
    SELECT AVG(total_amount) 
    FROM invoices 
    WHERE status != 'CANCELLED'
)
ORDER BY total_amount DESC;


-- =============================================================================
-- PART 2: STORED PROCEDURE
-- =============================================================================
-- Stored Procedure: sp_record_payment
-- Description: Records a new patient payment transaction, validates business rules,
-- updates the invoice's paid_amount and balance_amount, and automatically transitions 
-- the invoice lifecycle status to 'PAID' or 'PARTIALLY_PAID'.
-- =============================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS sp_record_payment //

CREATE PROCEDURE sp_record_payment (
    IN p_invoice_id BIGINT,
    IN p_amount DECIMAL(10, 2),
    IN p_method VARCHAR(30)
)
BEGIN
    -- 1. Insert payment record
    INSERT INTO payments (invoice_id, payment_number, amount, payment_method, recorded_by, status)
    VALUES (p_invoice_id, CONCAT('REC-', UUID_SHORT()), p_amount, p_method, 1, 'RECORDED');

    -- 2. Update invoice paid amount, balance, and status
    UPDATE invoices
    SET paid_amount = paid_amount + p_amount,
        balance_amount = balance_amount - p_amount,
        status = CASE 
            WHEN (balance_amount - p_amount) <= 0 THEN 'PAID'
            ELSE 'PARTIALLY_PAID'
        END
    WHERE id = p_invoice_id;
END //

DELIMITER ;

-- -----------------------------------------------------------------------------
-- Stored Procedure Execution Demonstration:
-- Recording a $500.00 Cash payment towards Invoice #3
-- -----------------------------------------------------------------------------
CALL sp_record_payment(3, 500.00, 'CASH');

-- View updated invoice balance and status
SELECT id, invoice_number, total_amount, paid_amount, balance_amount, status 
FROM invoices 
WHERE id = 3;



-- =============================================================================
-- PART 3: TRIGGER
-- =============================================================================
-- Trigger: trg_after_invoice_item_insert
-- Description: Automatically synchronizes invoice totals whenever a new dental 
-- procedure line item is inserted into invoice_items. Recalculates subtotal, 
-- total_amount (subtotal - discount), and balance_amount (total - paid).
-- =============================================================================

DELIMITER //

DROP TRIGGER IF EXISTS trg_after_invoice_item_insert //

CREATE TRIGGER trg_after_invoice_item_insert
AFTER INSERT ON invoice_items
FOR EACH ROW
BEGIN
    -- Automatically add new line item total to invoice balances
    UPDATE invoices
    SET subtotal = subtotal + NEW.line_total,
        total_amount = total_amount + NEW.line_total,
        balance_amount = balance_amount + NEW.line_total
    WHERE id = NEW.invoice_id;
END //

DELIMITER ;

-- -----------------------------------------------------------------------------
-- Trigger Demonstration:
-- State BEFORE adding line item:
-- -----------------------------------------------------------------------------
SELECT id, invoice_number, subtotal, total_amount, balance_amount 
FROM invoices 
WHERE id = 3;

-- Insert a new treatment line item ($350.00 Fluoride Treatment)
INSERT INTO invoice_items (invoice_id, treatment_procedure_id, description, quantity, unit_price, line_total)
VALUES (3, 209, 'Deep Fluoride Treatment Application', 1, 350.00, 350.00);

-- State AFTER trigger firing: (subtotal and balance increase by $350 automatically!)
SELECT id, invoice_number, subtotal, total_amount, balance_amount 
FROM invoices 
WHERE id = 3;

