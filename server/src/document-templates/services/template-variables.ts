import { DocumentTemplateKind } from '../entities/document-template.entity';

export interface VariableDef {
    key: string;        // dot-path inside the render context, e.g. 'staff.first_name'
    label: string;      // human label shown in the editor sidebar
    group: string;      // grouping for the sidebar accordion
    sample: any;        // value used for editor live preview
}

/**
 * Static "common" variables available to every template. Real values are
 * injected by TemplateContextService at render time; the samples here are
 * only used by the editor preview when no real context is selected.
 */
export const COMMON_VARIABLES: VariableDef[] = [
    { key: 'today', label: 'Today (short)', group: 'Common', sample: new Date().toISOString().slice(0, 10) },
    { key: 'today_long', label: 'Today (long)', group: 'Common', sample: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) },
    { key: 'company.name', label: 'Company name', group: 'Company', sample: 'Kechita Capital Limited' },
    { key: 'company.address', label: 'Company address', group: 'Company', sample: 'Nairobi, Kenya' },
    { key: 'company.phone', label: 'Company phone', group: 'Company', sample: '+254 700 000 000' },
    { key: 'company.email', label: 'Company email', group: 'Company', sample: 'hr@kechita.co.ke' },
];

const STAFF_VARIABLES: VariableDef[] = [
    { key: 'staff.first_name', label: 'First name', group: 'Staff', sample: 'Jane' },
    { key: 'staff.middle_name', label: 'Middle name', group: 'Staff', sample: 'Mwende' },
    { key: 'staff.last_name', label: 'Last name', group: 'Staff', sample: 'Otieno' },
    { key: 'staff.full_name', label: 'Full name', group: 'Staff', sample: 'Jane Mwende Otieno' },
    { key: 'staff.employee_number', label: 'Employee number', group: 'Staff', sample: 'KC-2026-0042' },
    { key: 'staff.national_id', label: 'National ID', group: 'Staff', sample: '32145678' },
    { key: 'staff.tax_pin', label: 'KRA PIN', group: 'Staff', sample: 'A012345678X' },
    { key: 'staff.nssf_number', label: 'NSSF number', group: 'Staff', sample: '7654321' },
    { key: 'staff.nhif_number', label: 'NHIF number', group: 'Staff', sample: '9876543' },
    { key: 'staff.personal_email', label: 'Personal email', group: 'Staff', sample: 'jane.otieno@example.com' },
    { key: 'staff.phone', label: 'Phone', group: 'Staff', sample: '+254 712 345 678' },
    { key: 'staff.address', label: 'Address', group: 'Staff', sample: 'P.O. Box 1234, Nairobi' },
    { key: 'staff.city', label: 'City', group: 'Staff', sample: 'Nairobi' },
    { key: 'staff.gender', label: 'Gender', group: 'Staff', sample: 'female' },
    { key: 'staff.date_of_birth', label: 'Date of birth', group: 'Staff', sample: '1990-06-15' },
    { key: 'staff.hire_date', label: 'Hire date', group: 'Staff', sample: '2026-01-15' },
    { key: 'staff.position.name', label: 'Position', group: 'Staff', sample: 'Branch Manager' },
    { key: 'staff.department.name', label: 'Department', group: 'Staff', sample: 'Operations' },
    { key: 'staff.branch.name', label: 'Branch', group: 'Staff', sample: 'Nairobi CBD' },
    { key: 'staff.region.name', label: 'Region', group: 'Staff', sample: 'Nairobi' },
    { key: 'staff.manager.full_name', label: 'Manager name', group: 'Staff', sample: 'Peter Kamau' },
    { key: 'staff.manager.position.name', label: 'Manager position', group: 'Staff', sample: 'Regional Manager' },
    { key: 'staff.bank_name', label: 'Bank name', group: 'Staff', sample: 'Equity Bank' },
    { key: 'staff.bank_branch', label: 'Bank branch', group: 'Staff', sample: 'Westlands' },
    { key: 'staff.bank_account_number', label: 'Bank account', group: 'Staff', sample: '0123456789' },
    { key: 'staff.basic_salary', label: 'Basic salary', group: 'Staff', sample: 85000 },
    { key: 'staff.salary_currency', label: 'Salary currency', group: 'Staff', sample: 'KES' },
];

const CONTRACT_VARIABLES: VariableDef[] = [
    { key: 'contract.contract_number', label: 'Contract number', group: 'Contract', sample: 'CTR-2026-0042' },
    { key: 'contract.contract_type', label: 'Contract type', group: 'Contract', sample: 'permanent' },
    { key: 'contract.start_date', label: 'Start date', group: 'Contract', sample: '2026-01-15' },
    { key: 'contract.end_date', label: 'End date', group: 'Contract', sample: '' },
    { key: 'contract.salary', label: 'Salary (contract)', group: 'Contract', sample: 85000 },
    { key: 'contract.salary_currency', label: 'Salary currency', group: 'Contract', sample: 'KES' },
    { key: 'contract.notice_period_days', label: 'Notice period (days)', group: 'Contract', sample: 30 },
    { key: 'contract.title', label: 'Contract title', group: 'Contract', sample: 'Permanent Employment Contract' },
    { key: 'contract.job_title', label: 'Job title', group: 'Contract', sample: 'Branch Manager' },
    { key: 'contract.special_conditions', label: 'Special conditions', group: 'Contract', sample: '' },
];

const OFFER_VARIABLES: VariableDef[] = [
    { key: 'offer.position_name', label: 'Position offered', group: 'Offer', sample: 'Branch Manager' },
    { key: 'offer.start_date', label: 'Proposed start date', group: 'Offer', sample: '2026-02-01' },
    { key: 'offer.salary', label: 'Offered salary', group: 'Offer', sample: 85000 },
    { key: 'offer.salary_currency', label: 'Salary currency', group: 'Offer', sample: 'KES' },
    { key: 'offer.expiry_date', label: 'Offer expiry date', group: 'Offer', sample: '2026-01-25' },
    { key: 'offer.reporting_to', label: 'Reports to', group: 'Offer', sample: 'Regional Manager' },
    { key: 'offer.special_clauses', label: 'Special clauses', group: 'Offer', sample: '' },
    { key: 'candidate.first_name', label: 'Candidate first name', group: 'Candidate', sample: 'Jane' },
    { key: 'candidate.last_name', label: 'Candidate last name', group: 'Candidate', sample: 'Otieno' },
    { key: 'candidate.email', label: 'Candidate email', group: 'Candidate', sample: 'jane.otieno@example.com' },
    { key: 'accept_link', label: 'Accept link', group: 'Offer', sample: 'https://portal.kechita.co.ke/offer/accept/TOKEN' },
];

const JD_VARIABLES: VariableDef[] = [
    { key: 'jd.position', label: 'Position', group: 'JD', sample: 'Branch Manager' },
    { key: 'jd.purpose', label: 'Job purpose', group: 'JD', sample: 'Lead branch operations and customer relationship management.' },
    { key: 'jd.responsibilities', label: 'Responsibilities (list)', group: 'JD', sample: ['Manage branch operations daily', 'Achieve loan portfolio targets', 'Maintain audit compliance'] },
    { key: 'jd.qualifications', label: 'Qualifications (list)', group: 'JD', sample: ['Bachelor\'s degree in Business or related field', '5+ years in microfinance'] },
    { key: 'jd.skills', label: 'Skills (list)', group: 'JD', sample: ['Leadership', 'Credit analysis', 'Customer service'] },
    { key: 'jd.kpis', label: 'Key KPIs (list)', group: 'JD', sample: ['Monthly disbursement target', 'PAR <5%', 'Customer satisfaction >85%'] },
    { key: 'jd.reports_to', label: 'Reports to', group: 'JD', sample: 'Regional Manager' },
    { key: 'jd.working_conditions', label: 'Working conditions', group: 'JD', sample: 'Branch office; field visits as required.' },
    { key: 'jd.effective_from', label: 'Effective from', group: 'JD', sample: '2026-01-01' },
];

const INCREMENT_VARIABLES: VariableDef[] = [
    { key: 'increment.previous_salary', label: 'Previous salary', group: 'Increment', sample: 75000 },
    { key: 'increment.new_salary', label: 'New salary', group: 'Increment', sample: 85000 },
    { key: 'increment.percent_change', label: 'Percent change', group: 'Increment', sample: 13.33 },
    { key: 'increment.effective_date', label: 'Effective date', group: 'Increment', sample: '2026-02-01' },
    { key: 'increment.reason', label: 'Reason', group: 'Increment', sample: 'Annual performance review' },
];

const TRANSFER_VARIABLES: VariableDef[] = [
    { key: 'transfer.from_branch', label: 'From branch', group: 'Transfer', sample: 'Nairobi CBD' },
    { key: 'transfer.to_branch', label: 'To branch', group: 'Transfer', sample: 'Mombasa' },
    { key: 'transfer.from_department', label: 'From department', group: 'Transfer', sample: 'Operations' },
    { key: 'transfer.to_department', label: 'To department', group: 'Transfer', sample: 'Operations' },
    { key: 'transfer.from_position', label: 'From position', group: 'Transfer', sample: 'Branch Officer' },
    { key: 'transfer.to_position', label: 'To position', group: 'Transfer', sample: 'Branch Manager' },
    { key: 'transfer.effective_date', label: 'Effective date', group: 'Transfer', sample: '2026-02-01' },
    { key: 'transfer.reason', label: 'Reason', group: 'Transfer', sample: 'Career progression and organisational need.' },
];

const WARNING_VARIABLES: VariableDef[] = [
    { key: 'warning.level', label: 'Warning level', group: 'Warning', sample: 'written' },
    { key: 'warning.date', label: 'Issue date', group: 'Warning', sample: '2026-02-01' },
    { key: 'warning.incident_date', label: 'Incident date', group: 'Warning', sample: '2026-01-28' },
    { key: 'warning.incident_description', label: 'Incident description', group: 'Warning', sample: 'Repeated lateness without notice.' },
    { key: 'warning.expected_corrective_action', label: 'Expected corrective action', group: 'Warning', sample: 'Punctual attendance going forward.' },
    { key: 'warning.issued_by', label: 'Issued by', group: 'Warning', sample: 'HR Manager' },
];

const COS_VARIABLES: VariableDef[] = [
    { key: 'service.start_date', label: 'Service start date', group: 'Service', sample: '2022-01-10' },
    { key: 'service.end_date', label: 'Service end date', group: 'Service', sample: '2026-01-31' },
    { key: 'service.duration_years', label: 'Years of service', group: 'Service', sample: 4 },
    { key: 'service.final_position', label: 'Final position', group: 'Service', sample: 'Branch Manager' },
    { key: 'service.reason_for_leaving', label: 'Reason for leaving', group: 'Service', sample: 'Resignation' },
];

/** Returns the full variable catalog for a given template kind. */
export function getVariablesForKind(kind: DocumentTemplateKind): VariableDef[] {
    const common = COMMON_VARIABLES;
    switch (kind) {
        case DocumentTemplateKind.EMPLOYMENT_CONTRACT:
            return [...common, ...STAFF_VARIABLES, ...CONTRACT_VARIABLES];
        case DocumentTemplateKind.OFFER_LETTER:
            return [...common, ...OFFER_VARIABLES];
        case DocumentTemplateKind.JOB_DESCRIPTION:
            return [...common, ...JD_VARIABLES];
        case DocumentTemplateKind.SALARY_INCREMENT:
            return [...common, ...STAFF_VARIABLES, ...INCREMENT_VARIABLES];
        case DocumentTemplateKind.TRANSFER:
            return [...common, ...STAFF_VARIABLES, ...TRANSFER_VARIABLES];
        case DocumentTemplateKind.WARNING:
            return [...common, ...STAFF_VARIABLES, ...WARNING_VARIABLES];
        case DocumentTemplateKind.CERTIFICATE_OF_SERVICE:
            return [...common, ...STAFF_VARIABLES, ...COS_VARIABLES];
        case DocumentTemplateKind.CLEARANCE:
            return [...common, ...STAFF_VARIABLES];
        case DocumentTemplateKind.CUSTOM:
        default:
            return [...common, ...STAFF_VARIABLES];
    }
}

/** Build a "sample" render context from the catalog — used for editor preview. */
export function buildSampleContext(kind: DocumentTemplateKind): Record<string, any> {
    const vars = getVariablesForKind(kind);
    const ctx: any = {};
    for (const v of vars) {
        setNested(ctx, v.key, v.sample);
    }
    return ctx;
}

function setNested(target: any, dotPath: string, value: any) {
    const parts = dotPath.split('.');
    let node = target;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (typeof node[p] !== 'object' || node[p] === null) node[p] = {};
        node = node[p];
    }
    node[parts[parts.length - 1]] = value;
}
