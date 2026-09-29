/**
 * MF-05 Billing and Payment Management domain types and enums.
 * Mirrors backend DTO contracts and enums exactly without client-side calculation assumptions.
 */

/**
 * Authoritative lifecycle status for invoices (MF-05).
 * Follows: DRAFT -> UNPAID -> PARTIALLY_PAID -> PAID, with CANCELLED for voided invoices.
 */
export const InvoiceStatus = Object.freeze({
  DRAFT: 'DRAFT',
  UNPAID: 'UNPAID',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED'
});

/**
 * Authoritative payment methods accepted at the clinic (MF-05).
 */
export const PaymentMethod = Object.freeze({
  CASH: 'CASH',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  OTHER: 'OTHER'
});

/**
 * Authoritative lifecycle status for payments (MF-05).
 */
export const PaymentStatus = Object.freeze({
  RECORDED: 'RECORDED',
  REVERSED: 'REVERSED'
});

/**
 * @typedef {Object} InvoiceItemRequest
 * @property {number} [treatmentProcedureId] Optional reference to upstream clinical procedure
 * @property {string} description Line item description
 * @property {number} quantity Number of units (integer >= 1)
 * @property {number|string} unitPrice Price per unit (>= 0.00)
 */

/**
 * @typedef {Object} CreateInvoiceRequest
 * @property {number} patientId ID of the patient being billed
 * @property {number} [treatmentPlanId] Optional treatment plan ID
 * @property {string} [invoiceDate] ISO-8601 calendar date (YYYY-MM-DD)
 * @property {InvoiceItemRequest[]} items Line items
 * @property {number|string} [discountAmount] Non-negative discount amount
 * @property {string} [notes] Optional invoice notes
 */

/**
 * @typedef {Object} UpdateDraftInvoiceRequest
 * @property {number} [treatmentPlanId] Optional treatment plan ID
 * @property {string} [invoiceDate] ISO-8601 calendar date (YYYY-MM-DD)
 * @property {InvoiceItemRequest[]} items Line items
 * @property {number|string} [discountAmount] Non-negative discount amount
 * @property {string} [notes] Optional invoice notes
 */

/**
 * @typedef {Object} InvoiceItemResponse
 * @property {number} id Item identifier
 * @property {number|null} treatmentProcedureId Associated clinical procedure ID
 * @property {string} description Line item description
 * @property {number} quantity Quantity
 * @property {number} unitPrice Unit price
 * @property {number} totalPrice Authoritative computed total for line
 */

/**
 * @typedef {Object} InvoiceResponse
 * @property {number} id Invoice ID
 * @property {string} invoiceNumber Human-readable invoice number (e.g. INV-YYYY-NNNN)
 * @property {number} patientId Patient identifier
 * @property {number|null} treatmentPlanId Treatment plan ID
 * @property {string} invoiceDate Invoice date (YYYY-MM-DD)
 * @property {InvoiceItemResponse[]} items Itemized charges
 * @property {number} subtotal Sum of item totals before discount
 * @property {number} discountAmount Applied discount
 * @property {number} totalAmount Authoritative total after discount
 * @property {number} paidAmount Cumulative valid recorded payments
 * @property {number} balanceAmount Authoritative outstanding balance
 * @property {string} status Invoice lifecycle status (InvoiceStatus)
 * @property {string|null} notes Additional notes
 * @property {string|null} issuedAt Timestamp when issued
 * @property {string} createdAt Creation timestamp
 * @property {string} updatedAt Last update timestamp
 * @property {number} createdBy Staff user ID who created invoice
 * @property {PaymentResponse[]} payments Recorded payments
 */

/**
 * @typedef {Object} RecordPaymentRequest
 * @property {number|string} amount Payment amount (> 0.00)
 * @property {string} paymentMethod Payment method (PaymentMethod)
 * @property {string} [paymentReference] Optional transaction/receipt reference
 */

/**
 * @typedef {Object} ReversePaymentRequest
 * @property {string} reason Required audit justification for reversal
 */

/**
 * @typedef {Object} PaymentResponse
 * @property {number} id Payment ID
 * @property {number} invoiceId Parent invoice ID
 * @property {string} paymentNumber Human-readable receipt number (e.g. REC-YYYY-NNNN)
 * @property {number} amount Payment amount
 * @property {string} paymentMethod Payment method (PaymentMethod)
 * @property {string|null} paymentReference Optional external reference
 * @property {string} paidAt Timestamp when payment was recorded
 * @property {string} status Payment status (PaymentStatus)
 * @property {string|null} reversalReason Reversal explanation if reversed
 * @property {number|null} reversalOfPaymentId Pointer to original payment if reversal record
 * @property {number} recordedBy Staff user ID who recorded/reversed payment
 * @property {string} createdAt Creation timestamp
 */

/**
 * @typedef {Object} ReceiptResponse
 * @property {number} paymentId Database identifier of the payment
 * @property {string} paymentNumber Human-readable payment/receipt number
 * @property {number} invoiceId Parent invoice database ID
 * @property {string} invoiceNumber Human-readable parent invoice number
 * @property {number} patientId Patient identifier
 * @property {number} paymentAmount Amount paid
 * @property {string} paymentMethod Method of payment (PaymentMethod)
 * @property {string|null} paymentReference Transaction or check reference
 * @property {string} paidAt Timestamp when payment occurred
 * @property {number} invoiceTotalAmount Total invoice amount
 * @property {number} remainingBalance Remaining balance on parent invoice
 * @property {number} recordedBy Staff user ID who captured payment
 */

/**
 * @typedef {Object} IncomeSummaryResponse
 * @property {string} startDate Reporting period start date (YYYY-MM-DD)
 * @property {string} endDate Reporting period end date (YYYY-MM-DD, half-open boundary)
 * @property {number} totalIncome Total clinic revenue from RECORDED payments
 * @property {Object.<string, number>} breakdownByMethod Revenue breakdown by PaymentMethod
 */
