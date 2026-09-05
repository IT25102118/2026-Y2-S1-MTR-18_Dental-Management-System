-- =============================================================================
-- DentCare Dental Management System
-- MF-06: Inventory Management
-- Migration: 004_create_inventory_batches.sql
-- Description: Creates inventory_batches table, links stock_movements to batches,
--              and backfills legacy stock balances.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: inventory_batches
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_batches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inventory_item_id BIGINT NOT NULL,
    batch_number VARCHAR(100) NULL,
    expiry_date DATE NULL,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    received_date DATE NULL,
    supplier_reference VARCHAR(150) NULL,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_batches_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id),
    CONSTRAINT chk_inventory_batches_qty CHECK (quantity_on_hand >= 0),
    CONSTRAINT uk_inventory_batches_item_batch UNIQUE (inventory_item_id, batch_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_inventory_batches_item ON inventory_batches (inventory_item_id);
CREATE INDEX idx_inventory_batches_expiry ON inventory_batches (expiry_date);
CREATE INDEX idx_inventory_batches_qty ON inventory_batches (quantity_on_hand);

-- -----------------------------------------------------------------------------
-- Link stock_movements to inventory_batches
-- -----------------------------------------------------------------------------
ALTER TABLE stock_movements
    ADD COLUMN inventory_batch_id BIGINT NULL AFTER inventory_item_id;

ALTER TABLE stock_movements
    ADD CONSTRAINT fk_stock_movements_batch FOREIGN KEY (inventory_batch_id) REFERENCES inventory_batches (id);

CREATE INDEX idx_stock_movements_batch ON stock_movements (inventory_batch_id);

-- -----------------------------------------------------------------------------
-- Backfill pre-S4B current stock truthfully
-- Creates one unbatched balance per item where current_quantity > 0
-- Historical receipt date and expiry are unknown, so they remain NULL.
-- -----------------------------------------------------------------------------
INSERT INTO inventory_batches (inventory_item_id, batch_number, expiry_date, quantity_on_hand, received_date, supplier_reference)
SELECT id, NULL, NULL, current_quantity, NULL, default_supplier_reference
FROM inventory_items
WHERE current_quantity > 0;
