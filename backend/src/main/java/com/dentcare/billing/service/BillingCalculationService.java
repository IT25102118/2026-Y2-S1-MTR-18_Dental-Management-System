package com.dentcare.billing.service;

import com.dentcare.billing.entity.Invoice;
import com.dentcare.billing.entity.InvoiceItem;
import com.dentcare.billing.exception.BillingValidationException;
import com.dentcare.billing.exception.InvalidBillingAmountException;
import com.dentcare.billing.exception.OverpaymentException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Authoritative billing calculation and validation engine for DentCare (MF-05).
 * Enforces pure, side-effect-free financial formulas and integrity checks using {@link BigDecimal}:
 * - lineTotal = quantity * unitPrice
 * - subtotal = sum(lineTotal)
 * - total = subtotal - discount
 * - balance = total - paidAmount
 * - payment validation (amount > 0 and amount <= balance)
 */
@Service
public class BillingCalculationService {

    private static final int MONEY_SCALE = 2;
    private static final RoundingMode MONEY_ROUNDING = RoundingMode.HALF_UP;

    /**
     * Normalizes a monetary value to the database's authoritative two-decimal scale.
     */
    public BigDecimal normalizeMoney(BigDecimal amount) {
        if (amount == null) {
            throw new InvalidBillingAmountException("Monetary amount is required");
        }
        return amount.setScale(MONEY_SCALE, MONEY_ROUNDING);
    }

    /**
     * Calculates the line total for an itemized invoice entry: quantity * unitPrice.
     *
     * @param quantity  number of units (must be an integer >= 1)
     * @param unitPrice price per unit (must be a non-negative BigDecimal)
     * @return calculated line total
     * @throws InvalidBillingAmountException if quantity or unitPrice is null or invalid/negative
     */
    public BigDecimal calculateLineTotal(Integer quantity, BigDecimal unitPrice) {
        if (quantity == null || quantity < 1) {
            throw new InvalidBillingAmountException("Quantity must be at least 1");
        }
        if (unitPrice == null || unitPrice.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidBillingAmountException("Unit price must be non-negative");
        }

        BigDecimal normalizedUnitPrice = normalizeMoney(unitPrice);
        return BigDecimal.valueOf(quantity)
                .multiply(normalizedUnitPrice)
                .setScale(MONEY_SCALE, MONEY_ROUNDING);
    }

    /**
     * Calculates the authoritative subtotal from a list of invoice items.
     * Empty or null list results in zero subtotal.
     *
     * @param items invoice items
     * @return sum of line totals, non-negative
     * @throws InvalidBillingAmountException if any item has null or negative line total
     */
    public BigDecimal calculateSubtotal(List<InvoiceItem> items) {
        if (items == null || items.isEmpty()) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, MONEY_ROUNDING);
        }

        BigDecimal sum = BigDecimal.ZERO.setScale(MONEY_SCALE, MONEY_ROUNDING);
        for (InvoiceItem item : items) {
            if (item != null) {
                BigDecimal lineTotal = item.getLineTotal();
                if (lineTotal == null || lineTotal.compareTo(BigDecimal.ZERO) < 0) {
                    throw new InvalidBillingAmountException("Item line total must be non-negative");
                }
                sum = sum.add(normalizeMoney(lineTotal));
            }
        }
        return sum.setScale(MONEY_SCALE, MONEY_ROUNDING);
    }

    /**
     * Calculates the authoritative subtotal directly from a collection of line total values.
     *
     * @param lineTotals list of line totals
     * @return sum of line totals
     */
    public BigDecimal calculateSubtotalFromTotals(List<BigDecimal> lineTotals) {
        if (lineTotals == null || lineTotals.isEmpty()) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, MONEY_ROUNDING);
        }

        BigDecimal sum = BigDecimal.ZERO.setScale(MONEY_SCALE, MONEY_ROUNDING);
        for (BigDecimal lt : lineTotals) {
            if (lt == null || lt.compareTo(BigDecimal.ZERO) < 0) {
                throw new InvalidBillingAmountException("Line total must be non-negative");
            }
            sum = sum.add(normalizeMoney(lt));
        }
        return sum.setScale(MONEY_SCALE, MONEY_ROUNDING);
    }

    /**
     * Validates that discount is non-negative and does not exceed subtotal.
     *
     * @param subtotal       invoice subtotal
     * @param discountAmount discount to apply
     * @return validated discount amount (coalescing null to zero)
     * @throws InvalidBillingAmountException if subtotal is negative, or discount is negative or exceeds subtotal
     */
    public BigDecimal validateDiscount(BigDecimal subtotal, BigDecimal discountAmount) {
        if (subtotal == null || subtotal.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidBillingAmountException("Subtotal must be non-negative");
        }

        BigDecimal normalizedSubtotal = normalizeMoney(subtotal);
        BigDecimal discount = discountAmount != null
                ? normalizeMoney(discountAmount)
                : BigDecimal.ZERO.setScale(MONEY_SCALE, MONEY_ROUNDING);
        if (discount.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidBillingAmountException("Discount amount cannot be negative");
        }
        if (discount.compareTo(normalizedSubtotal) > 0) {
            throw new InvalidBillingAmountException(
                    String.format("Discount amount (%s) cannot exceed invoice subtotal (%s)", discount, normalizedSubtotal)
            );
        }

        return discount;
    }

    /**
     * Calculates the final invoice total: subtotal - discountAmount.
     *
     * @param subtotal       invoice subtotal
     * @param discountAmount discount amount (null treated as zero)
     * @return final total amount, guaranteed non-negative
     */
    public BigDecimal calculateTotal(BigDecimal subtotal, BigDecimal discountAmount) {
        BigDecimal validDiscount = validateDiscount(subtotal, discountAmount);
        return normalizeMoney(subtotal).subtract(validDiscount).setScale(MONEY_SCALE, MONEY_ROUNDING);
    }

    /**
     * Normalizes a raw payment sum (e.g. from repository JPQL SUM which returns null on empty results).
     *
     * @param rawPaidSum raw aggregate result
     * @return non-negative BigDecimal, never null
     * @throws InvalidBillingAmountException if rawPaidSum is negative
     */
    public BigDecimal normalizePaidAmount(BigDecimal rawPaidSum) {
        if (rawPaidSum == null) {
            return BigDecimal.ZERO.setScale(MONEY_SCALE, MONEY_ROUNDING);
        }
        if (rawPaidSum.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidBillingAmountException("Paid amount cannot be negative");
        }
        return normalizeMoney(rawPaidSum);
    }

    /**
     * Calculates the remaining balance: totalAmount - paidAmount.
     *
     * @param totalAmount final invoice total
     * @param paidAmount  cumulative valid payments
     * @return remaining balance, strictly non-negative
     * @throws BillingValidationException if paidAmount exceeds totalAmount or any parameter is negative
     */
    public BigDecimal calculateBalance(BigDecimal totalAmount, BigDecimal paidAmount) {
        if (totalAmount == null || totalAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidBillingAmountException("Total amount must be non-negative");
        }
        BigDecimal normalizedTotal = normalizeMoney(totalAmount);
        BigDecimal normalizedPaid = normalizePaidAmount(paidAmount);

        if (normalizedPaid.compareTo(normalizedTotal) > 0) {
            throw new BillingValidationException(
                    String.format("Paid amount (%s) cannot exceed invoice total amount (%s)", normalizedPaid, normalizedTotal)
            );
        }

        return normalizedTotal.subtract(normalizedPaid).setScale(MONEY_SCALE, MONEY_ROUNDING);
    }

    /**
     * Validates an incoming payment attempt against the invoice's outstanding balance.
     * Enforces that payment amount is strictly positive and does not exceed remaining balance (BR-10).
     *
     * @param paymentAmount      the payment amount to validate
     * @param outstandingBalance the current unpaid balance of the invoice
     * @throws InvalidBillingAmountException if payment amount is null or <= 0, or balance is null/negative
     * @throws OverpaymentException         if payment amount > outstandingBalance
     */
    public void validatePaymentAmount(BigDecimal paymentAmount, BigDecimal outstandingBalance) {
        if (paymentAmount == null) {
            throw new InvalidBillingAmountException("Payment amount is required");
        }
        if (paymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidBillingAmountException("Payment amount must be strictly greater than zero");
        }
        if (outstandingBalance == null) {
            throw new InvalidBillingAmountException("Outstanding balance is required");
        }
        if (outstandingBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new InvalidBillingAmountException("Outstanding balance cannot be negative");
        }

        if (paymentAmount.compareTo(outstandingBalance) > 0) {
            throw new OverpaymentException(paymentAmount, outstandingBalance);
        }
    }

    /**
     * Recalculates and updates the in-memory monetary fields of an {@link Invoice} using its items,
     * discount, and supplied valid paid amount.
     * <p>
     * Note: This method updates entity in-memory fields only; it does not persist entities
     * and does not modify invoice lifecycle status.
     *
     * @param invoice    target invoice to recalculate
     * @param rawPaidSum raw aggregate paid sum (e.g. from PaymentRepository)
     */
    public void recalculateInvoiceTotals(Invoice invoice, BigDecimal rawPaidSum) {
        if (invoice == null) {
            throw new BillingValidationException("Invoice is required for recalculation");
        }

        BigDecimal subtotal = calculateSubtotal(invoice.getItems());
        BigDecimal discount = invoice.getDiscountAmount() != null
                ? normalizeMoney(invoice.getDiscountAmount())
                : BigDecimal.ZERO.setScale(MONEY_SCALE, MONEY_ROUNDING);
        BigDecimal total = calculateTotal(subtotal, discount);
        BigDecimal paid = normalizePaidAmount(rawPaidSum);
        BigDecimal balance = calculateBalance(total, paid);

        invoice.setSubtotal(subtotal);
        invoice.setDiscountAmount(discount);
        invoice.setTotalAmount(total);
        invoice.setPaidAmount(paid);
        invoice.setBalanceAmount(balance);
    }
}
