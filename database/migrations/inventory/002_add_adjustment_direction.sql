-- =============================================================================
-- DentCare Dental Management System
-- MF-06: Inventory Management
-- Migration: 002_add_adjustment_direction.sql
-- Description: Adds adjustment_direction column to stock_movements table.
-- =============================================================================

ALTER TABLE stock_movements
    ADD COLUMN adjustment_direction VARCHAR(10) NULL AFTER movement_type;

ALTER TABLE stock_movements
    ADD CONSTRAINT chk_stock_movements_adj_dir
    CHECK (adjustment_direction IS NULL OR adjustment_direction IN ('INCREASE', 'DECREASE'));
