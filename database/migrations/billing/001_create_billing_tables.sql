-- =============================================================================
-- DentCare Dental Management System
-- MF-05: Billing and Payment Management
-- Migration: 001_create_billing_tables.sql
-- Description: Creates the invoices, invoice_items, and payments tables.
-- =============================================================================

-- NOTE ON CROSS-MODULE FOREIGN KEYS:
-- patient_id, treatment_plan_id, and treatment_procedure_id are stored as scalar
-- identifiers. Physical foreign key constraints to MF-01 (patients) and MF-03
-- (treatment_plans, treatment_procedures) tables are intentionally deferred
-- until those upstream modules define and freeze their authoritative schemas.

-- -----------------------------------------------------------------------------
-- Table: invoices
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    patient_id BIGINT NOT NULL,
    treatment_plan_id BIGINT,
    invoice_date DATE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL,
    notes VARCHAR(500),
    issued_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT,
    CONSTRAINT uk_invoices_number UNIQUE (invoice_number),
    CONSTRAINT chk_invoices_subtotal CHECK (subtotal >= 0.00),
    CONSTRAINT chk_invoices_discount CHECK (discount_amount >= 0.00),
    CONSTRAINT chk_invoices_total CHECK (total_amount >= 0.00),
    CONSTRAINT chk_invoices_paid CHECK (paid_amount >= 0.00),
    CONSTRAINT chk_invoices_balance CHECK (balance_amount >= 0.00),
    CONSTRAINT chk_invoices_status CHECK (status IN ('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_invoices_patient ON invoices (patient_id);
CREATE INDEX idx_invoices_date ON invoices (invoice_date);
CREATE INDEX idx_invoices_status ON invoices (status);

-- -----------------------------------------------------------------------------
-- Table: invoice_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    treatment_procedure_id BIGINT,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
    CONSTRAINT chk_invoice_items_qty CHECK (quantity > 0),
    CONSTRAINT chk_invoice_items_price CHECK (unit_price >= 0.00),
    CONSTRAINT chk_invoice_items_total CHECK (line_total >= 0.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice_id);

-- -----------------------------------------------------------------------------
-- Table: payments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    payment_number VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    payment_reference VARCHAR(100),
    paid_at TIMESTAMP NOT NULL,
    recorded_by BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RECORDED',
    reversal_of_payment_id BIGINT,
    reversal_reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_payments_number UNIQUE (payment_number),
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices (id),
    CONSTRAINT chk_payments_amount CHECK (amount > 0.00),
    CONSTRAINT chk_payments_method CHECK (payment_method IN ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER')),
    CONSTRAINT chk_payments_status CHECK (status IN ('RECORDED', 'REVERSED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_payments_invoice ON payments (invoice_id);
CREATE INDEX idx_payments_paid_at ON payments (paid_at);
CREATE INDEX idx_payments_recorded_by ON payments (recorded_by);
