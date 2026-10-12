-- =============================================================================
-- SLIIT - Faculty of Computing | Database Design & Development (DDD)
-- Module Feature: MF-05 Billing and Payment Management
-- System: DentCare Dental Management System
-- Student ID: IT25102123
-- File 1: 01_billing_table_creation.sql
-- Description: DDL Schema creation for invoices, invoice_items, and payments 
--              tables with constraints, indexes, and initial sample data.
-- =============================================================================

USE dentcare_db;

-- =============================================================================
-- 1. DROP TABLES (Reverse Dependency Order to avoid FK violations)
-- =============================================================================
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;

-- =============================================================================
-- 2. TABLE CREATION (DDL)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table 1: invoices
-- Represents invoice header, patient billing details, totals, and lifecycle status.
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
-- Weak entity representing itemized dental procedures rendered per invoice.
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
-- Captures payment transactions, receipts, and self-referencing reversal links.
-- Includes ISA mapping with type discriminator (payment_method).
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
-- 3. INSERTING SAMPLE DATA (DML)
-- =============================================================================

-- 1. Insert Invoices (Demonstrating all 5 clinical statuses)
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

-- 3. Insert Payments (Cash, Card, Bank Transfer, and Reversal)
INSERT INTO payments (
    id, invoice_id, payment_number, amount, payment_method, 
    payment_reference, paid_at, recorded_by, status, reversal_of_payment_id, reversal_reason
) VALUES
(1, 1, 'REC-2026-0001',  285.00, 'CARD',          'VISA-AUTH-98214',   '2026-10-01 09:45:00', 1, 'RECORDED', NULL, NULL),
(2, 2, 'REC-2026-0002', 3500.00, 'BANK_TRANSFER', 'BOC-TXN-449102',    '2026-10-01 10:30:00', 1, 'RECORDED', NULL, NULL),
(3, 4, 'REC-2026-0003',  300.00, 'CASH',          'DRAWER-01-CASH',    '2026-10-02 14:15:00', 1, 'RECORDED', NULL, NULL),
(4, 4, 'REC-2026-0004',  280.00, 'CASH',          'DRAWER-01-CASH',    '2026-10-02 14:20:00', 1, 'RECORDED', NULL, NULL),
(5, 2, 'REC-2026-0005',  500.00, 'CARD',          'MASTERCARD-5512',   '2026-10-02 16:00:00', 1, 'REVERSED', NULL, 'Customer charged incorrect card'),
(6, 2, 'REC-2026-0006',  500.00, 'CARD',          'REV-MASTERCARD-55', '2026-10-02 16:10:00', 1, 'RECORDED', 5, 'Compensating reversal of payment #5');

-- Verify successful creation
SELECT 'TABLES CREATED & SEEDED SUCCESSFULLY' AS status,
       (SELECT COUNT(*) FROM invoices) AS invoice_count,
       (SELECT COUNT(*) FROM invoice_items) AS item_count,
       (SELECT COUNT(*) FROM payments) AS payment_count;
