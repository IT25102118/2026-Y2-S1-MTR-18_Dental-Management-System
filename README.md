# 🦷 DentCare – Web-Based Dental Clinic Management System(2026-Y2-S1-MTR-18)

DentCare is a web-based Dental Clinic Management System developed for the **SE2030 – Software Engineering** group project.

The system is designed for a single private dental clinic and provides a centralized platform for managing patients, appointments, clinical activities, prescriptions, billing, payments, and dental inventory.

## 📌 Main Functions

DentCare consists of six major functional modules:

1. **Patient Records Management**
2. **Appointment & Dentist Availability Management**
3. **Clinical Examination & Treatment Plan Management**
4. **Prescription Management**
5. **Billing & Payment Management**
6. **Inventory Management**

## 👥 User Roles

- Administrator
- Receptionist
- Dentist
- Dental Assistant
- Patient

## 🛠️ Technology Stack

### Frontend
- React

### Backend
- Java 21
- Spring Boot
- Spring Data JPA / Hibernate
- REST API

### Database
- MySQL

### Development Tools
- Git & GitHub
- Maven
- Postman
- IntelliJ IDEA / VS Code
- MySQL Workbench

## ✨ Key Features

- Patient registration and record management
- Dentist availability and appointment scheduling
- Appointment conflict prevention
- Clinical examination and diagnosis recording
- Treatment plan management
- Prescription creation and finalization
- Allergy warning support
- Invoice and payment management
- Partial payment and outstanding balance tracking
- Inventory item management
- Stock movement tracking
- Low-stock and expiry alerts
- Input validation
- Audit and activity history
- Search, filtering and reporting

## 🏗️ Architecture

```text
React Frontend
      ↓
REST / JSON API
      ↓
Java 21 + Spring Boot
      ↓
Service Layer
      ↓
Spring Data JPA / Hibernate
      ↓
MySQL Database
```

```text
2026-Y2-S1-MTR-18_Dental-Management-System/
│
├── frontend/                 # React application
│   └── src/
│       ├── components/
│       ├── features/
│       ├── services/
│       ├── routes/
│       └── utils/
│
├── backend/                  # Spring Boot application
│   └── src/
│       ├── controller/
│       ├── dto/
│       ├── service/
│       ├── repository/
│       ├── entity/
│       ├── exception/
│       └── config/
│
├── database/                 # Database migrations / seed data
├── docs/                     # UML diagrams and project documentation
└── README.md
```

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
```
