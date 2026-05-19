import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateContractTemplatesRichContent1779216220573 implements MigrationInterface {
    name = 'UpdateContractTemplatesRichContent1779216220573';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rich permanent contract template
        const permanentTemplate = `<div style="background:#0066B3;padding:16px 24px;color:#fff;">
  <div style="font-size:20pt;font-weight:700;letter-spacing:0.5px;">KECHITA CAPITAL LIMITED</div>
  <div style="font-size:9pt;color:#b3d9f2;margin-top:4px;">{{company.address}} &middot; {{company.phone}} &middot; {{company.email}}</div>
</div>
<div style="height:4px;background:#004d86;"></div>
<div style="padding:24px;font-family:Helvetica,Arial,sans-serif;font-size:9.5pt;color:#334155;line-height:1.5;">

<!-- Title Block -->
<div style="text-align:right;margin-bottom:8px;">
  <div style="font-size:13pt;font-weight:700;color:#0066B3;">EMPLOYMENT CONTRACT</div>
  <div style="font-size:9pt;color:#64748b;">Ref: {{contract.contract_number}} &middot; Generated: {{today_long}}</div>
</div>

<!-- Contract Type Banner -->
<div style="background:#f0f9ff;border:1px solid #bfdbfe;padding:12px 16px;text-align:center;margin-bottom:20px;">
  <div style="font-size:12pt;font-weight:700;color:#0066B3;">PERMANENT EMPLOYMENT</div>
</div>

<!-- Preamble -->
<p style="margin-bottom:16px;">This Employment Contract ("Contract") is entered into on <strong>{{date contract.start_date}}</strong> between:</p>

<!-- Employer Box -->
<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;margin-bottom:12px;">
  <div style="font-size:8pt;color:#64748b;text-transform:uppercase;margin-bottom:4px;">THE EMPLOYER</div>
  <div style="font-size:11pt;font-weight:700;color:#1e293b;">{{company.name}}</div>
  <div style="font-size:9pt;color:#475569;">{{company.address}}</div>
</div>

<div style="text-align:center;color:#64748b;font-size:9pt;margin:8px 0;">AND</div>

<!-- Employee Box -->
<div style="background:#f8fafc;border:1px solid #e2e8f0;padding:12px 16px;margin-bottom:16px;">
  <div style="font-size:8pt;color:#64748b;text-transform:uppercase;margin-bottom:4px;">THE EMPLOYEE</div>
  <div style="font-size:11pt;font-weight:700;color:#1e293b;">{{staff.full_name}}</div>
  <div style="font-size:9pt;color:#475569;">
    {{#if staff.employee_number}}Employee No: {{staff.employee_number}} &nbsp;|&nbsp; {{/if}}
    {{#if staff.national_id}}National ID: {{staff.national_id}} &nbsp;|&nbsp; {{/if}}
    {{#if staff.phone}}Phone: {{staff.phone}}{{/if}}
  </div>
  <div style="font-size:9pt;color:#475569;margin-top:4px;">
    {{#if staff.address}}{{staff.address}}, {{/if}}{{#if staff.city}}{{staff.city}}{{/if}}
  </div>
</div>

<p style="margin-bottom:20px;">The parties hereby agree to the following terms and conditions of employment:</p>

<!-- SECTION 1: APPOINTMENT -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">1. APPOINTMENT & POSITION</div>
</div>
<p style="margin-bottom:12px;">The Employer hereby appoints the Employee to the position detailed below, and the Employee accepts such appointment subject to the terms and conditions set out in this Contract.</p>

<table style="width:100%;margin-bottom:16px;font-size:9.5pt;">
  <tr>
    <td style="width:30%;color:#64748b;padding:4px 0;">Position:</td>
    <td style="font-weight:700;color:#1e293b;">{{default contract.job_title staff.position.name "As assigned"}}</td>
  </tr>
  <tr>
    <td style="color:#64748b;padding:4px 0;">Department:</td>
    <td>{{default staff.department.name "N/A"}}</td>
  </tr>
  <tr>
    <td style="color:#64748b;padding:4px 0;">Branch/Location:</td>
    <td>{{default staff.branch.name "Head Office"}}</td>
  </tr>
  <tr>
    <td style="color:#64748b;padding:4px 0;">Region:</td>
    <td>{{default staff.region.name "N/A"}}</td>
  </tr>
  {{#if staff.manager}}
  <tr>
    <td style="color:#64748b;padding:4px 0;">Reports To:</td>
    <td>{{staff.manager.full_name}} ({{staff.manager.position.name}})</td>
  </tr>
  {{/if}}
</table>

<p style="margin-bottom:20px;">The Employee shall perform all duties reasonably associated with the above position, as well as any additional duties that may be assigned from time to time by the Employer.</p>

<!-- SECTION 2: COMMENCEMENT -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">2. COMMENCEMENT & DURATION</div>
</div>
<table style="width:100%;margin-bottom:16px;font-size:9.5pt;">
  <tr>
    <td style="width:30%;color:#64748b;padding:4px 0;">Start Date:</td>
    <td style="font-weight:700;">{{date contract.start_date}}</td>
  </tr>
  {{#if contract.end_date}}
  <tr>
    <td style="color:#64748b;padding:4px 0;">End Date:</td>
    <td style="font-weight:700;">{{date contract.end_date}}</td>
  </tr>
  {{/if}}
  <tr>
    <td style="color:#64748b;padding:4px 0;">Contract Type:</td>
    <td>Permanent Employment</td>
  </tr>
</table>

<p style="margin-bottom:20px;">The Employee shall serve an initial probationary period of three (3) months from the commencement date. During probation, either party may terminate with seven (7) days' written notice. Confirmation of employment shall be subject to satisfactory performance during this period.</p>

<!-- SECTION 3: REMUNERATION -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">3. REMUNERATION & BENEFITS</div>
</div>

<div style="background:#ecfdf5;border:1px solid #a7f3d0;padding:16px 20px;margin-bottom:16px;">
  <div style="font-size:8pt;color:#065f46;text-transform:uppercase;margin-bottom:4px;">GROSS MONTHLY SALARY</div>
  <div style="font-size:16pt;font-weight:700;color:#047857;">{{currency contract.salary contract.salary_currency}}</div>
</div>

<p style="margin-bottom:12px;">The salary shall be paid monthly in arrears, on or before the last working day of each month, via direct bank transfer to the Employee's designated bank account.</p>

<p style="margin-bottom:8px;">The following statutory deductions shall be made in accordance with Kenyan law:</p>
<ul style="margin-bottom:12px;padding-left:20px;">
  <li>Pay As You Earn (PAYE) — Income Tax</li>
  <li>National Social Security Fund (NSSF) contributions</li>
  <li>National Hospital Insurance Fund (NHIF) contributions</li>
  <li>Housing Levy as applicable</li>
</ul>

<p style="margin-bottom:8px;">The Employer shall additionally provide:</p>
<ul style="margin-bottom:20px;padding-left:20px;">
  <li>Medical insurance cover for the Employee and dependants as per company policy</li>
  <li>Group Life Assurance and Personal Accident cover</li>
  <li>Annual salary review subject to company performance and individual appraisal</li>
</ul>

<!-- SECTION 4: WORKING HOURS -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">4. WORKING HOURS</div>
</div>
<p style="margin-bottom:20px;">The standard working hours shall be Monday to Friday, 8:00 AM to 5:00 PM, with a one-hour lunch break. The Employee may be required to work additional hours as reasonably necessary to fulfil their duties. Overtime shall be compensated in accordance with the Employment Act, 2007.</p>

<!-- SECTION 5: LEAVE -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">5. LEAVE ENTITLEMENTS</div>
</div>
<p style="margin-bottom:8px;">The Employee shall be entitled to the following leave benefits:</p>
<ul style="margin-bottom:20px;padding-left:20px;">
  <li>Annual Leave: 21 working days per calendar year, to be taken at mutually agreed times</li>
  <li>Sick Leave: As per the Employment Act — up to 30 days on full pay and 15 days on half pay per year, supported by a medical certificate</li>
  <li>Maternity Leave: 3 months on full pay (female employees)</li>
  <li>Paternity Leave: 2 weeks on full pay (male employees)</li>
  <li>Compassionate Leave: Up to 5 days per occurrence, as approved by management</li>
  <li>Public Holidays: All gazetted public holidays in Kenya</li>
</ul>

<!-- SECTION 6: CONFIDENTIALITY -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">6. CONFIDENTIALITY & INTELLECTUAL PROPERTY</div>
</div>
<p style="margin-bottom:12px;">The Employee acknowledges that during the course of employment, they may have access to confidential information, trade secrets, and proprietary materials belonging to the Employer. The Employee agrees to:</p>
<ul style="margin-bottom:12px;padding-left:20px;">
  <li>Maintain strict confidentiality of all business information, client data, and trade secrets</li>
  <li>Not disclose any confidential information to third parties without prior written consent</li>
  <li>Return all company materials, documents, and property upon termination of employment</li>
  <li>Assign to the Employer all intellectual property created during the course of employment</li>
</ul>
<p style="margin-bottom:20px;">This confidentiality obligation shall survive the termination of this Contract for a period of two (2) years.</p>

<!-- SECTION 7: TERMINATION -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">7. TERMINATION OF EMPLOYMENT</div>
</div>
<table style="width:100%;margin-bottom:12px;font-size:9.5pt;">
  <tr>
    <td style="width:30%;color:#64748b;padding:4px 0;">Notice Period:</td>
    <td>{{default contract.notice_period_days 30}} days written notice by either party</td>
  </tr>
</table>
<p style="margin-bottom:12px;">This Contract may be terminated by:</p>
<ul style="margin-bottom:12px;padding-left:20px;">
  <li>Either party giving {{default contract.notice_period_days 30}} days' written notice, or payment in lieu of notice</li>
  <li>The Employer, for gross misconduct or material breach of contract, without notice</li>
  <li>Mutual written agreement between both parties</li>
  <li>Redundancy, in accordance with the Employment Act, 2007</li>
</ul>
<p style="margin-bottom:20px;">Upon termination, the Employee shall be entitled to all accrued and unpaid salary, any outstanding leave days, and any other terminal benefits as required by law.</p>

<!-- SECTION 8: CODE OF CONDUCT -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">8. CODE OF CONDUCT & DISCIPLINARY PROCEDURE</div>
</div>
<p style="margin-bottom:12px;">The Employee shall at all times comply with the Employer's policies, procedures, and Code of Conduct. The Employer's disciplinary procedures, as amended from time to time, shall apply. The Employee shall:</p>
<ul style="margin-bottom:20px;padding-left:20px;">
  <li>Act with honesty, integrity, and professionalism at all times</li>
  <li>Comply with all applicable laws and company policies</li>
  <li>Avoid conflicts of interest and disclose any potential conflicts promptly</li>
  <li>Maintain a professional appearance and conduct in the workplace</li>
</ul>

<!-- SECTION 9: DISPUTE RESOLUTION -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">9. DISPUTE RESOLUTION</div>
</div>
<p style="margin-bottom:20px;">Any disputes arising out of or in connection with this Contract shall first be resolved through internal grievance procedures. If unresolved, the matter shall be referred to mediation, and thereafter to the Employment and Labour Relations Court of Kenya.</p>

<!-- SECTION 10: SPECIAL CONDITIONS -->
{{#if contract.special_conditions}}
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">10. SPECIAL TERMS & CONDITIONS</div>
</div>
<p style="margin-bottom:20px;">{{contract.special_conditions}}</p>
{{/if}}

<!-- SECTION 11: GENERAL -->
<div style="border-bottom:2px solid #0066B3;margin-bottom:12px;padding-bottom:4px;">
  <div style="font-size:11pt;font-weight:700;color:#0066B3;">{{#if contract.special_conditions}}11{{else}}10{{/if}}. GENERAL PROVISIONS</div>
</div>
<p style="margin-bottom:12px;">This Contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, and agreements. No amendment to this Contract shall be effective unless made in writing and signed by both parties.</p>
<p style="margin-bottom:20px;">This Contract shall be governed by and construed in accordance with the laws of the Republic of Kenya, including but not limited to the Employment Act, 2007, and the Labour Relations Act, 2007.</p>

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
</div>

</div>`;

        // Update permanent contract template
        await queryRunner.query(`
            UPDATE document_templates 
            SET body_html = $1, 
                updated_at = NOW()
            WHERE kind = 'employment_contract' AND scope_value = 'permanent'
        `, [permanentTemplate]);

        // Fixed-term template is similar but with yellow banner
        const fixedTermTemplate = permanentTemplate
            .replace('PERMANENT EMPLOYMENT', 'FIXED-TERM CONTRACT')
            .replace('background:#f0f9ff;border:1px solid #bfdbfe', 'background:#fef3c7;border:1px solid #fcd34d')
            .replace('color:#0066B3;', 'color:#b45309;')
            .replace('Permanent Employment', 'Fixed-Term Employment')
            .replace('<p style="margin-bottom:20px;">The Employee shall serve an initial probationary period of three (3) months from the commencement date. During probation, either party may terminate with seven (7) days\' written notice. Confirmation of employment shall be subject to satisfactory performance during this period.</p>', 
`<table style="width:100%;margin-bottom:12px;font-size:9.5pt;">
  <tr>
    <td style="width:30%;color:#64748b;padding:4px 0;">Start Date:</td>
    <td style="font-weight:700;">{{date contract.start_date}}</td>
  </tr>
  <tr>
    <td style="color:#64748b;padding:4px 0;">End Date:</td>
    <td style="font-weight:700;color:#dc2626;">{{date contract.end_date}}</td>
  </tr>
  <tr>
    <td style="color:#64748b;padding:4px 0;">Contract Type:</td>
    <td>Fixed-Term Employment</td>
  </tr>
</table>
<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px 16px;margin-bottom:20px;">
  <p style="margin:0;font-size:9pt;color:#92400e;">This is a fixed-term contract for a specific duration. Employment shall automatically terminate on the End Date unless renewed by mutual written agreement.</p>
</div>`);

        await queryRunner.query(`
            UPDATE document_templates 
            SET body_html = $1, 
                updated_at = NOW()
            WHERE kind = 'employment_contract' AND scope_value = 'fixed_term'
        `, [fixedTermTemplate]);

        console.log('Contract templates updated with rich content');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No rollback - previous templates are archived in git history
        console.log('Rollback not implemented - templates remain updated');
    }
}
