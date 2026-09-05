## 📦 Inventory Management

The **Inventory Management** module is responsible for managing dental materials and maintaining accurate, traceable stock records within DentCare.

### Main Features

- Register and categorize inventory items
- Update and activate/deactivate inventory items
- Search and filter inventory records
- Maintain item unit and reorder level
- Record batch numbers and expiry dates where applicable
- Store an optional supplier reference
- Monitor current stock quantities
- Display low-stock alerts
- Display expiry alerts
- Maintain chronological stock movement history
- Record the responsible user for each stock movement

### Stock Movement Types

The system supports the following inventory movements:

- **Received** – stock added to inventory
- **Used** – stock consumed during clinic operations
- **Damaged** – unusable stock removed
- **Expired** – expired stock removed
- **Adjusted** – manual stock correction

### Inventory Validation Rules

- Item name and unit are required.
- Reorder level cannot be negative.
- Stock movement quantity must be greater than zero.
- Stock-out movements cannot exceed the available quantity.
- Expiry dates must be valid.
- Every stock movement records its type, quantity, date, and responsible user.
- Inventory history is preserved instead of silently deleting stock movements.

### Inventory Workflow

```text
Register Inventory Item
        ↓
Enter Item Details
        ↓
Validate Information
        ↓
Save Inventory Item
        ↓
Record Stock Movement
        ↓
Select Movement Type
        ↓
Validate Quantity
        ↓
Update Available Stock
        ↓
Save Movement History
        ↓
Check Low-Stock / Expiry Alerts
