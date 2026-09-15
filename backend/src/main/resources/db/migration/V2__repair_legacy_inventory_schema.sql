-- Upgrade databases that previously ran only part of the manual inventory scripts.

SET @needs_adjustment_direction = (
    SELECT COUNT(*) = 0 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'stock_movements' AND column_name = 'adjustment_direction'
);
SET @sql = IF(@needs_adjustment_direction,
    'ALTER TABLE stock_movements ADD COLUMN adjustment_direction VARCHAR(10) NULL AFTER movement_type',
    'SELECT 1');
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @needs_adjustment_constraint = (
    SELECT COUNT(*) = 0 FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'stock_movements' AND constraint_name = 'chk_stock_movements_adj_dir'
);
SET @sql = IF(@needs_adjustment_constraint,
    'ALTER TABLE stock_movements ADD CONSTRAINT chk_stock_movements_adj_dir CHECK (adjustment_direction IS NULL OR adjustment_direction IN (''INCREASE'', ''DECREASE''))',
    'SELECT 1');
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @needs_reversal_constraint = (
    SELECT COUNT(*) = 0 FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'stock_movements' AND constraint_name = 'uk_stock_movements_reversal'
);
SET @sql = IF(@needs_reversal_constraint,
    'ALTER TABLE stock_movements ADD CONSTRAINT uk_stock_movements_reversal UNIQUE (reversal_of_movement_id)',
    'SELECT 1');
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @needs_batch_column = (
    SELECT COUNT(*) = 0 FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'stock_movements' AND column_name = 'inventory_batch_id'
);
SET @sql = IF(@needs_batch_column,
    'ALTER TABLE stock_movements ADD COLUMN inventory_batch_id BIGINT NULL AFTER inventory_item_id',
    'SELECT 1');
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @needs_batch_fk = (
    SELECT COUNT(*) = 0 FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE() AND table_name = 'stock_movements' AND constraint_name = 'fk_stock_movements_batch'
);
SET @sql = IF(@needs_batch_fk,
    'ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movements_batch FOREIGN KEY (inventory_batch_id) REFERENCES inventory_batches (id)',
    'SELECT 1');
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @needs_batch_index = (
    SELECT COUNT(*) = 0 FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'stock_movements' AND index_name = 'idx_stock_movements_batch'
);
SET @sql = IF(@needs_batch_index,
    'CREATE INDEX idx_stock_movements_batch ON stock_movements (inventory_batch_id)',
    'SELECT 1');
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;

SET @sql = IF(@needs_batch_column,
    'INSERT INTO inventory_batches (inventory_item_id, batch_number, expiry_date, quantity_on_hand, received_date, supplier_reference) SELECT id, NULL, NULL, current_quantity, NULL, default_supplier_reference FROM inventory_items WHERE current_quantity > 0',
    'SELECT 1');
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
