-- =============================================================================
-- DentCare Dental Management System
-- Test Schema for H2 Database (MODE=MySQL)
-- =============================================================================

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
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_inventory_items_code UNIQUE (item_code),
    CONSTRAINT chk_inventory_items_reorder CHECK (reorder_level >= 0),
    CONSTRAINT chk_inventory_items_quantity CHECK (current_quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items (category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items (active);

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
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventory_batches_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id),
    CONSTRAINT chk_inventory_batches_qty CHECK (quantity_on_hand >= 0),
    CONSTRAINT uk_inventory_batches_item_batch UNIQUE (inventory_item_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_item ON inventory_batches (inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry ON inventory_batches (expiry_date);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_qty ON inventory_batches (quantity_on_hand);

CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    inventory_item_id BIGINT NOT NULL,
    inventory_batch_id BIGINT NULL,
    movement_type VARCHAR(20) NOT NULL,
    adjustment_direction VARCHAR(10),
    quantity INT NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    reason VARCHAR(255),
    responsible_user_id BIGINT NOT NULL,
    reversal_of_movement_id BIGINT,
    treatment_procedure_id BIGINT,
    batch_number VARCHAR(100),
    expiry_date DATE,
    CONSTRAINT fk_stock_movements_item FOREIGN KEY (inventory_item_id) REFERENCES inventory_items (id),
    CONSTRAINT fk_stock_movements_batch FOREIGN KEY (inventory_batch_id) REFERENCES inventory_batches (id),
    CONSTRAINT chk_stock_movements_qty CHECK (quantity > 0),
    CONSTRAINT chk_stock_movements_type CHECK (movement_type IN ('RECEIVED', 'USED', 'DAMAGED', 'ADJUSTED', 'EXPIRED')),
    CONSTRAINT chk_stock_movements_adj_dir CHECK (adjustment_direction IS NULL OR adjustment_direction IN ('INCREASE', 'DECREASE')),
    CONSTRAINT uk_stock_movements_reversal UNIQUE (reversal_of_movement_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_time ON stock_movements (inventory_item_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON stock_movements (inventory_batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements (movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON stock_movements (responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_expiry ON stock_movements (expiry_date);

