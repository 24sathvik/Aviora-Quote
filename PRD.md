# AVIORA — Product Requirements Document (PRD)

**Product Name:** AVIORA — Aviation Finance & Fee Management System  
**Client / Domain:** Aviora Aviation Academy  
**Version:** 1.0 (Phase 1–12 Implementation)  
**Target Release:** 2026-27 Academic Fiscal Year  
**Author:** Aviation Systems & Financial Engineering Team  

---

## 1. Product Overview & Strategic Vision

### 1.1 Problem Statement
Commercial aviation training academies operate under unique financial conditions distinct from standard collegiate institutions:
- Flight training fees are substantial (often ranging from ₹5,00,000 to ₹50,00,000+ per student) and divided into multi-term ground school, flight simulator, and flight training phases.
- Students remit tuition in variable installments across terms rather than fixed one-time fees.
- Quotes, scholarships, discounts, and promotional coupons are negotiated during enrollment and must accurately carry through to legal tax invoices.
- Commercial tax compliance (GST at 18%) requires rigorous financial number sequencing, audit logging, and formal tax invoice PDF generation.
- Flight instructor faculty payroll requires flexible salary structures (Basic + HRA + Allowances - PF/PT/TDS deductions) with immutable historical payslips.

### 1.2 Product Vision
**AVIORA** provides a unified, single-source-of-truth financial operating system tailored specifically for Aviora Aviation Academy. The platform eliminates manual spreadsheet errors, prevents document sequence collisions, automates multi-deduction invoice computations, provides real-time student billing ledgers, manages faculty payroll, and offers live executive analytics.

---

## 2. User Personas & Permissions

| Persona | Role in Organization | Core Workflows & Responsibilities |
|---|---|---|
| **Academy Director / CFO** | Executive Oversight | Views live financial KPIs on Dashboard, monitors cash flow and outstanding balances, reviews course-wise profitability, and exports financial audit CSV reports. |
| **Finance & Billing Officer** | Billing & Invoicing | Creates course terms and fee heads, generates flight training quotations, converts accepted quotes into formal tax invoices, applies scholarships and GST, issues payment receipts, and audits ledgers. |
| **Cashier / Accounts Desk** | Payment Processing | Records incoming student payments across UPI, bank transfers, cheques, and cash; prints/emails official payment receipt PDFs to cadets and guardians. |
| **HR & Payroll Admin** | Faculty Payroll | Maintains flight instructor directories, defines dated salary structures, generates monthly payroll payslip batches, and distributes salary slip PDFs. |
| **Admissions Coordinator** | Cadet Intake | Creates student profiles, assigns admission numbers, tracks student status (`enquiry` $\to$ `enrolled` $\to$ `active` $\to$ `completed`), and links cadets to courses. |

---

## 3. Core Product Invariants & Architectural Rules

1. **Exact Currency Precision:** Floating-point data types are strictly prohibited in database schemas and application logic. All money values use PostgreSQL `NUMERIC(12,2)` and client-side rounding helpers.
2. **Derived Settlement Balances:** Invoices never store a hardcoded `status = 'paid'` or static `balance_due`. These values are derived dynamically in real time from the transaction ledger via the PostgreSQL view `invoice_balances`.
3. **Atomic Document Numbering:** Document sequence numbers (`AV/QT/00001`, `AV/INV/2026-27/00001`, `AV/RCT/2026-27/00001`, `AV/PAY/2026-27/00001`) are generated via an atomic row-locked stored procedure `get_next_document_number` to eliminate concurrency race conditions.
4. **Immutable Payroll History:** Payslips capture a frozen JSONB snapshot of the faculty member's salary structure at the time of disbursement. Future salary revisions never alter past generated payslips.
5. **Universal Brand Synchronization:** All PDF documents (Quotations, Invoices, Receipts, Payslips) import shared branding partials (`PdfHeader`, `PdfSignatureFooter`). Updating academy details in `/settings` instantly propagates system-wide without modifying document code.
6. **Automatic Audit Trail:** Every insert, update, or deletion of financial records is automatically logged with before/after JSONB payloads into `audit_logs` via database triggers.

---

## 4. Functional Requirements by Module

### Module 1: Authentication & User Administration
- **FR-1.1:** Secure email and password authentication backed by Supabase Auth with server-side cookie sessions.
- **FR-1.2:** Automatic synchronization of `auth.users` into `public.users` via database trigger `handle_new_user()`.
- **FR-1.3:** Protected application routes via Next.js Middleware with automatic redirect to `/login` for unauthenticated sessions.
- **FR-1.4:** User profile display and one-click session sign-out in application header.

### Module 2: Students Master Data & Cadet Profiles
- **FR-2.1:** Automated student admission numbering sequence formatted as `AV-YYYY-XXXX` (e.g., `AV-2026-0001`) via database trigger `generate_admission_no()`.
- **FR-2.2:** Full student profile recording: Full Name, Date of Birth, Phone, Email, Guardian Name, Guardian Contact, Physical Address, and Admission Date.
- **FR-2.3:** Cadet lifecycle status tracking: `enquiry`, `enrolled`, `active`, `completed`, `dropped`.
- **FR-2.4:** Student profile photo upload to public Supabase Storage bucket (`student-photos`) with image preview.
- **FR-2.5:** Searchable and filterable student directory table by Name, Admission Number, Phone, and Enrollment Status.

### Module 3: Courses, Terms & Fee Structures
- **FR-3.1:** Course catalog management with course title, description, and duration in terms (e.g., Commercial Pilot License, Private Pilot License, Flight Instructor Rating).
- **FR-3.2:** Multi-term fee structure configuration per course with term sequence numbers, term labels, and base term fees.
- **FR-3.3:** Optional itemized fee heads per term (e.g., Ground School Tuition, Aircraft Simulator Hours, DGCA Exam Prep, Aviation Medicals).
- **FR-3.4:** Real-time computation of aggregate course fees derived from individual term fees.

### Module 4: Student Enrollments & Batch Management
- **FR-4.1:** Formal enrollment of students into specific courses with batch year and starting term.
- **FR-4.2:** Enrollment status tracking (`active`, `completed`, `dropped`).
- **FR-4.3:** Direct integration with student profile page displaying current active enrollments and course progression.

### Module 5: Atomic Concurrency Numbering Engine
- **FR-5.1:** Concurrency-safe atomic document sequence generation via PostgreSQL function `get_next_document_number(p_doc_type, p_fy_label)`.
- **FR-5.2:** Row-level locking on `numbering_sequences` table using atomic `INSERT ... ON CONFLICT DO UPDATE`.
- **FR-5.3:** Financial year scoping (`2026-27`) with automatic sequence resets across fiscal boundaries.
- **FR-5.4:** Built-in interactive test utility `/test-numbering` capable of firing 20 concurrent parallel requests to verify zero duplicate numbers.

### Module 6: Flight Training Quotations Module
- **FR-6.1:** Quotation generation for registered students or unregistered prospective cadet leads (Name, Phone, Email).
- **FR-6.2:** Dynamic itemized quotation line items with quantity, unit price, item discount, and line totals.
- **FR-6.3:** Real-time calculation of Subtotal, Overall Discount, GST (18%), and Grand Total.
- **FR-6.4:** Quotation lifecycle state machine: `draft` $\to$ `sent` $\to$ `accepted` $\to$ `expired` $\to$ `converted`.
- **FR-6.5:** One-click conversion from `accepted` quotation directly into a formal Tax Invoice with automatic line-item cloning and status update to `converted`.
- **FR-6.6:** High-resolution printable Quotation PDF export via `/api/quotations/[id]/pdf` with academy branding and terms.

### Module 7: Term Tax Invoices & Multi-Deduction Engine
- **FR-7.1:** Formal GST Tax Invoice creation linked to a student, course enrollment, and specific course term.
- **FR-7.2:** Automatic detection and pull of the student's prior unpaid balance (`previous_outstanding`) across previous terms.
- **FR-7.3:** Multi-deduction discount engine supporting:
  - Base Subtotal
  - Flat Discount Amount
  - Merit Scholarship Amount
  - Promotional Coupon Deduction
  - GST Calculation (18% applied to net taxable total)
  - Formula: $\text{Taxable} = \max(0, \text{Subtotal} - \text{Discount} - \text{Scholarship} - \text{Coupon})$; $\text{Grand Total} = \text{Taxable} + \text{GST} + \text{Previous Outstanding}$.
- **FR-7.4:** Dynamic settlement status calculation via `invoice_balances`: `draft`, `sent`, `paid`, `partial`, `overdue`, `cancelled`.
- **FR-7.5:** Invoice cancellation workflow with safety checks preventing cancellation of invoices with recorded payments.
- **FR-7.6:** Official GST Tax Invoice PDF generation via `/api/invoices/[id]/pdf` featuring student info, itemized fee breakdown, deduction summary, bank wire instructions, and signature footer.

### Module 8: Payment Collections & Student Billing Ledger
- **FR-8.1:** Record student payments against open invoices with real-time balance validation.
- **FR-8.2:** Supported payment modes: `upi`, `bank_transfer`, `cheque`, `cash` with transaction reference numbers (UTR, Cheque No, Bank Ref).
- **FR-8.3:** Atomic payment receipt generation (`AV/RCT/2026-27/00001`).
- **FR-8.4:** Real-time Student Billing Ledger on `/students/[id]` rendering chronological invoices, payments, cumulative billed totals, cumulative paid totals, and live outstanding balances.
- **FR-8.5:** Official Payment Receipt PDF export via `/api/payments/[id]/pdf` displaying payment amount, mode, transaction reference, applied invoice, and resulting remaining balance.

### Module 9: Faculty Master Data & Payroll Engine
- **FR-9.1:** Flight instructor and staff directory (Name, Designation, Department, Phone, Email, Bank Details, Date of Joining, Active Status).
- **FR-9.2:** Dated faculty salary structure configuration:
  - **Earnings:** Basic Salary, HRA, Other Allowances $\to$ Gross Pay.
  - **Statutory Deductions:** Provident Fund (PF), Professional Tax (PT), Tax Deducted at Source (TDS), Other Deductions $\to$ Total Deductions.
  - **Net Pay:** $\text{Gross Pay} - \text{Total Deductions}$.
- **FR-9.3:** Monthly payroll batch generator for any selected month and year.
- **FR-9.4:** Duplicate disbursement prevention via database constraint `UNIQUE (faculty_id, month, year)`.
- **FR-9.5:** Immutable historical JSONB snapshot storing exact salary structure at the time of payslip generation.
- **FR-9.6:** Printable Monthly Payslip PDF export via `/api/payslips/[id]/pdf` with itemized earnings, statutory deductions, net payable amount in words, and authorized signatory.

### Module 10: Executive Financial Dashboard
- **FR-10.1:** Top KPI Summary Cards: Total Invoiced Billed, Total Fee Collected, and Total Balance Outstanding with time filter toggle (`This Month` vs `All-Time Total`).
- **FR-10.2:** Invoice Settlement Status Breakdown: Visual count cards for Zero Payment, Partially Paid, Fully Settled, and Overdue Invoices.
- **FR-10.3:** Course-wise Collection Breakdown: Revenue and collection tracking grouped by aviation training track.
- **FR-10.4:** Monthly Faculty Payroll Disbursement Card: Real-time summary of staff payroll disbursed for the current calendar month.
- **FR-10.5:** Live Activity Feed: Last 10 payments received and last 10 tax invoices issued with direct navigation links.

### Module 11: Reports Hub & CSV Export Engine
- **FR-11.1:** Date-filterable Financial Reports Hub supporting preset and custom date intervals.
- **FR-11.2:** Fee Collections Report: Itemized payment audit report with student name, receipt number, payment mode, reference ID, and amount.
- **FR-11.3:** Invoices & Outstanding Ledger Report: Complete invoice register with billing date, student admission number, grand total, amount paid, balance due, and computed status.
- **FR-11.4:** Faculty Payroll Report: Monthly staff salary register with gross pay, PF/TDS deductions, and net disbursed totals.
- **FR-11.5:** One-click instant CSV export for all reports formatted for spreadsheet and external accounting software ingestion.

### Module 12: Academy Settings & Universal PDF Branding
- **FR-12.1:** Academy profile configuration: Academy Name, Official Email, Phone, Campus Address, Website.
- **FR-12.2:** Tax & Legal Identifiers: GSTIN, PAN, CIN.
- **FR-12.3:** Remittance Bank Details: Bank Name, Account Holder Name, Account Number, IFSC Code, Branch Name.
- **FR-12.4:** Digital Asset URLs: Official Academy Logo URL and Authorized Signatory Signature URL.
- **FR-12.5:** Standard Terms & Conditions text editor automatically injected into all exported PDF footers.

---

## 5. Non-Functional Requirements (NFRs)

| Domain | Requirement | Target Metric / Implementation |
|---|---|---|
| **Data Integrity** | Zero floating-point drift | All currency stored as `NUMERIC(12,2)`; zero binary rounding discrepancies. |
| **Concurrency** | Zero duplicate document IDs | Row-level locking on `numbering_sequences` guarantees strict unique monotonically increasing sequences under 100+ concurrent requests. |
| **Performance** | Sub-second query latency | B-tree performance indexes applied on all foreign keys, status columns, date ranges, and student admission numbers. |
| **Security** | Row Level Security (RLS) | 100% of public database tables protected by RLS; unauthorized unauthenticated access denied at Postgres engine level. |
| **Auditability** | Full historical mutation tracking | Automated trigger `process_audit_log()` stores pre- and post-mutation JSONB states for every insert/update/delete. |
| **PDF Generation** | Fast streaming binary exports | Serverless `@react-pdf/renderer` generates and buffers complete PDF documents in under 800ms. |
| **Mobile & Responsive** | Responsive viewport layout | Tailwind flex/grid layout supporting desktop, tablet, and mobile screens. |

---

## 6. Document State Machines & Lifecycle Transitions

### 6.1 Quotation State Machine
```
[ Draft ] ──────► [ Sent ] ──────► [ Accepted ] ──────► [ Converted ]
    │                │                  │
    ▼                ▼                  ▼
[ Expired ]      [ Expired ]       (Creates Invoice)
```

### 6.2 Invoice Settlement State Machine (Computed via `invoice_balances`)
```
                                 ┌───────────────┐
                                 │ Invoices Base │
                                 └───────┬───────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
             [ status = 'draft' ]  [ status = 'cancelled' ]  [ status = 'sent' ]
                    │                    │                    │
                    ▼                    ▼                    ▼
                 (Draft)            (Cancelled)      ┌────────┴────────┐
                                                     │ payments amount │
                                                     └────────┬────────┘
                                                              │
                    ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
                    ▼                                         ▼                                         ▼
            [ amount_paid = 0 ]                    [ amount_paid < grand_total ]             [ amount_paid >= grand_total ]
                    │                                         │                                         │
         ┌──────────┴──────────┐                   ┌──────────┴──────────┐                              ▼
         ▼                     ▼                   ▼                     ▼                            (Paid)
 [ due_date >= now ]   [ due_date < now ]  [ due_date >= now ]   [ due_date < now ]
         │                     │                   │                     │
         ▼                     ▼                   ▼                     ▼
      (Sent)               (Overdue)           (Partial)             (Overdue)
```
