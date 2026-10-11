-- =============================================================================
-- SLIIT - Faculty of Computing
-- Database Design & Development (DDD) - Assignment 02
-- Module Feature: MF-05 Billing and Payment Management
-- System: DentCare Dental Management System
-- Student Name: IT25102123
-- Student ID:   IT25102123
-- File:         IT25102123_Billing_Assignment02.sql
-- =============================================================================

USE dentcare_db;

-- =============================================================================
-- PART 1: EER DIAGRAM & DATABASE DESIGN
-- =============================================================================
/*
1. MODULE SCOPE (MF-05: Billing & Payment Management):
   Responsible for managing invoices, line items (dental procedures), payment receipts,
   and compensating payment reversals for a modern dental healthcare clinic.

2. SCHEMA DESIGN & 3RD NORMAL FORM (3NF):
   The schema consists of 3 cohesive, normalized entities:
   a. invoices      : Invoice headers storing patient billing metadata, dates,
                      monetary totals (subtotal, discount, total, paid, balance),
                      and billing statuses ('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED').
   b. invoice_items : Weak entity representing dental treatments/procedures rendered
                      with quantity, unit price, and calculated line totals.
   c. payments      : Financial transaction records capturing receipt number, payment method,
                      amount, payment timestamp, and self-referencing reversal links.

3. ISA (GENERALIZATION / SPECIALIZATION) MAPPING:
   • Super-Entity: PAYMENT (Generalization)
     - Attributes: payment_id (PK), invoice_id (FK), payment_number, amount, paid_at, status
   • Sub-Entities:
     - CashPayment          (Specific: cash drawer tracking, zero processing fee)
     - CardPayment          (Specific: card reference number, POS terminal auth code)
     - BankTransferPayment  (Specific: bank transaction reference, settlement verification)
     - OtherPayment         (Specific: external voucher or insurance reference)
   • Specialization Constraints:
     - Disjoint (d): A payment transaction cannot be both Cash and Card simultaneously.
     - Total (t)   : Every recorded payment must belong to exactly one defined payment method.
   • Relational Mapping Strategy Applied:
     - Option 8A: Single Table Inheritance with Type Discriminator (`payment_method`).
     - Justification:
       1. Eliminates expensive outer JOINs across small polymorphic subtype tables.
       2. The subtype-specific attribute (`payment_reference`) is lightweight and shared
          among electronic payment subtypes.
       3. Type integrity is strictly enforced at the DBMS engine level using:
          CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')).

4. PRIMARY KEY (PK) AND FOREIGN KEY (FK) CONNECTIONS:
   • invoices.id (PK) <---> (0..*) invoice_items.invoice_id (FK)
     - Cascade rule: ON DELETE CASCADE (Deleting an invoice removes its line items).
   • invoices.id (PK) <---> (0..*) payments.invoice_id (FK)
     - Restrict rule: ON DELETE RESTRICT (Prevents orphan invoices with recorded cash/card payments).
   • payments.id (PK) <---> (0..1) payments.reversal_of_payment_id (FK)
     - Self-referential 1-to-1 compensating reversal link with a UNIQUE constraint
       (uk_payments_reversal_of_payment) ensuring a payment can only ever be reversed once.
*/


-- =============================================================================
-- PART 2: TABLE CREATION (DDL)
-- =============================================================================

-- Drop existing tables in reverse dependency order to avoid FK conflicts
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;

-- -----------------------------------------------------------------------------
-- Table 1: invoices
-- -----------------------------------------------------------------------------
CREATE TABLE invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    patient_id BIGINT NOT NULL,
    treatment_plan_id BIGINT NULL,
    invoice_date DATE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL,
    notes VARCHAR(500) NULL,
    issued_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    CONSTRAINT uk_invoices_number UNIQUE (invoice_number),
    CONSTRAINT chk_invoices_subtotal CHECK (subtotal >= 0.00),
    CONSTRAINT chk_invoices_discount CHECK (discount_amount >= 0.00),
    CONSTRAINT chk_invoices_total CHECK (total_amount >= 0.00),
    CONSTRAINT chk_invoices_paid CHECK (paid_amount >= 0.00),
    CONSTRAINT chk_invoices_balance CHECK (balance_amount >= 0.00),
    CONSTRAINT chk_invoices_status CHECK (status IN ('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Performance Indexes for search and reporting
CREATE INDEX idx_invoices_patient ON invoices (patient_id);
CREATE INDEX idx_invoices_date ON invoices (invoice_date);
CREATE INDEX idx_invoices_status ON invoices (status);

-- -----------------------------------------------------------------------------
-- Table 2: invoice_items
-- -----------------------------------------------------------------------------
CREATE TABLE invoice_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    treatment_procedure_id BIGINT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) 
        REFERENCES invoices (id) ON DELETE CASCADE,
    CONSTRAINT chk_invoice_items_qty CHECK (quantity > 0),
    CONSTRAINT chk_invoice_items_price CHECK (unit_price >= 0.00),
    CONSTRAINT chk_invoice_items_total CHECK (line_total >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

-- -----------------------------------------------------------------------------
-- Table 3: payments
-- -----------------------------------------------------------------------------
CREATE TABLE payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    payment_number VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_reference VARCHAR(100) NULL,
    paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recorded_by BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RECORDED',
    reversal_of_payment_id BIGINT NULL,
    reversal_reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_payments_number UNIQUE (payment_number),
    CONSTRAINT uk_payments_reversal_of_payment UNIQUE (reversal_of_payment_id),
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) 
        REFERENCES invoices (id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_reversal FOREIGN KEY (reversal_of_payment_id) 
        REFERENCES payments (id) ON DELETE SET NULL,
    CONSTRAINT chk_payments_amount CHECK (amount > 0.00),
    CONSTRAINT chk_payments_method CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
    CONSTRAINT chk_payments_status CHECK (status IN ('RECORDED', 'REVERSED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_invoice ON payments (invoice_id);
CREATE INDEX idx_payments_paid_at ON payments (paid_at);
CREATE INDEX idx_payments_recorded_by ON payments (recorded_by);


-- =============================================================================
-- PART 3: INSERTING SAMPLE DATA (DML)
-- =============================================================================

-- 1. Insert Invoices (Covering all 5 lifecycle statuses)
INSERT INTO invoices (
    id, invoice_number, patient_id, treatment_plan_id, invoice_date, 
    subtotal, discount_amount, total_amount, paid_amount, balance_amount, 
    status, notes, issued_at, created_by
) VALUES
(1, 'INV-2026-0001', 1, 101, '2026-10-01',  285.00,   0.00,  285.00,  285.00,    0.00, 'PAID',           'Routine dental checkup and teeth scaling', '2026-10-01 09:30:00', 1),
(2, 'INV-2026-0002', 2, 102, '2026-10-01', 7500.00, 500.00, 7000.00, 3500.00, 3500.00, 'PARTIALLY_PAID', 'Root canal therapy with composite crown',  '2026-10-01 10:15:00', 1),
(3, 'INV-2026-0003', 3, 103, '2026-10-02', 2000.00,   0.00, 2000.00,    0.00, 2000.00, 'UNPAID',         'Cosmetic teeth whitening session',          '2026-10-02 11:00:00', 1),
(4, 'INV-2026-0004', 1, 104, '2026-10-02',  580.00,   0.00,  580.00,  580.00,    0.00, 'PAID',           'Bitewing X-Rays and resin restorations',    '2026-10-02 14:00:00', 1),
(5, 'INV-2026-0005', 4, 105, '2026-10-03', 1500.00,   0.00, 1500.00,    0.00, 1500.00, 'CANCELLED',      'Patient cancelled appointment due to illness', NULL, 1);

-- 2. Insert Invoice Line Items
INSERT INTO invoice_items (id, invoice_id, treatment_procedure_id, description, quantity, unit_price, line_total) VALUES
(1,  1, 201, 'Comprehensive Oral Examination', 1,  85.00,  85.00),
(2,  1, 202, 'Ultrasonic Dental Scaling',       1, 200.00, 200.00),
(3,  2, 203, 'Endodontic Root Canal Therapy',   1, 5000.00, 5000.00),
(4,  2, 204, 'Porcelain Fused to Metal Crown',  1, 2500.00, 2500.00),
(5,  3, 205, 'Laser Teeth Whitening',           1, 2000.00, 2000.00),
(6,  4, 206, 'Digital Panoramic X-Ray',         1, 180.00, 180.00),
(7,  4, 207, 'Composite Posterior Restoration', 2, 200.00, 400.00),
(8,  5, 208, 'Surgical Wisdom Tooth Extraction',1, 1500.00, 1500.00);

-- 3. Insert Payments (Including Cash, Card, Bank Transfer, and Reversal)
INSERT INTO payments (
    id, invoice_id, payment_number, amount, payment_method, 
    payment_reference, paid_at, recorded_by, status, reversal_of_payment_id, reversal_reason
) VALUES
(1, 1, 'REC-2026-0001',  285.00, 'CARD',          'VISA-AUTH-98214', '2026-10-01 09:45:00', 1, 'RECORDED', NULL, NULL),
(2, 2, 'REC-2026-0002', 3500.00, 'BANK_TRANSFER', 'BOC-TXN-449102',  '2026-10-01 10:30:00', 1, 'RECORDED', NULL, NULL),
(3, 4, 'REC-2026-0003',  300.00, 'CASH',          'RECEIPT-DRAWER-01', '2026-10-02 14:15:00', 1, 'RECORDED', NULL, NULL),
(4, 4, 'REC-2026-0004',  280.00, 'CASH',          'RECEIPT-DRAWER-01', '2026-10-02 14:20:00', 1, 'RECORDED', NULL, NULL),
(5, 2, 'REC-2026-0005',  500.00, 'CARD',          'MASTERCARD-5512',   '2026-10-02 16:00:00', 1, 'REVERSED', NULL, 'Customer charged incorrect card'),
(6, 2, 'REC-2026-0006',  500.00, 'CARD',          'REV-MASTERCARD-55', '2026-10-02 16:10:00', 1, 'RECORDED', 5, 'Compensating reversal of payment #5');


-- =============================================================================
-- PART 4: 5 REQUIRED SQL QUERIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 SELECT QUERY
-- Retrieves all active billing records with formatted amounts, customer-friendly 
-- payment status descriptions, and calculated discount savings.
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
-- 4.2 JOIN QUERY
-- Multi-table JOIN connecting Invoices with their Line Items to produce an 
-- itemized breakdown for each dental patient.
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
-- 4.3 AGGREGATION QUERY (SUM, COUNT, AVG, MIN, MAX)
-- Calculates clinic executive financial metrics across all active invoices.
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
-- 4.4 GROUP BY / HAVING QUERY
-- Analyzes payment distribution by payment method, filtering only high-volume 
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
-- 4.5 SUBQUERY (Nested Query)
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
-- PART 5: STORED PROCEDURE
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
-- PART 6: TRIGGER
-- =============================================================================
-- Trigger: trg_after_invoice_item_insert
-- Description: Automatically adds new line item amounts to parent invoice totals.
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
-- Adding a new procedure item ($350.00 Fluoride Treatment) to Invoice #3 (Teeth Whitening)
-- Notice how Invoice #3 totals increase automatically without manual calculation!
-- -----------------------------------------------------------------------------
-- State BEFORE trigger firing:
SELECT id, invoice_number, subtotal, total_amount, balance_amount 
FROM invoices 
WHERE id = 3;

-- Insert a new procedure line item (quantity 1, unit price $350.00, line total $350.00)
INSERT INTO invoice_items (invoice_id, treatment_procedure_id, description, quantity, unit_price, line_total)
VALUES (3, 209, 'Deep Fluoride Treatment Application', 1, 350.00, 350.00);

-- State AFTER trigger firing: (subtotal increases from $2,000 to $2,350 automatically!)
SELECT id, invoice_number, subtotal, total_amount, balance_amount 
FROM invoices 
WHERE id = 3;

-- =============================================================================
-- END OF ASSIGNMENT 02 SQL SCRIPT - IT25102123
-- =============================================================================
