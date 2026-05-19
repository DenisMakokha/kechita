import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the document_templates table and seeds Kechita-branded starter
 * templates for every supported kind. HR can edit / replace these — versions
 * are immutable so the originals can always be referenced.
 *
 * Each seed includes:
 * - body_html with Handlebars variables (TipTap-compatible HTML)
 * - default A4 + 18mm/16mm margins
 * - variables_schema with sample data (used for the editor preview when no
 *   live record is selected)
 * - is_active = true on creation so the engine has a default to render
 */
export class CreateDocumentTemplates1747500000000 implements MigrationInterface {
    name = 'CreateDocumentTemplates1747500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Enum types
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."document_templates_kind_enum" AS ENUM (
                    'employment_contract', 'offer_letter', 'job_description',
                    'salary_increment', 'transfer', 'warning',
                    'certificate_of_service', 'clearance', 'custom'
                );
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."document_templates_scope_enum" AS ENUM (
                    'global', 'per_contract_type', 'per_position'
                );
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        // 2. Table
        await queryRunner.query(`
            CREATE TABLE "document_templates" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "kind" "public"."document_templates_kind_enum" NOT NULL,
                "scope" "public"."document_templates_scope_enum" NOT NULL DEFAULT 'global',
                "scope_value" character varying,
                "name" character varying NOT NULL,
                "description" text,
                "version" integer NOT NULL DEFAULT 1,
                "is_active" boolean NOT NULL DEFAULT false,
                "body_html" text NOT NULL,
                "header_html" text,
                "footer_html" text,
                "variables_schema" jsonb,
                "page_size" character varying NOT NULL DEFAULT 'A4',
                "margins" jsonb,
                "created_by" character varying,
                "updated_by" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_document_templates" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_doc_tpl_kind" ON "document_templates" ("kind")`);
        await queryRunner.query(`CREATE INDEX "IDX_doc_tpl_lookup" ON "document_templates" ("kind", "scope", "scope_value", "is_active")`);

        // 3. Seed starter templates
        for (const seed of STARTER_TEMPLATES) {
            await queryRunner.query(
                `INSERT INTO "document_templates"
                    ("kind", "scope", "scope_value", "name", "description", "version",
                     "is_active", "body_html", "header_html", "footer_html",
                     "variables_schema", "page_size", "margins")
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13::jsonb)`,
                [
                    seed.kind,
                    seed.scope,
                    seed.scope_value || null,
                    seed.name,
                    seed.description || null,
                    1,
                    true,
                    seed.body_html,
                    seed.header_html || null,
                    seed.footer_html || null,
                    seed.variables_schema ? JSON.stringify(seed.variables_schema) : null,
                    seed.page_size || 'A4',
                    seed.margins ? JSON.stringify(seed.margins) : JSON.stringify({ top: 18, right: 16, bottom: 18, left: 16 }),
                ],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_doc_tpl_lookup"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_doc_tpl_kind"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "document_templates"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."document_templates_scope_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."document_templates_kind_enum"`);
    }
}

// ============================================================================
//                          STARTER TEMPLATES
// ============================================================================
// Kechita-branded HTML using Handlebars variables. Inline styles only (no
// external CSS) so they render identically in the editor preview and PDF.

const BRAND_HEADER = `
<div style="border-bottom:3px solid #0066B3;padding:14px 0;margin-bottom:18px;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-size:18pt;font-weight:700;color:#0066B3;letter-spacing:0.5px;">KECHITA CAPITAL LIMITED</div>
      <div style="font-size:9pt;color:#64748b;margin-top:2px;">{{company.address}} &middot; {{company.phone}} &middot; {{company.email}}</div>
    </div>
  </div>
</div>`;

const SIGNATURE_BLOCK = `
<div style="margin-top:48px;display:flex;justify-content:space-between;gap:40px;">
  <div style="flex:1;border-top:1px solid #1e293b;padding-top:6px;">
    <div style="font-size:9pt;color:#64748b;">Employee Signature</div>
    <div style="font-size:10pt;margin-top:6px;"><strong>{{staff.full_name}}</strong></div>
    <div style="font-size:9pt;color:#64748b;">Date: ____________________</div>
  </div>
  <div style="flex:1;border-top:1px solid #1e293b;padding-top:6px;">
    <div style="font-size:9pt;color:#64748b;">For and on behalf of {{company.name}}</div>
    <div style="font-size:10pt;margin-top:6px;"><strong>HR Manager</strong></div>
    <div style="font-size:9pt;color:#64748b;">Date: ____________________</div>
  </div>
</div>`;

interface SeedTemplate {
    kind: string;
    scope: string;
    scope_value?: string;
    name: string;
    description?: string;
    body_html: string;
    header_html?: string;
    footer_html?: string;
    variables_schema?: any;
    page_size?: 'A4' | 'Letter';
    margins?: { top: number; right: number; bottom: number; left: number };
}

const STARTER_TEMPLATES: SeedTemplate[] = [
    // --- Employment Contracts: 5 variants ---
    {
        kind: 'employment_contract',
        scope: 'per_contract_type',
        scope_value: 'permanent',
        name: 'Permanent Employment Contract',
        description: 'Standard open-ended employment contract.',
        body_html: `${BRAND_HEADER}
<h2 style="text-align:center;color:#0066B3;margin:8px 0 4px;">EMPLOYMENT CONTRACT</h2>
<p style="text-align:center;color:#64748b;font-size:9pt;margin:0 0 16px;">Ref: {{contract.contract_number}} &middot; Generated: {{today_long}}</p>

<p>This contract of employment ("Contract") is entered into on <strong>{{date contract.start_date}}</strong> between:</p>
<ol>
  <li><strong>{{company.name}}</strong>, having its registered office at {{company.address}} (hereinafter referred to as "the Employer"); and</li>
  <li><strong>{{staff.full_name}}</strong>, National ID No. {{staff.national_id}}, of {{staff.address}} (hereinafter referred to as "the Employee").</li>
</ol>

<h3>1. POSITION AND DUTIES</h3>
<p>The Employee shall be employed as <strong>{{staff.position.name}}</strong> in the {{staff.department.name}} department, reporting to <strong>{{staff.manager.full_name}}</strong> ({{staff.manager.position.name}}). The Employee shall perform all duties associated with this position as detailed in the Job Description appended to this Contract.</p>

<h3>2. COMMENCEMENT</h3>
<p>This Contract shall commence on <strong>{{date contract.start_date}}</strong> and shall continue until terminated in accordance with the provisions herein.</p>

<h3>3. REMUNERATION</h3>
<p>The Employee shall be paid a basic salary of <strong>{{currency contract.salary contract.salary_currency}}</strong> per month, payable on or before the last working day of each month by direct credit to the Employee's bank account.</p>

<h3>4. PROBATIONARY PERIOD</h3>
<p>The Employee shall be on probation for a period of three (3) months commencing from the date of appointment. During the probationary period, either party may terminate the Contract by giving seven (7) days' notice in writing.</p>

<h3>5. NOTICE OF TERMINATION</h3>
<p>After confirmation, either party may terminate this Contract by giving <strong>{{contract.notice_period_days}} days</strong>' written notice or by payment of salary in lieu of notice.</p>

<h3>6. CONFIDENTIALITY</h3>
<p>The Employee shall not, during the term of this Contract or at any time thereafter, disclose to any unauthorised person any confidential information relating to the business, customers, or affairs of the Employer.</p>

<h3>7. SPECIAL CONDITIONS</h3>
<p>{{default contract.special_conditions "None."}}</p>

<h3>8. GOVERNING LAW</h3>
<p>This Contract shall be governed by and construed in accordance with the laws of the Republic of Kenya, including the Employment Act, 2007.</p>

${SIGNATURE_BLOCK}`,
    },
    {
        kind: 'employment_contract',
        scope: 'per_contract_type',
        scope_value: 'fixed_term',
        name: 'Fixed-Term Employment Contract',
        description: 'Time-limited contract with explicit end date.',
        body_html: `${BRAND_HEADER}
<h2 style="text-align:center;color:#0066B3;margin:8px 0 4px;">FIXED-TERM EMPLOYMENT CONTRACT</h2>
<p style="text-align:center;color:#64748b;font-size:9pt;margin:0 0 16px;">Ref: {{contract.contract_number}} &middot; Generated: {{today_long}}</p>

<p>This fixed-term contract of employment is entered into between <strong>{{company.name}}</strong> ("the Employer") and <strong>{{staff.full_name}}</strong>, ID {{staff.national_id}} ("the Employee").</p>

<h3>1. TERM</h3>
<p>This Contract is for a fixed term commencing <strong>{{date contract.start_date}}</strong> and ending <strong>{{date contract.end_date}}</strong>, unless earlier terminated in accordance with its terms.</p>

<h3>2. POSITION</h3>
<p>The Employee is engaged as <strong>{{staff.position.name}}</strong> within the {{staff.department.name}} department, based at {{staff.branch.name}}.</p>

<h3>3. REMUNERATION</h3>
<p>The Employee shall be paid {{currency contract.salary contract.salary_currency}} per month, subject to applicable statutory deductions.</p>

<h3>4. EARLY TERMINATION</h3>
<p>Either party may terminate this Contract before the agreed end date by giving {{contract.notice_period_days}} days' written notice.</p>

<h3>5. RENEWAL</h3>
<p>Renewal of this Contract upon expiry shall be at the sole discretion of the Employer and shall be subject to performance and operational requirements. This Contract does not confer any expectation of renewal.</p>

<h3>6. SPECIAL CONDITIONS</h3>
<p>{{default contract.special_conditions "None."}}</p>

${SIGNATURE_BLOCK}`,
    },
    {
        kind: 'employment_contract',
        scope: 'per_contract_type',
        scope_value: 'probation',
        name: 'Probationary Employment Contract',
        description: 'Initial probationary period contract.',
        body_html: `${BRAND_HEADER}
<h2 style="text-align:center;color:#0066B3;margin:8px 0 4px;">PROBATIONARY EMPLOYMENT CONTRACT</h2>
<p style="text-align:center;color:#64748b;font-size:9pt;margin:0 0 16px;">Ref: {{contract.contract_number}} &middot; Generated: {{today_long}}</p>

<p>This probationary contract of employment is entered into between <strong>{{company.name}}</strong> and <strong>{{staff.full_name}}</strong>.</p>

<h3>1. PROBATIONARY PERIOD</h3>
<p>The Employee shall serve a probationary period commencing <strong>{{date contract.start_date}}</strong>{{#if contract.end_date}} and ending <strong>{{date contract.end_date}}</strong>{{/if}}. During this period, performance and suitability shall be assessed.</p>

<h3>2. POSITION & REMUNERATION</h3>
<p>The Employee is engaged as <strong>{{staff.position.name}}</strong> at a monthly basic salary of {{currency contract.salary contract.salary_currency}}.</p>

<h3>3. TERMINATION DURING PROBATION</h3>
<p>In accordance with the Employment Act, 2007, either party may terminate this Contract during the probationary period by giving seven (7) days' written notice or payment in lieu thereof.</p>

<h3>4. CONFIRMATION</h3>
<p>Upon successful completion of the probationary period, the Employee shall be considered for confirmation as a permanent employee under a separate contract.</p>

${SIGNATURE_BLOCK}`,
    },
    {
        kind: 'employment_contract',
        scope: 'per_contract_type',
        scope_value: 'internship',
        name: 'Internship Agreement',
        description: 'Internship engagement (typically 3-6 months).',
        body_html: `${BRAND_HEADER}
<h2 style="text-align:center;color:#0066B3;margin:8px 0 4px;">INTERNSHIP AGREEMENT</h2>
<p style="text-align:center;color:#64748b;font-size:9pt;margin:0 0 16px;">Ref: {{contract.contract_number}} &middot; Generated: {{today_long}}</p>

<p>This Internship Agreement is entered into between <strong>{{company.name}}</strong> and <strong>{{staff.full_name}}</strong>.</p>

<h3>1. INTERNSHIP PERIOD</h3>
<p>The internship shall run from <strong>{{date contract.start_date}}</strong> to <strong>{{date contract.end_date}}</strong>.</p>

<h3>2. ROLE</h3>
<p>The Intern shall be attached to the {{staff.department.name}} department and shall be assigned learning tasks under the supervision of {{staff.manager.full_name}}.</p>

<h3>3. STIPEND</h3>
<p>The Intern shall receive a monthly stipend of {{currency contract.salary contract.salary_currency}}.</p>

<h3>4. NATURE OF ENGAGEMENT</h3>
<p>This is a training engagement and does not constitute an employer-employee relationship under the Employment Act, 2007. The Intern shall not be entitled to terminal benefits.</p>

<h3>5. CONFIDENTIALITY</h3>
<p>The Intern shall maintain strict confidentiality regarding all information accessed during the internship.</p>

${SIGNATURE_BLOCK}`,
    },
    {
        kind: 'employment_contract',
        scope: 'per_contract_type',
        scope_value: 'consultancy',
        name: 'Consultancy Agreement',
        description: 'Independent consultant / contractor agreement.',
        body_html: `${BRAND_HEADER}
<h2 style="text-align:center;color:#0066B3;margin:8px 0 4px;">CONSULTANCY AGREEMENT</h2>
<p style="text-align:center;color:#64748b;font-size:9pt;margin:0 0 16px;">Ref: {{contract.contract_number}} &middot; Generated: {{today_long}}</p>

<p>This Consultancy Agreement is made between <strong>{{company.name}}</strong> ("the Client") and <strong>{{staff.full_name}}</strong> ("the Consultant").</p>

<h3>1. SCOPE OF SERVICES</h3>
<p>The Consultant shall provide services as {{staff.position.name}} for the period <strong>{{date contract.start_date}}</strong> to <strong>{{date contract.end_date}}</strong>.</p>

<h3>2. CONSULTANCY FEE</h3>
<p>The Client shall pay the Consultant a fee of {{currency contract.salary contract.salary_currency}} per month, subject to applicable withholding tax.</p>

<h3>3. INDEPENDENT CONTRACTOR</h3>
<p>The Consultant is engaged as an independent contractor and not as an employee. The Consultant shall be solely responsible for all taxes and statutory contributions.</p>

<h3>4. INTELLECTUAL PROPERTY</h3>
<p>All deliverables, work product and intellectual property created in the course of this engagement shall be the sole property of the Client.</p>

<h3>5. TERMINATION</h3>
<p>Either party may terminate this Agreement by giving {{contract.notice_period_days}} days' written notice.</p>

${SIGNATURE_BLOCK}`,
    },

    // --- Offer Letter ---
    {
        kind: 'offer_letter',
        scope: 'global',
        name: 'Standard Offer Letter',
        description: 'Conditional offer of employment.',
        body_html: `${BRAND_HEADER}
<p style="text-align:right;color:#64748b;font-size:9pt;">{{today_long}}</p>
<p><strong>{{candidate.first_name}} {{candidate.last_name}}</strong><br>{{candidate.email}}</p>

<h2 style="color:#0066B3;">OFFER OF EMPLOYMENT — {{upper offer.position_name}}</h2>

<p>Dear {{candidate.first_name}},</p>
<p>Following our recent recruitment process, we are pleased to offer you the position of <strong>{{offer.position_name}}</strong> at {{company.name}}, reporting to <strong>{{offer.reporting_to}}</strong>.</p>

<h3>Key Terms</h3>
<ul>
  <li><strong>Position:</strong> {{offer.position_name}}</li>
  <li><strong>Proposed start date:</strong> {{date offer.start_date}}</li>
  <li><strong>Basic salary:</strong> {{currency offer.salary offer.salary_currency}} per month</li>
  <li><strong>Reporting line:</strong> {{offer.reporting_to}}</li>
</ul>

<p><strong>Special clauses:</strong> {{default offer.special_clauses "None."}}</p>

<h3>Acceptance</h3>
<p>Kindly indicate your acceptance by following the secure link below on or before <strong>{{date offer.expiry_date}}</strong>:</p>
<p style="text-align:center;margin:20px 0;"><a href="{{accept_link}}" style="background:#0066B3;color:#fff;padding:10px 22px;text-decoration:none;border-radius:6px;font-weight:600;">Accept Offer</a></p>

<p>This offer is conditional upon satisfactory reference checks, background verification and submission of required documents. Should you have any questions, please feel free to reach out to our HR team.</p>

<p>We look forward to welcoming you to the Kechita family.</p>
<p>Yours sincerely,<br><br><strong>Human Resources Department</strong><br>{{company.name}}</p>`,
    },

    // --- Job Description ---
    {
        kind: 'job_description',
        scope: 'global',
        name: 'Job Description Template',
        description: 'Default JD layout for any position.',
        body_html: `${BRAND_HEADER}
<h2 style="color:#0066B3;text-align:center;margin:8px 0 4px;">JOB DESCRIPTION</h2>
<p style="text-align:center;color:#64748b;font-size:9pt;margin:0 0 18px;">Effective: {{date jd.effective_from}}</p>

<table style="width:100%;border:none;margin-bottom:14px;">
  <tr><td style="border:none;padding:4px 0;width:35%;"><strong>Position:</strong></td><td style="border:none;padding:4px 0;">{{jd.position}}</td></tr>
  <tr><td style="border:none;padding:4px 0;"><strong>Reports to:</strong></td><td style="border:none;padding:4px 0;">{{jd.reports_to}}</td></tr>
</table>

<h3>1. Job Purpose</h3>
<p>{{jd.purpose}}</p>

<h3>2. Key Responsibilities</h3>
{{bullets jd.responsibilities}}

<h3>3. Minimum Qualifications</h3>
{{bullets jd.qualifications}}

<h3>4. Required Skills</h3>
{{bullets jd.skills}}

<h3>5. Key Performance Indicators (KPIs)</h3>
{{bullets jd.kpis}}

<h3>6. Working Conditions</h3>
<p>{{jd.working_conditions}}</p>`,
    },

    // --- Salary Increment Letter ---
    {
        kind: 'salary_increment',
        scope: 'global',
        name: 'Salary Increment Letter',
        description: 'Notification of salary increment.',
        body_html: `${BRAND_HEADER}
<p style="text-align:right;color:#64748b;font-size:9pt;">{{today_long}}</p>
<p><strong>{{staff.full_name}}</strong><br>{{staff.position.name}}<br>{{staff.branch.name}}</p>

<h2 style="color:#0066B3;">SALARY REVIEW</h2>
<p>Dear {{staff.first_name}},</p>
<p>We are pleased to inform you that, following the recent review of your performance, your monthly basic salary has been adjusted with effect from <strong>{{date increment.effective_date}}</strong>.</p>

<table style="width:auto;margin:14px 0;">
  <tr><th>Previous salary</th><td>{{currency increment.previous_salary staff.salary_currency}}</td></tr>
  <tr><th>New salary</th><td><strong>{{currency increment.new_salary staff.salary_currency}}</strong></td></tr>
  <tr><th>Change</th><td>{{number increment.percent_change 2}}%</td></tr>
</table>

<p><strong>Reason:</strong> {{increment.reason}}</p>
<p>All other terms and conditions of your employment remain unchanged. We thank you for your continued dedication and contribution to the success of {{company.name}}.</p>

<p>Yours sincerely,<br><br><strong>Human Resources Department</strong></p>`,
    },

    // --- Transfer Letter ---
    {
        kind: 'transfer',
        scope: 'global',
        name: 'Transfer Letter',
        description: 'Internal transfer notification.',
        body_html: `${BRAND_HEADER}
<p style="text-align:right;color:#64748b;font-size:9pt;">{{today_long}}</p>
<p><strong>{{staff.full_name}}</strong><br>Employee No.: {{staff.employee_number}}</p>

<h2 style="color:#0066B3;">INTERNAL TRANSFER</h2>
<p>Dear {{staff.first_name}},</p>
<p>This is to confirm your transfer with effect from <strong>{{date transfer.effective_date}}</strong> as follows:</p>

<table style="width:100%;margin:14px 0;">
  <tr><th></th><th>From</th><th>To</th></tr>
  <tr><th>Branch</th><td>{{transfer.from_branch}}</td><td>{{transfer.to_branch}}</td></tr>
  <tr><th>Department</th><td>{{transfer.from_department}}</td><td>{{transfer.to_department}}</td></tr>
  <tr><th>Position</th><td>{{transfer.from_position}}</td><td>{{transfer.to_position}}</td></tr>
</table>

<p><strong>Reason for transfer:</strong> {{transfer.reason}}</p>
<p>All other terms and conditions of your employment remain unchanged. Kindly liaise with your current supervisor and the receiving branch manager for a smooth handover.</p>

<p>Yours sincerely,<br><br><strong>Human Resources Department</strong></p>`,
    },

    // --- Warning Letter ---
    {
        kind: 'warning',
        scope: 'global',
        name: 'Warning Letter',
        description: 'Disciplinary warning (verbal/written/final).',
        body_html: `${BRAND_HEADER}
<p style="text-align:right;color:#64748b;font-size:9pt;">{{date warning.date}}</p>
<p><strong>{{staff.full_name}}</strong><br>{{staff.position.name}}<br>Employee No.: {{staff.employee_number}}</p>

<h2 style="color:#dc2626;">{{upper warning.level}} WARNING</h2>

<p>Dear {{staff.first_name}},</p>
<p>This letter serves as a <strong>{{warning.level}} warning</strong> regarding the following incident:</p>

<p><strong>Incident date:</strong> {{date warning.incident_date}}<br>
<strong>Description:</strong> {{warning.incident_description}}</p>

<p>The above conduct is in breach of company policy and falls short of the standards expected of you as an employee of {{company.name}}.</p>

<h3>Expected Corrective Action</h3>
<p>{{warning.expected_corrective_action}}</p>

<p>Failure to demonstrate sustained improvement may result in further disciplinary action up to and including termination of employment.</p>

<p>You are required to sign and return a copy of this letter to acknowledge receipt. You may also submit a written response within seven (7) days.</p>

<p>Issued by:<br><strong>{{warning.issued_by}}</strong><br>Human Resources Department</p>

${SIGNATURE_BLOCK}`,
    },

    // --- Certificate of Service ---
    {
        kind: 'certificate_of_service',
        scope: 'global',
        name: 'Certificate of Service',
        description: 'Issued on exit per the Employment Act, 2007.',
        body_html: `${BRAND_HEADER}
<h2 style="text-align:center;color:#0066B3;margin:18px 0 6px;">CERTIFICATE OF SERVICE</h2>
<p style="text-align:center;color:#64748b;font-size:9pt;margin:0 0 24px;">Issued in accordance with Section 51 of the Employment Act, 2007</p>

<p>This is to certify that <strong>{{staff.full_name}}</strong>, National ID No. {{staff.national_id}}, was employed by <strong>{{company.name}}</strong> from <strong>{{date service.start_date}}</strong> to <strong>{{date service.end_date}}</strong>, a period of approximately <strong>{{service.duration_years}} year(s)</strong>.</p>

<p>At the time of leaving, {{#eq staff.gender "female"}}she{{else}}he{{/eq}} held the position of <strong>{{service.final_position}}</strong>.</p>

<p>{{#if service.reason_for_leaving}}The reason for leaving was: <strong>{{service.reason_for_leaving}}</strong>.{{/if}}</p>

<p>This certificate is issued at the request of the employee and without prejudice.</p>

<div style="margin-top:60px;">
  <div style="border-top:1px solid #1e293b;width:260px;padding-top:6px;">
    <div style="font-size:9pt;color:#64748b;">Authorised Signature</div>
    <div style="font-size:10pt;margin-top:4px;"><strong>Human Resources Manager</strong></div>
    <div style="font-size:9pt;color:#64748b;">{{company.name}} &middot; {{today_long}}</div>
  </div>
</div>`,
    },

    // --- Clearance Form ---
    {
        kind: 'clearance',
        scope: 'global',
        name: 'Employee Clearance Form',
        description: 'Off-boarding clearance checklist.',
        body_html: `${BRAND_HEADER}
<h2 style="text-align:center;color:#0066B3;margin:8px 0 18px;">EMPLOYEE CLEARANCE FORM</h2>

<table style="width:100%;margin-bottom:14px;">
  <tr><th>Employee name</th><td>{{staff.full_name}}</td></tr>
  <tr><th>Employee number</th><td>{{staff.employee_number}}</td></tr>
  <tr><th>Position</th><td>{{staff.position.name}}</td></tr>
  <tr><th>Department</th><td>{{staff.department.name}}</td></tr>
  <tr><th>Last working day</th><td>{{today_long}}</td></tr>
</table>

<h3>Clearance Checklist</h3>
<table style="width:100%;">
  <tr><th style="width:55%;">Item</th><th>Cleared by</th><th>Date</th><th>Signature</th></tr>
  <tr><td>Return of company laptop / IT equipment</td><td>IT</td><td></td><td></td></tr>
  <tr><td>Return of company phone / SIM card</td><td>IT</td><td></td><td></td></tr>
  <tr><td>Return of branch keys, ID card, access cards</td><td>Admin</td><td></td><td></td></tr>
  <tr><td>Settlement of outstanding loans / advances</td><td>Finance</td><td></td><td></td></tr>
  <tr><td>Handover of work files and customer records</td><td>Supervisor</td><td></td><td></td></tr>
  <tr><td>Email and system access revoked</td><td>IT</td><td></td><td></td></tr>
  <tr><td>Final payroll processed</td><td>Payroll</td><td></td><td></td></tr>
  <tr><td>Exit interview completed</td><td>HR</td><td></td><td></td></tr>
</table>

<div style="margin-top:40px;display:flex;justify-content:space-between;gap:40px;">
  <div style="flex:1;border-top:1px solid #1e293b;padding-top:6px;">
    <div style="font-size:9pt;color:#64748b;">Employee Signature</div>
    <div style="font-size:9pt;color:#64748b;margin-top:18px;">Date: ____________________</div>
  </div>
  <div style="flex:1;border-top:1px solid #1e293b;padding-top:6px;">
    <div style="font-size:9pt;color:#64748b;">HR Manager Signature</div>
    <div style="font-size:9pt;color:#64748b;margin-top:18px;">Date: ____________________</div>
  </div>
</div>`,
    },
];
