-- ===========================================================================
-- Finance Module – Supabase migration
-- Tables: finance_transactions, payroll_records, tax_records,
--         financial_accounts, budgets
-- ===========================================================================

-- ===== 1) finance_transactions =====
CREATE TABLE IF NOT EXISTS finance_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category    TEXT NOT NULL DEFAULT 'Other',
  source      TEXT NOT NULL DEFAULT 'other'
                CHECK (source IN ('deals', 'ecommerce', 'payroll', 'tax', 'operational', 'other')),
  description TEXT NOT NULL DEFAULT '',
  amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  reference   TEXT,
  deal_id     UUID REFERENCES deals(id) ON DELETE SET NULL,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  staff_id    UUID REFERENCES staff(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'completed'
                CHECK (status IN ('completed', 'pending', 'cancelled')),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_tx_user
  ON finance_transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_type
  ON finance_transactions (user_id, type);
CREATE INDEX IF NOT EXISTS idx_finance_tx_source
  ON finance_transactions (user_id, source);
CREATE INDEX IF NOT EXISTS idx_finance_tx_status
  ON finance_transactions (user_id, status);


-- ===== 2) payroll_records =====
CREATE TABLE IF NOT EXISTS payroll_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id            UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  staff_name          TEXT NOT NULL DEFAULT '',
  department          TEXT NOT NULL DEFAULT 'General',
  pay_period          TEXT NOT NULL,                          -- e.g. "2026-02"
  gross_salary        NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- UK tax deductions
  income_tax          NUMERIC(12,2) NOT NULL DEFAULT 0,      -- PAYE
  national_insurance  NUMERIC(12,2) NOT NULL DEFAULT 0,      -- Employee NI
  employer_ni         NUMERIC(12,2) NOT NULL DEFAULT 0,      -- Employer NI
  pension_employee    NUMERIC(12,2) NOT NULL DEFAULT 0,      -- Employee pension
  pension_employer    NUMERIC(12,2) NOT NULL DEFAULT 0,      -- Employer pension
  student_loan        NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions    NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay             NUMERIC(12,2) NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'approved', 'paid')),
  paid_date           DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_user
  ON payroll_records (user_id, pay_period DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_staff
  ON payroll_records (user_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_status
  ON payroll_records (user_id, status);


-- ===== 3) tax_records =====
CREATE TABLE IF NOT EXISTS tax_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_type        TEXT NOT NULL CHECK (tax_type IN (
                    'VAT', 'Corporation Tax', 'PAYE', 'National Insurance', 'Capital Gains'
                  )),
  period          TEXT NOT NULL,                              -- e.g. "Q1 2026" or "2025-2026"
  taxable_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(6,4) NOT NULL DEFAULT 0,           -- e.g. 0.2000 = 20%
  tax_due         NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_paid        NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date        DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'upcoming'
                    CHECK (status IN ('upcoming', 'due', 'paid', 'overdue')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tax_user
  ON tax_records (user_id, due_date DESC);
CREATE INDEX IF NOT EXISTS idx_tax_type
  ON tax_records (user_id, tax_type);
CREATE INDEX IF NOT EXISTS idx_tax_status
  ON tax_records (user_id, status);


-- ===== 4) financial_accounts =====
CREATE TABLE IF NOT EXISTS financial_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'bank'
                    CHECK (type IN ('bank', 'cash', 'credit', 'investment')),
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'GBP',
  last_reconciled DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fin_accounts_user
  ON financial_accounts (user_id);


-- ===== 5) budgets =====
CREATE TABLE IF NOT EXISTS budgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL DEFAULT 'Other',
  period      TEXT NOT NULL,                                  -- e.g. "2026-02"
  allocated   NUMERIC(14,2) NOT NULL DEFAULT 0,
  spent       NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining   NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_user
  ON budgets (user_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_budgets_category
  ON budgets (user_id, category);


-- ===== 6) Enable RLS on all finance tables =====
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_records          ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets              ENABLE ROW LEVEL SECURITY;


-- ===== 7) RLS Policies (user_id scoped CRUD) =====
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'finance_transactions',
    'payroll_records',
    'tax_records',
    'financial_accounts',
    'budgets'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "fin_%s_select" ON %I', t, t);
    EXECUTE format('CREATE POLICY "fin_%s_select" ON %I FOR SELECT USING (auth.uid() = user_id)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "fin_%s_insert" ON %I', t, t);
    EXECUTE format('CREATE POLICY "fin_%s_insert" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "fin_%s_update" ON %I', t, t);
    EXECUTE format('CREATE POLICY "fin_%s_update" ON %I FOR UPDATE USING (auth.uid() = user_id)', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "fin_%s_delete" ON %I', t, t);
    EXECUTE format('CREATE POLICY "fin_%s_delete" ON %I FOR DELETE USING (auth.uid() = user_id)', t, t);
  END LOOP;
END $$;
