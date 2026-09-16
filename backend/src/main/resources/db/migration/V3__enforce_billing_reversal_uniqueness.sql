-- Ensure each original payment can have at most one compensating reversal.
-- MySQL unique constraints permit multiple NULL values, so ordinary payments remain unaffected.

SET @needs_billing_reversal_constraint = (
    SELECT COUNT(*) = 0 FROM information_schema.table_constraints
    WHERE constraint_schema = DATABASE()
      AND table_name = 'payments'
      AND constraint_name = 'uk_payments_reversal_of_payment'
);
SET @sql = IF(@needs_billing_reversal_constraint,
    'ALTER TABLE payments ADD CONSTRAINT uk_payments_reversal_of_payment UNIQUE (reversal_of_payment_id)',
    'SELECT 1');
PREPARE migration_statement FROM @sql;
EXECUTE migration_statement;
DEALLOCATE PREPARE migration_statement;
