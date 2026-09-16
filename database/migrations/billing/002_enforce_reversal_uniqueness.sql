-- Prevent more than one compensating reversal from referencing the same payment.
ALTER TABLE payments
    ADD CONSTRAINT uk_payments_reversal_of_payment UNIQUE (reversal_of_payment_id);
