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
- Spring Security
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
- Role-based access control
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
│       ├── security/
│       ├── exception/
│       └── config/
│
├── database/                 # Database migrations / seed data
├── docs/                     # UML diagrams and project documentation
└── README.md
