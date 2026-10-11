-- =============================================================================
-- DentCare Dental Management System
-- MF-05: Billing and Payment Management (Student: IT25102123)
-- Database Query Script: Billing Tables Inspection & Management
-- =============================================================================

USE dentcare_db;

-- =============================================================================
-- 1. VIEW ALL INVOICES (Header details, totals, and payment status)
-- =============================================================================
SELECT 
    id AS invoice_id,
    invoice_number,
    patient_id,
    invoice_date,
    subtotal,
    discount_amount,
    total_amount,
    paid_amount,
    balance_amount,
    status,
    notes,
    issued_at,
    created_at
FROM invoices
ORDER BY id DESC;


-- =============================================================================
-- 2. VIEW ALL INVOICE LINE ITEMS (Procedures, unit price, quantity, totals)
-- =============================================================================
SELECT 
    ii.id AS item_id,
    ii.invoice_id,
    inv.invoice_number,
    ii.treatment_procedure_id,
    ii.description,
    ii.quantity,
    ii.unit_price,
    ii.line_total
FROM invoice_items ii
JOIN invoices inv ON ii.invoice_id = inv.id
ORDER BY ii.invoice_id, ii.id;


-- =============================================================================
-- 3. VIEW ALL PAYMENTS & RECEIPTS (Receipt numbers, method, reversal info)
-- =============================================================================
SELECT 
    p.id AS payment_id,
    p.payment_number AS receipt_number,
    p.invoice_id,
    inv.invoice_number,
    inv.patient_id,
    p.amount,
    p.payment_method,
    p.payment_reference,
    p.status,
    p.reversal_of_payment_id,
    p.reversal_reason,
    p.paid_at,
    p.recorded_by
FROM payments p
JOIN invoices inv ON p.invoice_id = inv.id
ORDER BY p.id DESC;


-- =============================================================================
-- 4. COMPLETE INVOICE BREAKDOWN WITH ITEMS & PAYMENTS (Joined View)
-- =============================================================================
SELECT 
    inv.id AS invoice_id,
    inv.invoice_number,
    inv.patient_id,
    inv.invoice_date,
    inv.total_amount,
    inv.paid_amount,
    inv.balance_amount,
    inv.status AS invoice_status,
    ii.description AS procedure_description,
    ii.quantity,
    ii.unit_price,
    ii.line_total
FROM invoices inv
LEFT JOIN invoice_items ii ON inv.id = ii.invoice_id
ORDER BY inv.id DESC, ii.id ASC;


-- =============================================================================
-- 5. PAYMENT AUDIT & REVERSAL TRACKING
-- =============================================================================
SELECT 
    original.id AS original_payment_id,
    original.payment_number AS original_receipt,
    original.amount AS original_amount,
    original.status AS original_status,
    reversal.id AS reversal_payment_id,
    reversal.payment_number AS reversal_receipt,
    reversal.amount AS reversal_amount,
    reversal.reversal_reason,
    reversal.paid_at AS reversal_timestamp
FROM payments original
LEFT JOIN payments reversal ON reversal.reversal_of_payment_id = original.id
ORDER BY original.id DESC;


-- =============================================================================
-- 6. INVOICE FINANCIAL RECONCILIATION (Verify Total = Paid + Balance)
-- =============================================================================
SELECT 
    id AS invoice_id,
    invoice_number,
    total_amount,
    paid_amount,
    balance_amount,
    (paid_amount + balance_amount) AS calculated_sum,
    CASE 
        WHEN total_amount = (paid_amount + balance_amount) THEN 'BALANCED'
        ELSE 'MISMATCH'
    END AS reconciliation_status,
    status
FROM invoices;
