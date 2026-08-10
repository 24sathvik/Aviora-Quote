# AVIORA — Aviation Finance & Fee Management System

**AVIORA** is an enterprise-grade financial operations, fee management, student billing ledger, and faculty payroll system engineered specifically for **Aviora Aviation Academy**.

---

## 🏛️ Core Architecture Principles & Non-Negotiable System Rules

1. **Numeric Currency Representation (`numeric(12,2)`)**:
   - All financial and money columns in PostgreSQL are strictly defined as `numeric(12,2)`. Floating-point types (`float`, `double`, `real`) are strictly prohibited across database schemas and application calculations to eliminate binary rounding errors.
   - All client-side calculations use `roundCurrency()` and `formatCurrency()` helpers in `@/lib/utils/currency.ts`.

2. **Derived Balances & Single Source of Truth (`invoice_balances`)**:
   - Outstanding balances, paid totals, and settlement statuses are never stored as static mutated columns on invoices. They are dynamically calculated in real time via the Postgres view `invoice_balances`.
   - Formula:
     $$\text{amount\_paid} = \sum \text{payments.amount}$$
     $$\text{balance\_due} = \text{grand\_total} - \text{amount\_paid}$$
     $$\text{computed\_status} = \begin{cases} 
     \text{'paid'} & \text{if } \text{balance\_due} \le 0 \\
     \text{'partial'} & \text{if } \text{amount\_paid} > 0 \text{ and } \text{balance\_due} > 0 \\
     \text{'overdue'} & \text{if } \text{current\_date} > \text{due\_date} \text{ and } \text{balance\_due} > 0 \\
     \text{status} & \text{otherwise}
     \end{cases}$$

3. **Single Shared PDF Branding Partial (`PdfHeader` & `PdfSignatureFooter`)**:
   - All document PDF generators (`QuotationPdfDocument`, `InvoicePdfDocument`, `PaymentReceiptPdfDocument`, `PayslipPdfDocument`) import shared branding components from `@/lib/pdf/branding`.
   - Modifying company details in `/settings` automatically updates all PDF exports system-wide without altering document template code.

4. **Atomic Concurrency Numbering Engine (`get_next_document_number`)**:
   - Sequenced human-readable document numbers (`AV/QT/00001`, `AV/INV/2026-27/00001`, `AV/RCT/2026-27/00001`, `AV/PAY/2026-27/00001`) are generated via an atomic Postgres function `get_next_document_number(p_doc_type, p_fy_label)` using row-level locking on `numbering_sequences`.

5. **Immutable Historical Payslips (`salary_structure_snapshot`)**:
   - Faculty payslips store a frozen `salary_structure_snapshot` JSONB object at generation time. Modifying a faculty member's current salary structure later **never alters past generated payslips**.
   - Database constraint `UNIQUE (faculty_id, month, year)` prevents duplicate payslips.

6. **Automatic Trigger-Based Financial Audit Logging (`audit_logs`)**:
   - A Postgres trigger function `process_audit_log()` automatically captures all `INSERT`, `UPDATE`, and `DELETE` operations on `quotations`, `invoices`, `payments`, and `payslips` into `audit_logs`.

---

## 🗺️ Module Implementation Roadmap (Phases 1–11)

- **Phase 1 — Foundation**: Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase Clients, App Shell, Base Currency Formatter (`formatCurrency`), Skeleton Components.
- **Phase 2 — Master Data (Students & Courses)**: Course catalog, Multi-term fee structures, Fee heads, Student management, Profile image uploads via Supabase Storage (`student-photos`).
- **Phase 3 — Enrollments, Counselors & Faculty**: Student course term enrollments, Counselor master data, Faculty instructor directory.
- **Phase 4 — Atomic Numbering Engine**: Concurrency-safe atomic document sequence generator (`get_next_document_number`), Financial year resets (`2026-27`).
- **Phase 5 — Quotation Module**: Commercial flight training quotations, itemized fee structures, status lifecycle (`draft` $\to$ `sent` $\to$ `accepted` $\to$ `converted`), PDF renderer.
- **Phase 6 — Invoice Module**: Term tax invoices, multi-deduction engine (Discount + Merit Scholarship + Promotional Coupon + GST), previous outstanding auto-pull, Quotation conversion workflow, PDF renderer.
- **Phase 7 — Payments & Student Billing Ledger**: Billing slips & payment receipts, immutable payment records, real-time student fee ledger on `/students/[id]`, PDF renderer.
- **Phase 8 — Faculty Payslip Module**: Dated faculty salary structures, earnings & statutory deductions calculator, monthly payslip generator with frozen JSON snapshots, PDF renderer.
- **Phase 9 — Executive Dashboard & Reports Hub**: Live financial KPI summary cards, settlement status breakdown, course performance progress, counselor conversion rate, date-filterable CSV reports (`/reports`).
- **Phase 10 — Polish Pass, Performance & Security Hardening**: Postgres performance indexes, trigger-based audit logging, Row Level Security (RLS) enforcement, service-role bundle audit.
- **Phase 11 — Branding Swap-In & Production Setup**: Official AVIORA company branding configuration, PDF verification test suite, final production deployment guide.

---

## 🚀 Environment Setup & Vercel Deployment

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://yrncaebimjmwhqltroqi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Vercel Deployment Steps
1. Connect Git repository to **Vercel**.
2. Set Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Ensure Supabase PgBouncer Connection Pooling (Port `6543`) is used for serverless functions.
4. Deploy with `npm run build`.

---

© 2026 **Aviora Aviation Academy**. All rights reserved.
