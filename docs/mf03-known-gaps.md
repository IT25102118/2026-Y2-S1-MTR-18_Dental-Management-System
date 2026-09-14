# MF-03: Clinical Examination and Treatment Plan Management — Known Gaps & Cross-Module Dependencies

## 1. Overview and Core Status
The core implementation of **MF-03 (Clinical Examination and Treatment Plan Management)** is complete, verified, and locked on branch `feature/mf03-treatment-plan-domain` as of commit `ffc5a74`.

### Verification Baseline
- **Backend Test Suite**: **253/253 tests passing** (100% passing rate across all clinical unit and controller MockMvc test classes).
- **Frontend Test Suite**: **269/269 tests passing** across 40 test files (`npm test -- --run`).
- **Production Build**: Successful clean production build via Vite (`npx vite build`).
- **Security & Authorization**: Enforces authenticated-principal dentist resolution via `CurrentDentistProvider` and session-based CSRF protection on all clinical mutating API routes.

The following functional requirements are **fully implemented and tested**:
- **FR-CLN-01**: Clinical examination creation linked to valid patient, dentist, and optional appointment.
- **FR-CLN-03**: Recording of chief complaint, clinical observations, provisional diagnosis, FDI two-digit tooth findings (permanent 11–48, deciduous 51–85), and general conditions.
- **FR-CLN-04**: Creation and lifecycle management of multi-procedure treatment plans requiring at least one procedure for approval.
- **FR-CLN-06**: Strict state machine management across `PROPOSED`, `APPROVED`, `IN_PROGRESS`, `COMPLETED`, and `CANCELLED` statuses with role and reason checks.
- **FR-CLN-07**: Mandatory completion date and actual cost recording before marking procedures or plans completed.
- **FR-CLN-08**: Restriction of final diagnosis confirmation and treatment plan/procedure lifecycle mutations strictly to authorized dentists, resolved via authenticated security session.

---

## 2. Deferred Cross-Module Gaps

Two functional requirements have bounded, cross-module aspects deferred to integration phases with MF-01 and MF-06:

### Gap 1: FR-CLN-02 — Patient Medical and Dental History Display
- **Requirement Text**: "The system shall display relevant patient medical and dental history during examination."
- **Current Implementation**:
  - **Dental Examination History**: Fully implemented and tested. Dentists and dental assistants can view past examinations for any patient via `ClinicalExaminationService.getExaminationsByPatientId`, `GET /api/clinical/examinations?patientId={id}`, and `ExaminationsPage.jsx`.
- **What Is Missing**:
  - Direct display of patient medical background, systemic conditions, known allergies, and medical alert badges (the MF-01 Clinical Summary DTO) within the clinical examination view (`ExaminationDetailPage.jsx` / `ExaminationForm.jsx`).
- **Why It Is Deferred**:
  - This is an inter-module boundary dependency requiring coordination with **MF-01 (Patient Records Management)**.
  - The MF-01 module currently provides patient account registration under authentication, but its medical history domain model and patient clinical summary endpoints are not yet authored.
  - `PatientLookupPort` currently provides decoupling for active patient verification; once MF-01 defines the medical summary contract, the port will be extended to pipe medical alerts into the clinical examination screen without introducing tight entity-level coupling.

### Gap 2: FR-CLN-05 — Clinical Material Usage Linkage
- **Requirement Text**: "The system shall record estimated cost, completed procedures, materials used, clinical notes and follow-up dates."
- **Current Implementation**:
  - **Estimated and Actual Costs**: Fully implemented, validated (non-negative), and auto-aggregated from procedure quantities and unit costs.
  - **Completed Procedures**: Fully implemented with completion dates, responsible dentists, and assistants.
  - **Clinical Notes**: Fully implemented with `clinical_notes`, `clinical_progress_notes`, and dedicated `ClinicalProgressNote` audit entities.
  - **Follow-up Dates**: Fully implemented with date validity checks and progress note generation.
- **What Is Missing**:
  - MF-03-side UI and service workflows for directly logging dental materials consumed during a specific clinical procedure.
- **Why It Is Deferred**:
  - In the DentCare domain architecture, material tracking is governed by **MF-06 (Inventory Management)**.
  - The integration point is already architected and modeled on the receiving side in MF-06: the `StockMovement` schema includes an optional `treatmentProcedureId` foreign key linking inventory movements to clinical procedures.
  - In the source requirements specification (SRS Appendix O.4 *Planned Transaction Boundaries*), the cross-module material use transaction is explicitly marked unresolved:
    > *"Clinical material use: Record procedure/material relationship and corresponding inventory movement consistently; exact orchestration should be agreed during implementation."*
  - To preserve bounded context isolation and prevent premature coupling before the MF-06 team is ready to coordinate the joint transaction, direct material consumption UI within MF-03 is deferred to the planned cross-module integration slice.

---

## 3. Summary & Recommendation
The core domain model, business rules, REST API, React UI, security principal resolution, and test harness for MF-03 are completely finished. The two deferred items represent cross-module integration workflows that require cooperative contract agreement with the owners of MF-01 and MF-06.
