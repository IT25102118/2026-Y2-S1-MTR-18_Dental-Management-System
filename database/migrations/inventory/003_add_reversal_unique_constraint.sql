-- =============================================================================
-- DentCare Dental Management System
-- MF-06: Inventory Management
-- Migration: 003_add_reversal_unique_constraint.sql
-- Description: Adds unique constraint on reversal_of_movement_id in stock_movements table.
-- =============================================================================

ALTER TABLE stock_movements
    ADD CONSTRAINT uk_stock_movements_reversal UNIQUE (reversal_of_movement_id);
