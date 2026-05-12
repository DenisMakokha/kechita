# Database migrations

This directory holds raw, reviewable SQL files that bring the production
Postgres schema into agreement with the TypeORM entities. They are *not*
TypeORM-managed migrations — apply them manually with `psql`.

## 2026-05-12_create_missing_tables.sql

Creates the 29 tables that exist as entities in code but had never been
created on the production database (`DB_SYNCHRONIZE=false`):

```
asset_assignments        assets                  benefit_enrollments
benefit_plans            disciplinary_cases      goals
key_results              knockout_questions      payroll_periods
payroll_runs             payslip_lines           payslips
review_cycles            reviews                 roster_assignments
salary_bands             screening_criteria      screening_results
shifts                   staff_allowances        staff_dependents
staff_next_of_kin        staff_probation_reviews staff_recurring_deductions
staff_salary_history     time_entries            training_enrollments
training_programs        training_sessions
```

Plus the supporting enum types and FK constraints. The whole file is
wrapped in `BEGIN ... COMMIT` so a failure rolls everything back.

### How it was generated

Bootstrapped the running NestJS app in standalone mode against the live
Postgres, asked TypeORM `SchemaBuilder.log()` for the queries it would
run, then filtered to the **additive-only** subset:

- `CREATE TYPE … AS ENUM` — only when the type does not already exist
- `CREATE TABLE …` — only for tables that do not already exist
- `CREATE INDEX …` — only on newly created tables
- `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY …` — only on newly created tables

Anything that would `ALTER`/`DROP` an existing table is parked in
`*.skipped.sql` for separate review.

### How to apply

```bash
ssh kechita
PG=$(grep ^DB_PASSWORD= /opt/kechita/server/.env | cut -d= -f2-)
PGPASSWORD="$PG" psql -h localhost -U kechita -d kechita_db \
    -v ON_ERROR_STOP=1 \
    -f /opt/kechita/server/migrations/2026-05-12_create_missing_tables.sql
```

### Verifying after apply

```sql
-- Should show 29 new tables
SELECT count(*) FROM information_schema.tables
 WHERE table_schema='public'
   AND table_name = ANY (ARRAY[
     'asset_assignments','assets','benefit_enrollments','benefit_plans',
     'disciplinary_cases','goals','key_results','knockout_questions',
     'payroll_periods','payroll_runs','payslip_lines','payslips',
     'review_cycles','reviews','roster_assignments','salary_bands',
     'screening_criteria','screening_results','shifts','staff_allowances',
     'staff_dependents','staff_next_of_kin','staff_probation_reviews',
     'staff_recurring_deductions','staff_salary_history','time_entries',
     'training_enrollments','training_programs','training_sessions'
   ]);
```

## 2026-05-12_create_missing_tables.skipped.sql

Five statements TypeORM also wanted to run but which touch *existing*
tables. They were skipped to avoid surprises:

1. `DROP COLUMN pipeline_stages.order_index` — orphan column from a
   previous migration. Safe to drop manually after confirming nothing
   reads it (the entity uses `position`).
2. Recreate `audit_logs_action_enum` to add the new values
   `ACCESS_DENIED`, `SUSPICIOUS_ACTIVITY`. Without this, attempting to
   write an audit log with one of these actions raises
   `invalid_text_representation`. Apply the four-statement block in the
   `.skipped.sql` file inside a transaction.
