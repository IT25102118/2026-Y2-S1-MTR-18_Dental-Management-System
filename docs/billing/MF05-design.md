# MF-05 Billing and Payment Management — Working Design Contract

> **Document Status: PLANNED DESIGN CONTRACT**  
> **Baseline:** Canonical DentCare Concept and Requirements Specification Version 1.3  
> **Module:** MF-05 Billing and Payment Management (Academic Period: Year 2, Semester 1 - 2026)  
> **Implementation Notice:** This document defines planned technical specifications, architectural boundaries, and design contracts. It represents planning baseline knowledge, not implementation proof that source code, database migrations, or live deployment have been completed.

---

## 1. Purpose and Version 1.0 Scope

The **Billing and Payment Management (MF-05)** module is responsible for managing patient charges, producing itemized invoices for clinic treatments and services, recording patient payments, tracking outstanding balances, generating receipts, and providing income summaries for clinic operations.

### In-Scope Capabilities (Version 1.0)
* **Invoice Creation:** Creating invoices associated with a registered patient.
* **Itemized Charges:** Adding one or more clinic services or treatment procedures as invoice line items.
* **Financial Calculations:** Authoritative server-side calculation of line totals, subtotal, discounts, final invoice total, paid amount, and outstanding balance.
* **Payment Recording:** Recording full and partial patient payments against issued invoices.
* **Payment Methods:** Recording payments using four standard clinic methods: `CASH`, `CARD`, `BANK_TRANSFER`, and `OTHER`.
* **Receipt Generation:** Providing a printable or displayable receipt for recorded payments.
* **History Preservation:** Maintaining complete chronological records of invoices and payments without destructive deletion.
* **Search and Filtering:** Searching and filtering invoices by patient, date range, or lifecycle status.
* **Lifecycle Management:** Enforcing valid status transitions across `DRAFT`, `UNPAID`, `PARTIALLY_PAID`, `PAID`, and `CANCELLED`.
* **Financial Summaries:** Providing daily and monthly income summaries to clinic administrators.

### Out-of-Scope Exclusions (Version 1.0)
* **Online Payment Gateways:** No integration with external payment gateways (e.g., Stripe, PayPal, or Internet Payment Gateways). Payments are recorded manually by clinic staff upon physical or bank receipt.
* **Automated Credit Card Processing:** DentCare does not process credit cards directly; it records card payments verified at the clinic counter.
* **Insurance Claim Management:** Third-party insurance billing, automated claim submission, and EDI processing are excluded from Version 1.0.
* **Multi-Currency Operations:** All billing operates in the clinic's single default currency.
* **Patient Self-Payment:** Patients do not submit payments through the patient portal in Version 1.0; they have read-only access to view their bills, receipts, and balances.

---

## 2. Actors and Authorization

Access to billing and payment functions adheres strictly to the canonical five-role security baseline of DentCare (`ADMINISTRATOR`, `RECEPTIONIST`, `DENTIST`, `DENTAL_ASSISTANT`, `PATIENT`).

| Role | Planned Billing Permissions | Planned Scope & Boundaries |
|---|---|---|
| **Receptionist** | Full operational access | Create invoices, add items, issue invoices, record full/partial payments, issue receipts, view clinic billing records. |
| **Administrator** | Full operational & oversight access | All Receptionist capabilities, plus clinic-wide financial reporting, daily/monthly income summaries, and authorization of cancellations/corrections. |
| **Patient** | Restricted read-only access | View personal invoices, payment history, outstanding balance, and personal payment receipts only. |
| **Dentist** | Contextual read-only access | View billing status of treatments/procedures associated with their patients (if authorized). |
| **Dental Assistant** | No billing access | No operational billing or payment permissions. |

### Operational Stakeholder Mapping (Anti-Assumption Rule)
Project concept documents identify two function-specific stakeholders for billing:
1. **Accounts Clerk / Cashier** (creates invoices, records payments, issues receipts).
2. **Clinic Owner / Financial Manager** (reviews financial summaries, monitors balances).

In Version 1.0, **no new authentication login roles are created** for these titles. Operational tasks for the Accounts Clerk / Cashier are performed under the `RECEPTIONIST` role, while management oversight tasks for the Clinic Owner / Financial Manager are performed under the `ADMINISTRATOR` role.

### Patient Ownership Invariant
Backend authorization is authoritative. A patient user (`ROLE_PATIENT`) must **never** be permitted to view, query, or modify another patient's invoices or payments. Any cross-patient query attempt must be rejected with an HTTP 403 Forbidden response.

---

## 3. Requirement Mapping

The following table maps canonical functional requirements (FR-BIL-01 through FR-BIL-08) to their planned architectural responsibilities:

| Requirement ID | Requirement Description | Planned Architectural Responsibility |
|---|---|---|
| **FR-BIL-01** | The system shall create an invoice containing one or more service or treatment items. | `Invoice` and `InvoiceItem` domain entities; validation rule requiring at least one item before invoice issue (`BR-09`). |
| **FR-BIL-02** | The system shall calculate line totals, subtotal, discount, final total, paid amount and remaining balance. | Billing calculation engine in `BillingCalculationService`; server-side authoritative formulas; non-negative balance invariant. |
| **FR-BIL-03** | The system shall record full and partial payments using Cash, Card, Bank Transfer or Other. | `Payment` entity; `PaymentMethod` enum; transactional payment recording service with balance deduction. |
| **FR-BIL-04** | The system shall reject a payment that exceeds the outstanding balance. | Transactional validation check (`BR-10`); payment amount must be strictly greater than zero and less than or equal to outstanding balance. |
| **FR-BIL-05** | The system shall manage Draft, Unpaid, Partially Paid, Paid and Cancelled invoice statuses. | `InvoiceStatus` enum; status transition state machine; financial state determines `UNPAID`, `PARTIALLY_PAID`, and `PAID`. |
| **FR-BIL-06** | The system shall preserve paid and cancelled invoices in history. | Data preservation rule (`BR-11`, `BR-14`); no physical deletion; immutable historical audit trail. |
| **FR-BIL-07** | The system shall generate a printable receipt for recorded payments. | Receipt data transfer object (`ReceiptResponse`) and printable presentation component (`UI-BIL-04`). |
| **FR-BIL-08** | The system shall provide daily and monthly income summaries. | Aggregate revenue queries in `PaymentRepository`; reporting service and summary dashboard view (`UI-BIL-05`). |

---

## 4. Canonical Data Model

The planned data model consists of three core domain entities: `Invoice`, `InvoiceItem`, and `Payment`.

```
+-------------------------------------------------------------+
|                           Invoice                           |
+-------------------------------------------------------------+
| id: Long (PK)                                               |
| invoiceNumber: String (Unique, e.g., INV-2026-0001)         |
| patientId: Long (FK -> Patient/User)                        |
| treatmentPlanId: Long (Optional FK -> TreatmentPlan)        |
| invoiceDate: LocalDate                                      |
| subtotal: BigDecimal                                        |
| discountAmount: BigDecimal                                  |
| totalAmount: BigDecimal                                     |
| paidAmount: BigDecimal                                      |
| balanceAmount: BigDecimal                                   |
| status: InvoiceStatus (Enum)                                |
| notes: String                                               |
| issuedAt: LocalDateTime                                     |
| createdAt: LocalDateTime                                    |
| updatedAt: LocalDateTime                                    |
| createdBy: Long                                             |
+-------------------------------------------------------------+
                              | 1
                              |
                              | has N
                              v
+-------------------------------------------------------------+
|                         InvoiceItem                         |
+-------------------------------------------------------------+
| id: Long (PK)                                               |
| invoiceId: Long (FK -> Invoice)                             |
| treatmentProcedureId: Long (Optional FK -> Procedure)       |
| description: String                                         |
| quantity: Integer                                           |
| unitPrice: BigDecimal                                       |
| lineTotal: BigDecimal                                       |
+-------------------------------------------------------------+

                              | 1
                              |
                              | has N
                              v
+-------------------------------------------------------------+
|                           Payment                           |
+-------------------------------------------------------------+
| id: Long (PK)                                               |
| invoiceId: Long (FK -> Invoice)                             |
| paymentNumber: String (Unique, e.g., REC-2026-0001)         |
| amount: BigDecimal                                          |
| paymentMethod: PaymentMethod (Enum)                         |
| paymentReference: String (Optional slip/cheque ref)         |
| paidAt: LocalDateTime                                       |
| recordedBy: Long (User ID)                                  |
| status: PaymentStatus (Enum: RECORDED, REVERSED) [rec.]     |
| reversalOfPaymentId: Long (Optional self-ref) [rec.]        |
| reversalReason: String [rec.]                               |
+-------------------------------------------------------------+
```

### 4.1 Invoice Entity
* `id`: Unique surrogate primary key.
* `invoiceNumber`: Human-readable unique clinic invoice identifier (canonical required).
* `patientId`: Reference to the patient receiving charges (canonical required).
* `treatmentPlanId`: Optional reference to clinical treatment plan (conditional integration).
* `invoiceDate`: Date of invoice issuance (canonical required).
* `subtotal`: Sum of all item line totals before discount (canonical required).
* `discountAmount`: Total discount applied, non-negative (canonical required).
* `totalAmount`: Final payable amount after discount (canonical required).
* `paidAmount`: Cumulative sum of valid recorded payments (canonical required).
* `balanceAmount`: Current outstanding balance (`totalAmount - paidAmount`) (canonical required).
* `status`: Lifecycle status (`InvoiceStatus`) (canonical required).
* `notes`: Optional clinical or administrative remarks (planned).
* `issuedAt`: Timestamp when status transitioned from `DRAFT` to `UNPAID` (planned).
* `createdAt`, `updatedAt`, `createdBy`: Standard audit timestamps and user attribution.

### 4.2 InvoiceItem Entity
* `id`: Unique primary key.
* `invoiceId`: Foreign key to parent `Invoice` (canonical required).
* `treatmentProcedureId`: Optional reference to completed clinical procedure from MF-03 (conditional integration).
* `description`: Clear description of the service, treatment, or clinic item (canonical required).
* `quantity`: Numeric units billed; strictly positive integer (`quantity >= 1`) (canonical required).
* `unitPrice`: Unit cost; non-negative decimal (`unitPrice >= 0.00`) (canonical required).
* `lineTotal`: Calculated item charge (`quantity * unitPrice`) (canonical required).

### 4.3 Payment Entity
* `id`: Unique primary key.
* `invoiceId`: Foreign key to target `Invoice` (canonical required).
* `paymentNumber`: Human-readable receipt/payment number (planned).
* `amount`: Paid monetary value; strictly positive decimal (`amount > 0.00`) (canonical required).
* `paymentMethod`: Recorded payment method (`PaymentMethod`) (canonical required).
* `paymentReference`: Optional external transaction reference (e.g., bank transfer reference, card terminal approval code) (planned).
* `paidAt`: Timestamp when payment was collected (canonical required).
* `recordedBy`: User ID of staff member recording the transaction (canonical required).
* `status`: Operational status of the payment record (`RECORDED`, `REVERSED`) (*recommended design refinement*).
* `reversalOfPaymentId`: Optional reference to original payment if this entry is a reversing correction (*recommended design refinement*).
* `reversalReason`: Explanation required when a payment is marked reversed (*recommended design refinement*).

---

## 5. Enums and Lifecycle Statuses

### 5.1 InvoiceStatus Enum
The canonical invoice lifecycle statuses are strictly defined as:
* `DRAFT`: Invoice is being composed; items may be added, updated, or removed; not yet finalized or issued to the patient.
* `UNPAID`: Invoice has been finalized and issued with at least one item; no payments have been applied; `paidAmount = 0.00`, `balanceAmount = totalAmount`.
* `PARTIALLY_PAID`: One or more valid payments have been recorded, but an outstanding balance remains; `0.00 < paidAmount < totalAmount`, `balanceAmount > 0.00`.
* `PAID`: Cumulative valid payments equal the invoice total; `paidAmount = totalAmount`, `balanceAmount = 0.00`.
* `CANCELLED`: Invoice has been voided by authorized staff; retained permanently in history for accounting auditability.

### 5.2 PaymentMethod Enum
The canonical payment methods are strictly limited to:
* `CASH`: Physical currency received at clinic counter.
* `CARD`: Credit or debit card processed via physical clinic POS terminal.
* `BANK_TRANSFER`: Direct clinic bank account transfer verified by reference/slip.
* `OTHER`: Other accepted physical clinic payment instrument (e.g., cheque, voucher).

### 5.3 PaymentStatus Enum (Recommended Refinement)
To fulfill the requirement that payments require controlled correction rather than silent deletion:
* `RECORDED`: Active payment transaction included in invoice balance calculation.
* `REVERSED`: Compensated payment entry; excluded from invoice paid amount.

---

## 6. Financial Calculation Rules

All calculations are enforced authoritatively on the backend server. Client-side calculations are used solely for immediate UI preview.

### Calculation Formulas
1. **Line Total:**  
   $$\text{lineTotal} = \text{quantity} \times \text{unitPrice}$$
2. **Subtotal:**  
   $$\text{subtotal} = \sum_{i=1}^{n} \text{lineTotal}_i$$
3. **Total Amount:**  
   $$\text{totalAmount} = \max(0.00, \text{subtotal} - \text{discountAmount})$$
4. **Paid Amount:**  
   $$\text{paidAmount} = \sum \text{amount of all active (RECORDED) payments}$$
5. **Remaining Balance:**  
   $$\text{balanceAmount} = \text{totalAmount} - \text{paidAmount}$$

### Invariants and Mathematical Constraints
* **Positive Quantity:** Quantity must be an integer $\ge 1$.
* **Non-Negative Unit Price:** Unit price must be $\ge 0.00$.
* **Non-Negative Discount:** Discount amount must be $\ge 0.00$ and cannot exceed the subtotal ($\text{discountAmount} \le \text{subtotal}$).
* **Strictly Positive Payment:** Every recorded payment must have $\text{amount} > 0.00$.
* **No Overpayment (BR-10):** A payment cannot exceed the invoice's current outstanding balance ($\text{amount} \le \text{balanceAmount}$).
* **Non-Negative Balance Invariant:** The remaining balance must never become negative ($\text{balanceAmount} \ge 0.00$).
* **Rounding and Precision:** Monetary values use standard 2-decimal scale (`BigDecimal` with `RoundingMode.HALF_UP`).

---

## 7. Invoice Lifecycle and State Machine

```
              [Create Draft]
                    |
                    v
               +---------+
               |  DRAFT  | <------- (Items editable)
               +---------+
                    |
                    | [Issue Invoice] (Requires >= 1 item, BR-09)
                    v
               +---------+
    +--------> | UNPAID  | ----------------------------+
    |          +---------+                             |
    |               |                                  |
    |               | [Record Partial Payment]         |
    |               v                                  |
    |          +----------------+                      | [Cancel Invoice]
    |          | PARTIALLY_PAID |                      | (Authorized Staff,
    |          +----------------+                      |  BR-11, BR-14)
    | [Payment      |                                  |
    |  Reversal]    | [Record Final Payment]           |
    |               v                                  v
    |          +---------+                       +-----------+
    +--------- |  PAID   |                       | CANCELLED |
               +---------+                       +-----------+
                    |                                  |
            (Cannot edit items)               (Immutable history)
```

### Lifecycle Transition Rules
1. **Creation:** An invoice begins in `DRAFT` status.
2. **Issuance:** Moving from `DRAFT` to `UNPAID` requires at least one valid invoice line item (`BR-09`).
3. **Payment Application:**
   * When `paidAmount > 0.00` and `paidAmount < totalAmount`, status transitions to `PARTIALLY_PAID`.
   * When `paidAmount == totalAmount` and `balanceAmount == 0.00`, status transitions to `PAID`.
4. **Paid Invariant:** An invoice in `PAID` status cannot be freely modified, cannot have items added or removed, and cannot be directly cancelled.
5. **Cancellation:**
   * Only `DRAFT`, `UNPAID`, or `PARTIALLY_PAID` invoices can be cancelled (with appropriate payment reversal if partially paid).
   * Cancelled invoices cannot receive new payments and cannot transition to any other status.
6. **History Preservation (BR-11, BR-14):** `PAID` and `CANCELLED` invoices are never physically deleted from the database.

---

## 8. Payment Correction Model

In compliance with canonical business rules (`BR-14` and Section 7.5 CRUD interpretation), financial transactions must not be silently edited or deleted.

### Controlled Reversal Workflow
* **No In-Place Deletion:** A payment record cannot be removed via `DELETE`.
* **Compensating Reversal:** To correct an erroneous payment, an authorized user (`ADMINISTRATOR` or authorized `RECEPTIONIST`) initiates a reversal.
* **Audit Tracking:** The reversal records the responsible user ID, a timestamp, and a mandatory explanatory reason (`reversalReason`).
* **Transactional Recalculation:** Upon marking a payment `REVERSED`, the system atomically recalculates the parent invoice's `paidAmount`, `balanceAmount`, and updates the invoice status (e.g., from `PAID` back to `PARTIALLY_PAID`, or from `PARTIALLY_PAID` back to `UNPAID`).

---

## 9. Transaction Boundaries and Financial Integrity

To prevent concurrency hazards and balance corruption, all billing mutations must execute within strict database transaction boundaries.

### Planned Atomic Operations (`@Transactional`)
1. **Invoice Issuance:** Validates line items, executes calculation, assigns invoice number, and updates status to `UNPAID`.
2. **Payment Recording:**
   * Acquires lock on parent `Invoice`.
   * Validates `payment.amount <= invoice.balanceAmount`.
   * Persists `Payment` record.
   * Updates `invoice.paidAmount` and `invoice.balanceAmount`.
   * Updates `invoice.status` to `PARTIALLY_PAID` or `PAID`.
3. **Payment Reversal:**
   * Acquires lock on parent `Invoice`.
   * Validates payment status is `RECORDED`.
   * Marks payment as `REVERSED`.
   * Recalculates invoice `paidAmount` and `balanceAmount`.
   * Adjusts invoice status accordingly.
4. **Invoice Cancellation:** Updates status to `CANCELLED` and marks cancellation reason and timestamp.

### Database Constraints (Target Schema Planning)
* `CHECK (quantity > 0)` on `invoice_items`.
* `CHECK (unit_price >= 0.00)` on `invoice_items`.
* `CHECK (amount > 0.00)` on `payments`.
* `CHECK (balance_amount >= 0.00)` on `invoices`.
* `UNIQUE (invoice_number)` on `invoices`.

---

## 10. Integration Boundaries

### 10.1 Patient Records Management (MF-01)
* Invoices reference a patient via `patientId`.
* MF-05 must not duplicate patient demographic data or manage patient profiles.
* *Current Discovery Note:* Because MF-01 is currently a skeleton package (`.gitkeep`), MF-05 uses `patientId` referencing the confirmed `users` entity or future `patients` table without blocking on MF-01 completion.

### 10.2 Clinical Examination & Treatment Plan Management (MF-03)
* Invoices may optionally reference a `treatmentPlanId`.
* Invoice line items may optionally reference a `treatmentProcedureId` to represent billed clinical procedures.
* *Current Discovery Note:* Because MF-03 is currently a skeleton package (`.gitkeep`), these foreign references remain nullable/optional so that direct clinic service billing (e.g., general consultation, cleaning) can be performed independently.

### 10.3 Shared System Services
* **Authentication / Authorization:** Consumes standard Spring Security context (`DentCareUserDetails`, `Role`).
* **Audit Logging:** Emits audit records for invoice issuance, payment recording, reversals, and cancellations.
* **Document Generation:** Provides structured data for printable invoices and receipts.

---

## 11. Planned API Resource Groups

The planned REST API adheres to canonical resource groups. Exact endpoint URLs and payloads are proposed designs.

### 11.1 Invoice Endpoints (`/api/invoices`)
* `GET /api/invoices`: Paginated invoice search with filters (`patientId`, `status`, `startDate`, `endDate`). (Receptionist, Admin)
* `POST /api/invoices`: Create new invoice in `DRAFT` status. (Receptionist, Admin)
* `GET /api/invoices/{id}`: Retrieve detailed invoice with line items and payment history. (Receptionist, Admin, or owning Patient)
* `PUT /api/invoices/{id}`: Update draft invoice details and line items. (Receptionist, Admin; restricted to `DRAFT` status)
* `POST /api/invoices/{id}/issue`: Issue draft invoice to `UNPAID` status. (Receptionist, Admin)
* `POST /api/invoices/{id}/cancel`: Cancel invoice. (Receptionist, Admin)
* `GET /api/invoices/my`: Retrieve invoices for the currently authenticated patient. (Patient)

### 11.2 Payment Endpoints (`/api/payments`)
* `POST /api/payments`: Record a new payment against an issued invoice. (Receptionist, Admin)
* `GET /api/payments/{id}`: Retrieve payment details. (Receptionist, Admin, or owning Patient)
* `GET /api/payments/{id}/receipt`: Generate printable receipt payload. (Receptionist, Admin, or owning Patient)
* `POST /api/payments/{id}/reverse`: Record a controlled reversal for an erroneous payment. (Admin, authorized Receptionist)

### 11.3 Income Summary Endpoints (`/api/billing/reports`)
* `GET /api/billing/reports/daily-summary`: Daily income metrics by payment method. (Admin, Receptionist)
* `GET /api/billing/reports/monthly-summary`: Monthly income metrics, total billed, total collected, and outstanding receivables. (Admin)

---

## 12. Planned UI Screen Mapping

| Screen ID | Screen Name | Planned Access | Purpose & Features |
|---|---|---|---|
| **UI-BIL-01** | Invoice List | Receptionist, Admin, Patient (own) | Searchable, filterable table of invoices showing invoice number, patient, date, total, paid, balance, and status badge. |
| **UI-BIL-02** | Invoice Form | Receptionist, Admin | Form to create/edit draft invoices; dynamic line item entry (procedure, description, quantity, price); discount field; live subtotal/total preview. |
| **UI-BIL-03** | Payment Dialog / Form | Receptionist, Admin | Modal/form to record payments; displays current balance; validates payment amount $\le$ balance; selects payment method; enters reference. |
| **UI-BIL-04** | Receipt & Invoice Print View | Receptionist, Patient (own) | Clean printable view showing clinic header, invoice details, item table, payment transactions, outstanding balance, and clinic footer. |
| **UI-BIL-05** | Balances & Income Summary | Admin, Receptionist (operational) | Financial dashboard showing daily collections by payment method, monthly revenue aggregates, and total clinic outstanding balances. |

---

## 13. Validation Rules and Negative Paths

Authoritative server-side validation must reject invalid input with clear error feedback:

| Scenario / Negative Path | Trigger Condition | Expected System Behavior |
|---|---|---|
| **Empty Invoice Issuance** | Issuing an invoice with 0 line items | 400 Bad Request; rejection under `BR-09`. |
| **Non-Positive Quantity** | Item quantity $\le 0$ | 400 Bad Request; validation failure. |
| **Negative Unit Price** | Item unit price $< 0.00$ | 400 Bad Request; validation failure. |
| **Excessive Discount** | Discount amount $< 0.00$ or $>$ subtotal | 400 Bad Request; validation failure. |
| **Overpayment** | Payment amount $>$ current remaining balance | 400 Bad Request; rejection under `BR-10`. |
| **Zero or Negative Payment** | Payment amount $\le 0.00$ | 400 Bad Request; validation failure. |
| **Payment on Ineligible Invoice** | Recording payment on `DRAFT`, `PAID`, or `CANCELLED` invoice | 400 Bad Request; rejection with state error. |
| **Cancellation of Paid Invoice** | Attempting to cancel an invoice in `PAID` status | 400 Bad Request; rejection. |
| **Modifying Finalized Invoice** | Editing line items of `PAID` or `CANCELLED` invoice | 400 Bad Request; mutation blocked. |
| **Unauthorized Role Access** | Patient attempting to create invoice or record payment | 403 Forbidden. |
| **Cross-Patient Data Access** | Patient requesting invoice of another patient | 403 Forbidden; rejection under `BR-15`. |
| **Silent Payment Deletion** | Attempting to HTTP `DELETE` a payment record | 405 Method Not Allowed / 400 Bad Request; corrections must use reversal. |

---

## 14. Planned Testing Strategy

### 14.1 Backend Unit Tests
* Calculation formulas: verify line total, subtotal, discount, total, paid amount, and balance precision across edge values.
* Lifecycle state machine: test valid and invalid state transitions (`DRAFT` $\to$ `UNPAID` $\to$ `PARTIALLY_PAID` $\to$ `PAID`).
* Balance validation: test rejection of overpayments and non-positive payments.

### 14.2 Backend Integration & Repository Tests
* Database constraints: verify non-negative balance and unique invoice number constraints in H2/MySQL.
* Concurrency tests: simulate concurrent payments against the same invoice to ensure balance never drops below zero.
* Transactional rollback: verify that a failure during payment recording rolls back balance and status updates.

### 14.3 API & Security Controller Tests
* Role-based access control: verify `RECEPTIONIST` and `ADMINISTRATOR` can access billing endpoints, while `PATIENT` is restricted to personal data and `DENTAL_ASSISTANT` is denied.
* Cross-patient access protection: verify that requesting another patient's invoice returns 403 Forbidden.

### 14.4 Frontend Component Tests
* Invoice form validation: verify error display on empty line items or negative values.
* Payment modal validation: verify overpayment error is shown before submission.
* Receipt view: verify accurate data rendering for printing.

---

## 15. Current Repository Gaps and Dependencies

The preceding discovery phase on branch `IT25102123` identified the following baseline state:
* **Backend:** `com.dentcare.billing` package contains only `.gitkeep`; no billing entities, DTOs, repositories, services, or controllers exist.
* **Frontend:** `features/billing` contains only `.gitkeep`; no billing components, pages, or API clients exist.
* **Database:** `database/migrations/` contains auth and inventory migrations; no billing migrations exist.
* **Security:** `SecurityConfig.java` has not yet configured `/api/invoices/**` or `/api/payments/**` authorization rules.
* **Upstream Modules:** MF-01 (`Patient`) and MF-03 (`Clinical / Treatment`) are currently placeholder directories. MF-05 design decouples these dependencies via optional identifier references (`patientId`, `treatmentPlanId`, `treatmentProcedureId`).
* **Remote Git Publishing:** Remote publishing to `origin/IT25102123` is temporarily blocked pending host GitHub credential configuration.

---

## 16. Explicit Non-Goals

To maintain strict alignment with DentCare Version 1.0 scope:
1. **No External Payment Gateway:** No credit card payment gateways, Stripe SDKs, or online transaction webhooks.
2. **No Patient Payment Submission:** Patients cannot submit payments online in Version 1.0.
3. **No Insurance Claim Processing:** No third-party payer integration, claim tracking, or co-pay rules.
4. **No Inventory Procurement Billing:** Inventory purchasing (supplier invoicing) is handled separately from patient billing.
5. **No Additional Authentication Roles:** No dedicated login accounts for Cashier, Billing Clerk, or Financial Manager; existing `RECEPTIONIST` and `ADMINISTRATOR` roles are used.
