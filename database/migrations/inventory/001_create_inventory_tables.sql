-- =============================================================================
-- DentCare Dental Management System
-- MF-06: Inventory Management
-- Migration: 001_create_inventory_tables.sql
-- Description: Creates the inventory_items and stock_movements tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: inventory_items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    item_code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    reorder_level INT NOT NULL,
    current_quantity INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    default_supplier_reference VARCHAR(150),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_inventory_items_code UNIQUE (item_code),
    CONSTRAINT chk_inventory_items_reorder CHECK (reorder_level >= 0),
    CONSTRAINT chk_inventory_items_quantity CHECK (current_quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_inventory_items_category ON inventory_items (category);
CREATE INDEX idx_inventory_items_active ON inventory_items (active);

-- -----------------------------------------------------------------------------
-- Table: stock_movements
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inventory_item_id BIGINT NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    reason VARCHAR(255),
    responsible_user_id BIGINT NOT NULL,
    reversal_of_movement_id BIGINT,
    treatment_procedure_id BIGINT,
    batch_number VARCHAR(100),
    expiry_date DATE,
    CONSTRAINT fk_stock_movements_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id),
    CONSTRAINT chk_stock_movements_qty CHECK (quantity > 0),
    CONSTRAINT chk_stock_movements_type CHECK (movement_type IN ('RECEIVED', 'USED', 'DAMAGED', 'ADJUSTED', 'EXPIRED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_stock_movements_item_time ON stock_movements (inventory_item_id, occurred_at DESC);
CREATE INDEX idx_stock_movements_type ON stock_movements (movement_type);
CREATE INDEX idx_stock_movements_user ON stock_movements (responsible_user_id);
CREATE INDEX idx_stock_movements_expiry ON stock_movements (expiry_date);
