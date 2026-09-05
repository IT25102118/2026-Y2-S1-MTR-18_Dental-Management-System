# MF-06 Inventory Management — Working Design Contract

## 1. Purpose and Scope

This document serves as the authoritative working technical design contract for **MF-06 Inventory Management** in DentCare Version 1.0. It defines the inventory domain models, business constraints, stock movement rules, validation logic, authorization boundaries, and integration points that subsequent backend and frontend implementation steps must adhere to.

### In-Scope Capabilities
* Inventory item registration
* Categorization
* Search and filtering
* Item updates
* Activation / deactivation
* Quantity tracking
* Reorder levels
* Batch information (where adopted)
* Expiry dates
* Stock movement history
* Low-stock alerts
* Expiry alerts
* Responsible-user tracking
* Optional supplier references
* Optional linkage between clinical material usage and Inventory stock movements

### Out-of-Scope Exclusions (Version 1.0)
* Full supplier management
* Purchase orders
* Procurement workflow
* Supplier accounts
* Dental laboratory tracking
* Multi-branch inventory

---

## 2. InventoryItem

The `InventoryItem` represents a catalog item managed within the dental practice inventory.

### Planned Fields
* `id`: Unique identifier
* `itemCode`: Unique business identifier/code for the item
* `name`: Descriptive item name
* `category`: Categorization/grouping for the item
* `unit`: Measurement unit (e.g., box, piece, bottle, pack)
* `reorderLevel`: Minimum stock threshold triggering low-stock alert
* `active`: Boolean flag indicating operational status
* `defaultSupplierReference`: Optional reference only (e.g., supplier name or reference code)

### Lifecycle Rules
* Physical deletion is not the normal lifecycle operation when historical movements exist.
* Inventory items with historical stock movements must be deactivated (`active = false`) rather than physically deleted, preserving full audit and historical integrity.

---

## 3. InventoryBatch — Conditional Design

**Status: TO BE CONFIRMED / recommended design**

`InventoryBatch` is proposed to support batch-level tracking, serial/lot numbers, and specific batch expiration dates.

### Proposed Fields (if adopted)
* `id`: Unique identifier
* `inventoryItemId`: Reference to the parent `InventoryItem`
* `batchNumber`: Manufacturer or internal batch/lot identifier
* `expiryDate`: Expiration date for the specific batch
* `quantityOnHand`: Quantity remaining in this specific batch
* `receivedDate`: Date the batch was received
* `supplierReference`: Optional supplier reference for the batch

### Proposed Relationship
`InventoryItem 1:N InventoryBatch`

*Note: The project team must explicitly confirm whether separate batch-level quantity and expiry tracking will be implemented before database schema and JPA entity mappings are frozen.*

---

## 4. StockMovement

`StockMovement` records every change to stock levels for full traceability and auditability.

### Planned Fields
* `id`: Unique identifier
* `inventoryItemId`: Reference to `InventoryItem`
* `batchId`: Optional/conditional on batch design adoption
* `movementType`: Type of movement (must be one of the allowed types below)
* `quantity`: Numeric quantity moved (must be > 0)
* `occurredAt`: Timestamp when movement occurred
* `reason`: Reason or notes describing the movement
* `treatmentProcedureId`: Optional link to clinical treatment procedure
* `responsibleUserId`: Reference to user recording the movement
* `reversalOfMovementId`: Optional link to original movement if this is a correction/reversal

### Allowed Stock Movement Types
The allowed stock movement types are strictly limited to:
* `RECEIVED`
* `USED`
* `DAMAGED`
* `ADJUSTED`
* `EXPIRED`

---

## 5. Quantity Effects

Each stock movement type impacts stock availability according to fixed rules:

* `RECEIVED`: Increases stock (+).
* `USED`: Decreases stock (-).
* `DAMAGED`: Decreases stock (-).
* `EXPIRED`: Decreases stock (-).
* `ADJUSTED`: Performs a controlled recorded correction (+ or -) and requires a detailed reason.

### Negative-Stock Invariant
A movement that removes stock (`USED`, `DAMAGED`, `EXPIRED`, or negative `ADJUSTED`) must **never** cause available stock to become negative. Any operation attempting to deduct more stock than available must be rejected by server-side validation.

---

## 6. Stock Balance Source of Truth

* Stock changes must originate from auditable `StockMovement` records.
* If a `quantityOnHand` field is cached/stored on `InventoryItem` or `InventoryBatch` for performance or convenience, it must be transactionally maintained from accepted stock movements and must **not** become an independently editable competing source of truth.

---

## 7. Transaction and Concurrency Rule

* Stock availability validation and the resulting stock movement/balance update must occur inside a single backend database transaction boundary.
* **Concurrency Invariant:** Two concurrent stock-out operations must not both succeed if their combined requested quantity exceeds the actual available stock.
* The exact concurrency control mechanism (e.g., pessimistic locking, optimistic locking, or database constraints) will be selected during technical implementation design.

---

## 8. Validation Rules

Server-side validation is authoritative and enforces the following rules at minimum:

1. **Item Name:** Required and non-blank.
2. **Unit:** Required and non-blank.
3. **Reorder Level:** Required; must be greater than or equal to zero (`reorderLevel >= 0`).
4. **Movement Quantity:** Must be strictly greater than zero (`quantity > 0`).
5. **Expiry Date:** Must be a valid date where applicable.
6. **Movement Type:** Must strictly match one of the 5 allowed values (`RECEIVED`, `USED`, `DAMAGED`, `ADJUSTED`, `EXPIRED`).
7. **Stock-Out Limits:** `USED`, `DAMAGED`, and `EXPIRED` quantities cannot exceed currently available stock.
8. **Responsible User:** Responsible user ID must be recorded on every stock movement.
9. **Referenced Entities:** Referenced item, batch (if adopted), and treatment procedure must exist where specified.
10. **Active Status:** Inactive items (`active = false`) must not appear in normal stock-movement selection for stock-out operations.
11. **Authoritative Enforcement:** All business and validation rules must be enforced on the backend server.

---

## 9. Low-Stock and Expiry Alerts

### Low-Stock Alerts
A low-stock alert condition is triggered when:
`availableQuantity <= reorderLevel`

### Expiry Alerts
* **Exact "expiring soon" threshold: OPEN DECISION**
* The specific number of days prior to expiration that triggers an alert remains to be confirmed by stakeholders.

---

## 10. History and Correction Rules

* Stock movements are historical, immutable audit records.
* A recorded stock movement that has affected stock levels must **never** be silently edited or physically deleted.
* Corrections must be executed via formal reversal movements (`reversalOfMovementId`) or controlled `ADJUSTED` movements.
* The original movement remains preserved and traceable in history.
* A correction reason and the responsible user must be recorded for every adjustment or reversal.

---

## 11. Supplier Reference Boundary

* Supplier information is strictly optional reference data in Version 1.0.
* Item-level `defaultSupplierReference` serves as an informational default reference only.
* Batch/receipt-specific supplier references are supported when batch tracking is used.
* Supplier references must **not** expand into procurement workflows, purchase orders, supplier accounts, or supplier portal management in Version 1.0.

---

## 12. Clinical Integration Boundary

Planned integration model:
`TreatmentProcedure -> material use -> StockMovement(USED)`

### Proposed Integration Contract (Illustrative Only)
This integration contract represents a proposed interface between clinical treatment recording (MF-03) and inventory consumption (MF-06):

```json
{
  "inventoryItemId": 15,
  "treatmentProcedureId": 81,
  "movementType": "USED",
  "quantity": 2
}
```

*Note: The payload structure and endpoint specifications above are **illustrative / proposed only** and are not finalized DTO shapes in this step.*

---

## 13. Authorization Boundary

Access control baseline for Version 1.0:

* **Administrator:** Full management of Inventory catalog and stock movements.
* **Dental Assistant:** Manage permitted stock functions (e.g., recording stock receipts, usage, adjustments).
* **Dentist:** View inventory levels and record material usage as permitted.
* **Patient:** No access to Inventory functions.

### Open Decision
* `Inventory Controller / Storekeeper -> authentication-role mapping remains an open team decision.`
* No new authentication login role is created in this step.

---

## 14. Open Decisions

* **OD-INV-01:** Whether separate `InventoryBatch` entity is adopted.
* **OD-INV-02:** Exact expiry-warning threshold (e.g., number of days before expiration).
* **OD-INV-03:** Final MF-03 (Treatment/Clinical) -> MF-06 (Inventory) endpoint and DTO contract.
* **OD-INV-04:** Final mapping of Inventory Controller / Storekeeper responsibilities to the existing login-role model.
* **OD-INV-05:** Exact stock concurrency-control mechanism (to be selected during backend implementation design).

---

## 15. Implementation Order

Implementation must follow this logical dependency order:

1. `InventoryItem` core entity & repository
2. `StockMovement` core entity & repository
3. Stock business validation logic
4. Transaction and concurrency protection
5. Batch and expiry support (if `InventoryBatch` is confirmed and adopted)
6. Low-stock and expiry alert mechanisms
7. Movement history audit and reversal/adjustment correction workflows
8. Clinical integration interface (MF-03 link)
9. Role-based authorization enforcement
10. Backend unit and integration tests
11. React UI inventory management components integration
12. UML diagrams, evidence gathering, and viva preparation
