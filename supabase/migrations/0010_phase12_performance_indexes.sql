-- Migration 0010: System-wide Performance Indexes for AVIORA Finance

CREATE INDEX IF NOT EXISTS idx_students_admission_no ON public.students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm ON public.students(name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON public.students(phone);

CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_enrollment_id ON public.invoices(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON public.invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_dates ON public.invoices(invoice_date, due_date);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_quotations_student_id ON public.quotations(student_id);
CREATE INDEX IF NOT EXISTS idx_quotations_date ON public.quotations(quote_date);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);

CREATE INDEX IF NOT EXISTS idx_salary_struct_faculty_date ON public.faculty_salary_structures(faculty_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_payslips_faculty_month_year ON public.payslips(faculty_id, month, year);
