# HR Module Upgrade — Progress Notes

Long-horizon plan agreed with user. Build order locked.

## Decisions (locked)
- **Renderer:** Puppeteer (headless Chrome) for HTML→PDF.
- **Template editor:** TipTap (WYSIWYG) with variable-chip sidebar.
- **Seeds:** Ship Kechita-branded starter templates for ALL kinds on day one.
- **E-signature:** Built-in canvas pad + audit trail now; design entity for future DocuSign swap-in (envelope_id, provider_status fields reserved).

## Build order
1. **Template engine** (in progress)
2. Contracts v2 (uses engine + signature pad)
3. Offer letters (uses engine, links to recruitment.application_id)
4. JD management (versioned per Position)
5. Biodata expansion (staff fields + 9 child entities)
6. Audit history (TypeORM subscriber + entity_audit_log table)

## Phase 1 — Template Engine: detailed scope

### Backend
- Module: `server/src/document-templates/`
- Entity `document_templates`:
  - `id` uuid, `kind` enum (employment_contract, offer_letter, job_description, salary_increment, transfer, warning, certificate_of_service, clearance, custom)
  - `name`, `description`, `version` int, `is_active` bool (one active per kind+scope)
  - `scope` enum (global | per_contract_type | per_position) + `scope_value` (e.g. 'permanent' for contract subtype)
  - `body_html` text (TipTap output, Handlebars-templated)
  - `header_html`, `footer_html` text (optional, also Handlebars-templated)
  - `variables_schema` jsonb — array of `{ key, label, group, sample }`
  - `page_size` enum (A4 | Letter), `margins` jsonb `{ top, right, bottom, left }` in mm
  - `created_by`, `updated_by`, timestamps
- Services
  - `TemplateRendererService` — Handlebars compile + register helpers: `date`, `currency`, `upper`, `lower`, `title`, `default`, `list` (bullet/comma), `nl2br`, `if`, `each`, safe HTML escaping by default
  - `TemplateContextService` — builds context per kind: e.g. for `employment_contract` loads Staff + StaffContract + Position + Manager + JD; exposes a stable variable map
  - `PdfService` — Puppeteer with a singleton browser, page pool (max 4 concurrent), 30s render timeout, font preloading
- Controller `/document-templates`
  - `GET /` — list (filter by kind, scope)
  - `GET /:id` — fetch one with body
  - `GET /kinds` — list available kinds + their variable schemas
  - `GET /kinds/:kind/variables` — full variable list (for editor sidebar)
  - `POST /` — create (HR_MANAGER, CEO)
  - `PUT /:id` — update (creates a new version automatically when activating)
  - `POST /:id/activate` — deactivates any other active template for same kind+scope
  - `POST /:id/preview` — render with body { context: optional override, sample: use_sample_data } → returns HTML
  - `POST /:id/render-pdf` — render with body { context_id, context_type } → PDF stream
- Migration creates table + seeds 12 starter templates (see list below)

### Frontend
- New page `/document-templates` (admin-only)
- List grouped by kind, version pills, active badge
- Edit modal: TipTap editor + right sidebar with grouped variable chips, header/footer collapsibles, page-size/margin controls, Preview button (opens PDF in new tab)
- Action buttons: New version, Duplicate, Activate, Delete (only inactive)

### Seeds (Phase 1 starter set)
1. Employment Contract — Permanent
2. Employment Contract — Fixed Term
3. Employment Contract — Probation
4. Employment Contract — Internship
5. Employment Contract — Consultancy
6. Offer Letter
7. Job Description
8. Salary Increment Letter
9. Transfer Letter
10. Warning Letter
11. Certificate of Service
12. Clearance Form

Each branded with Kechita Capital header (logo placeholder), Nairobi address, blue accent (#0066B3), Helvetica.

## Variables catalog (per kind)

**Common (all kinds):**
`today`, `today_long`, `company.name`, `company.address`, `company.phone`, `company.email`, `company.logo_url`

**Staff context** (any kind tied to a staff member):
`staff.first_name`, `staff.middle_name`, `staff.last_name`, `staff.full_name`, `staff.preferred_name`, `staff.title` (Mr/Mrs/Dr — Phase 5), `staff.employee_number`, `staff.national_id`, `staff.tax_pin`, `staff.nssf_number`, `staff.nhif_number`, `staff.personal_email`, `staff.phone`, `staff.address`, `staff.city`, `staff.gender`, `staff.date_of_birth`, `staff.hire_date`, `staff.position.name`, `staff.department.name`, `staff.branch.name`, `staff.region.name`, `staff.manager.full_name`, `staff.manager.position.name`, `staff.bank_name`, `staff.bank_branch`, `staff.bank_account_number`, `staff.basic_salary`, `staff.salary_currency`

**Contract context (employment_contract, addendum):**
`contract.contract_number`, `contract.contract_type`, `contract.start_date`, `contract.end_date`, `contract.salary`, `contract.salary_currency`, `contract.notice_period_days`, `contract.title`, `contract.job_title`, `contract.terms`, `contract.special_conditions`, `contract.signed_date`, `contract.signed_by_staff`, `contract.signed_by_employer`

**Offer letter context:**
`offer.position_name`, `offer.start_date`, `offer.salary`, `offer.salary_currency`, `offer.expiry_date`, `offer.reporting_to`, `offer.special_clauses`, `candidate.first_name`, `candidate.last_name`, `candidate.email`, `accept_link`

**JD context:**
`jd.position`, `jd.purpose`, `jd.responsibilities` (list), `jd.qualifications` (list), `jd.skills` (list), `jd.kpis` (list), `jd.reports_to`, `jd.working_conditions`, `jd.effective_from`

**Disciplinary (warning):**
`warning.level` (verbal/written/final), `warning.date`, `warning.incident_date`, `warning.incident_description`, `warning.expected_corrective_action`, `warning.issued_by`

**Transfer letter:**
`transfer.from_branch`, `transfer.to_branch`, `transfer.from_department`, `transfer.to_department`, `transfer.from_position`, `transfer.to_position`, `transfer.effective_date`, `transfer.reason`

**Salary increment letter:**
`increment.previous_salary`, `increment.new_salary`, `increment.percent_change`, `increment.effective_date`, `increment.reason`

## Open items to revisit
- Multi-language templates (English / Swahili) — not in scope yet, but `kind + scope + language` would be the future shape.
- Per-template access control — currently any HR_MANAGER/CEO can edit any template; could later restrict by kind.
- Auto-archive old versions vs hard-keep — currently always keep all versions, mark inactive.
