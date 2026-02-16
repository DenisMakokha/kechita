import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { uuid } from '../common/id-utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

export interface ContractData {
    employee_name: string;
    employee_id_number?: string;
    employee_address?: string;
    employee_phone?: string;
    employee_email?: string;

    position_title: string;
    department?: string;
    branch?: string;
    reporting_to?: string;

    start_date: Date;
    contract_type: 'permanent' | 'fixed_term' | 'probation';
    contract_duration_months?: number; // For fixed term
    probation_months?: number;

    salary: number;
    salary_currency: string;
    payment_frequency: 'monthly' | 'bi-weekly' | 'weekly';

    allowances?: Array<{
        name: string;
        amount: number;
    }>;

    benefits?: string[];

    working_hours?: string;
    annual_leave_days?: number;
    sick_leave_days?: number;

    notice_period_days?: number;

    special_terms?: string[];

    company_name?: string;
    company_address?: string;
    hr_manager_name?: string;
}

export interface OfferLetterData {
    candidate_name: string;
    position_title: string;
    department?: string;

    start_date: Date;
    salary: number;
    salary_currency: string;

    benefits?: string[];
    allowances?: Array<{ name: string; amount: number }>;

    offer_expiry_date: Date;
    probation_months?: number;

    company_name?: string;
    hr_manager_name?: string;
}

@Injectable()
export class ContractService {
    private readonly uploadDir = './uploads/contracts';

    constructor() {
        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    async generateEmploymentContract(data: ContractData): Promise<{ filePath: string; fileName: string }> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ 
                    margin: 50,
                    size: 'A4',
                    info: {
                        Title: `Employment Contract - ${data.employee_name}`,
                        Author: 'Kechita Capital',
                        Subject: 'Employment Contract',
                        Creator: 'Kechita Capital HR Portal',
                    }
                });
                const safeName = (data.employee_name || 'employee').replace(/[^a-z0-9_-]/gi, '_');
                const fileName = `Contract_${safeName}_${uuid()}.pdf`;
                const filePath = path.join(this.uploadDir, fileName);
                const writeStream = fs.createWriteStream(filePath);

                doc.pipe(writeStream);

                const pageWidth = doc.page.width;
                const margin = 50;
                const contentWidth = pageWidth - (margin * 2);

                // ===== PROFESSIONAL HEADER =====
                doc.rect(0, 0, pageWidth, 70).fill('#0066B3');
                doc.fontSize(24).fillColor('#FFFFFF').text('KECHITA CAPITAL', margin, 20, { width: contentWidth });
                doc.fontSize(9).fillColor('#B3D9F2').text('Your Growth Partner', margin, 48);
                doc.fontSize(10).fillColor('#FFFFFF').text('EMPLOYMENT CONTRACT', pageWidth - margin - 150, 28, { width: 150, align: 'right' });

                doc.y = 90;

                // Document reference
                doc.fontSize(9).fillColor('#64748b').text(`Document Ref: KC-EC-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`, margin, doc.y, { align: 'right' });
                doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, { align: 'right' });
                doc.moveDown();

                // Contract details
                doc.fontSize(10).fillColor('#64748b')
                    .text(`Contract Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
                doc.text(`Contract Type: ${data.contract_type.replace('_', ' ').toUpperCase()}`);
                doc.moveDown();

                // Parties
                doc.fontSize(12).fillColor('#1e293b').text('PARTIES TO THIS CONTRACT:', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor('#334155');
                doc.text(`EMPLOYER: ${data.company_name || 'Kechita Capital Limited'}`);
                if (data.company_address) doc.text(`Address: ${data.company_address}`);
                doc.moveDown(0.5);
                doc.text(`EMPLOYEE: ${data.employee_name}`);
                if (data.employee_id_number) doc.text(`ID Number: ${data.employee_id_number}`);
                if (data.employee_address) doc.text(`Address: ${data.employee_address}`);
                if (data.employee_phone) doc.text(`Phone: ${data.employee_phone}`);
                if (data.employee_email) doc.text(`Email: ${data.employee_email}`);
                doc.moveDown();

                // Terms of Employment
                doc.fontSize(12).fillColor('#1e293b').text('1. POSITION AND DUTIES', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor('#334155');
                doc.text(`Position: ${data.position_title}`);
                if (data.department) doc.text(`Department: ${data.department}`);
                if (data.branch) doc.text(`Branch: ${data.branch}`);
                if (data.reporting_to) doc.text(`Reporting To: ${data.reporting_to}`);
                doc.moveDown();

                // Commencement
                doc.fontSize(12).fillColor('#1e293b').text('2. COMMENCEMENT AND DURATION', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor('#334155');
                doc.text(`Start Date: ${data.start_date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
                if (data.probation_months) {
                    doc.text(`Probation Period: ${data.probation_months} months`);
                }
                if (data.contract_type === 'fixed_term' && data.contract_duration_months) {
                    doc.text(`Contract Duration: ${data.contract_duration_months} months`);
                }
                doc.moveDown();

                // Remuneration
                doc.fontSize(12).fillColor('#1e293b').text('3. REMUNERATION', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor('#334155');
                doc.text(`Basic Salary: ${data.salary_currency} ${data.salary.toLocaleString()} per month`);
                doc.text(`Payment Frequency: ${data.payment_frequency}`);

                if (data.allowances && data.allowances.length > 0) {
                    doc.moveDown(0.5);
                    doc.text('Allowances:');
                    for (const allowance of data.allowances) {
                        doc.text(`  • ${allowance.name}: ${data.salary_currency} ${allowance.amount.toLocaleString()}`);
                    }
                }
                doc.moveDown();

                // Benefits
                if (data.benefits && data.benefits.length > 0) {
                    doc.fontSize(12).fillColor('#1e293b').text('4. BENEFITS', { underline: true });
                    doc.moveDown(0.5);
                    doc.fontSize(10).fillColor('#334155');
                    for (const benefit of data.benefits) {
                        doc.text(`  • ${benefit}`);
                    }
                    doc.moveDown();
                }

                // Working Hours
                doc.fontSize(12).fillColor('#1e293b').text('5. WORKING HOURS', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor('#334155');
                doc.text(data.working_hours || 'Standard working hours are Monday to Friday, 8:00 AM to 5:00 PM');
                doc.moveDown();

                // Leave
                doc.fontSize(12).fillColor('#1e293b').text('6. LEAVE ENTITLEMENT', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor('#334155');
                doc.text(`Annual Leave: ${data.annual_leave_days || 21} working days per year`);
                doc.text(`Sick Leave: ${data.sick_leave_days || 14} days per year`);
                doc.moveDown();

                // Termination
                doc.fontSize(12).fillColor('#1e293b').text('7. TERMINATION', { underline: true });
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor('#334155');
                doc.text(`Notice Period: ${data.notice_period_days || 30} days written notice by either party`);
                doc.moveDown();

                // Special Terms
                if (data.special_terms && data.special_terms.length > 0) {
                    doc.fontSize(12).fillColor('#1e293b').text('8. SPECIAL TERMS', { underline: true });
                    doc.moveDown(0.5);
                    doc.fontSize(10).fillColor('#334155');
                    for (const term of data.special_terms) {
                        doc.text(`  • ${term}`);
                    }
                    doc.moveDown();
                }

                // Add new page for signatures
                doc.addPage();

                // Signatures
                doc.fontSize(12).fillColor('#1e293b').text('SIGNATURES', { underline: true });
                doc.moveDown();

                doc.fontSize(10).fillColor('#334155');
                doc.text('FOR AND ON BEHALF OF THE EMPLOYER:');
                doc.moveDown(2);
                doc.text('_______________________________');
                doc.text(data.hr_manager_name || 'HR Manager');
                doc.text('Date: _______________');
                doc.moveDown(2);

                doc.text('EMPLOYEE ACCEPTANCE:');
                doc.moveDown(0.5);
                doc.text('I have read and understood the terms and conditions of this contract and agree to be bound by them.');
                doc.moveDown(2);
                doc.text('_______________________________');
                doc.text(data.employee_name);
                doc.text('Date: _______________');

                // Footer
                doc.moveDown(2);
                doc.fontSize(8).fillColor('#94a3b8').text('This contract is subject to the laws of Kenya.', { align: 'center' });

                doc.end();

                writeStream.on('finish', () => {
                    resolve({ filePath: `/uploads/contracts/${fileName}`, fileName });
                });

                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    async generateOfferLetter(data: OfferLetterData): Promise<{ filePath: string; fileName: string }> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ 
                    margin: 50,
                    size: 'A4',
                    info: {
                        Title: `Offer Letter - ${data.candidate_name}`,
                        Author: 'Kechita Capital',
                        Subject: 'Offer of Employment',
                        Creator: 'Kechita Capital HR Portal',
                    }
                });
                const safeName = (data.candidate_name || 'candidate').replace(/[^a-z0-9_-]/gi, '_');
                const fileName = `Offer_${safeName}_${uuid()}.pdf`;
                const filePath = path.join(this.uploadDir, fileName);
                const writeStream = fs.createWriteStream(filePath);

                doc.pipe(writeStream);

                const pageWidth = doc.page.width;
                const margin = 50;
                const contentWidth = pageWidth - (margin * 2);

                // ===== PROFESSIONAL HEADER =====
                doc.rect(0, 0, pageWidth, 70).fill('#0066B3');
                doc.fontSize(24).fillColor('#FFFFFF').text('KECHITA CAPITAL', margin, 20, { width: contentWidth });
                doc.fontSize(9).fillColor('#B3D9F2').text('Your Growth Partner', margin, 48);
                doc.fontSize(10).fillColor('#FFFFFF').text('OFFER OF EMPLOYMENT', pageWidth - margin - 150, 28, { width: 150, align: 'right' });

                doc.y = 90;

                // Document reference and date
                doc.fontSize(9).fillColor('#64748b').text(`Ref: KC-OL-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`, { align: 'right' });
                doc.fontSize(10).fillColor('#334155').text(`Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`);
                doc.moveDown();

                // Greeting
                doc.fontSize(11).fillColor('#334155');
                doc.text(`Dear ${data.candidate_name},`);
                doc.moveDown();

                // Opening
                doc.text('We are pleased to offer you employment at ' + (data.company_name || 'Kechita Capital Limited') + ' on the following terms:');
                doc.moveDown();

                // Position
                doc.fontSize(11).fillColor('#1e293b').text('Position:', { continued: true }).fillColor('#334155').text(` ${data.position_title}`);
                if (data.department) doc.text(`Department: ${data.department}`);
                doc.moveDown();

                // Compensation
                doc.fontSize(11).fillColor('#1e293b').text('Compensation:');
                doc.fillColor('#334155').text(`  Base Salary: ${data.salary_currency} ${data.salary.toLocaleString()} per month`);

                if (data.allowances && data.allowances.length > 0) {
                    for (const allowance of data.allowances) {
                        doc.text(`  ${allowance.name}: ${data.salary_currency} ${allowance.amount.toLocaleString()}`);
                    }
                }
                doc.moveDown();

                // Start Date
                doc.fontSize(11).fillColor('#1e293b').text('Start Date:', { continued: true })
                    .fillColor('#334155').text(` ${data.start_date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);

                if (data.probation_months) {
                    doc.text(`Probation Period: ${data.probation_months} months`);
                }
                doc.moveDown();

                // Benefits
                if (data.benefits && data.benefits.length > 0) {
                    doc.fontSize(11).fillColor('#1e293b').text('Benefits:');
                    doc.fillColor('#334155');
                    for (const benefit of data.benefits) {
                        doc.text(`  • ${benefit}`);
                    }
                    doc.moveDown();
                }

                // Expiry
                doc.moveDown();
                doc.fontSize(11).fillColor('#dc2626').text(`This offer is valid until ${data.offer_expiry_date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`);
                doc.moveDown();

                // Acceptance
                doc.fillColor('#334155').text('To accept this offer, please sign and return this letter before the expiry date.');
                doc.moveDown(2);

                // Closing
                doc.text('We look forward to welcoming you to our team.');
                doc.moveDown();
                doc.text('Sincerely,');
                doc.moveDown(2);
                doc.text('_______________________________');
                doc.text(data.hr_manager_name || 'Human Resources Manager');
                doc.text(data.company_name || 'Kechita Capital Limited');

                // Acceptance signature
                doc.moveDown(3);
                doc.fontSize(11).fillColor('#1e293b').text('ACCEPTANCE');
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor('#334155')
                    .text('I, ' + data.candidate_name + ', accept the offer of employment as outlined above.');
                doc.moveDown(2);
                doc.text('Signature: _______________________________    Date: _______________');

                doc.end();

                writeStream.on('finish', () => {
                    resolve({ filePath: `/uploads/contracts/${fileName}`, fileName });
                });

                writeStream.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    // ==================== JOB DESCRIPTION PDF ====================

    async generateJobDescriptionPDF(job: {
        title: string;
        job_code?: string;
        description?: string;
        responsibilities?: string;
        requirements?: string;
        benefits?: string;
        education_requirements?: string;
        required_skills?: string[];
        preferred_skills?: string[];
        employment_type?: string;
        experience_level?: string;
        min_experience_years?: number;
        max_experience_years?: number;
        salary_min?: number;
        salary_max?: number;
        salary_currency?: string;
        show_salary?: boolean;
        location?: string;
        is_remote?: boolean;
        is_hybrid?: boolean;
        vacancies?: number;
        deadline?: Date | string;
        department?: { name: string } | null;
        branch?: { name: string } | null;
        region?: { name: string } | null;
        position?: { name: string } | null;
        hiringManager?: { first_name: string; last_name: string } | null;
    }): Promise<{ buffer: Buffer; fileName: string }> {
        const companyName = 'Kechita Capital Limited';
        const companyAddress = 'Nairobi, Kenya';

        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 55,
                    size: 'A4',
                    bufferPages: true,
                    info: {
                        Title: `Job Description - ${job.title}`,
                        Author: companyName,
                        Subject: 'Job Description',
                        Creator: `${companyName} HR Portal`,
                    },
                });

                const chunks: Buffer[] = [];
                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const safeName = (job.title || 'JD').replace(/[^a-z0-9_-]/gi, '_');
                    resolve({ buffer, fileName: `JD_${safeName}_${job.job_code || 'draft'}.pdf` });
                });
                doc.on('error', reject);

                const pageW = doc.page.width;
                const M = 55;
                const CW = pageW - M * 2;
                const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
                const fmtMoney = (v: any, cur?: string) => `${cur || 'KES'} ${Number(v || 0).toLocaleString('en-US')}`;
                const employmentTypeLabel: Record<string, string> = {
                    full_time: 'Full-Time', part_time: 'Part-Time', contract: 'Contract',
                    internship: 'Internship', temporary: 'Temporary',
                };
                const experienceLabel: Record<string, string> = {
                    entry: 'Entry Level', junior: 'Junior', mid: 'Mid-Level',
                    senior: 'Senior', lead: 'Lead / Principal', executive: 'Executive',
                };

                // Helper to split text lines (description/responsibilities/requirements may be newline-separated)
                const splitLines = (text?: string): string[] => {
                    if (!text) return [];
                    return text.split(/\n/).map(l => l.trim()).filter(Boolean);
                };

                // ========== HEADER ==========
                doc.rect(0, 0, pageW, 90).fill('#0066B3');
                doc.rect(0, 90, pageW, 5).fill('#004d86');

                doc.fontSize(20).fillColor('#FFFFFF').font('Helvetica-Bold')
                    .text(companyName.toUpperCase(), M, 14, { width: CW });
                doc.fontSize(9).fillColor('#b3d9f2').font('Helvetica')
                    .text(companyAddress, M, 38);

                doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica-Bold')
                    .text('JOB DESCRIPTION', M, 16, { width: CW, align: 'right' });
                if (job.job_code) {
                    doc.fontSize(9).fillColor('#b3d9f2').font('Helvetica')
                        .text(`Ref: ${job.job_code}`, M, 34, { width: CW, align: 'right' });
                }
                doc.fontSize(8).fillColor('#b3d9f2')
                    .text(`Generated: ${fmtDate(new Date())}`, M, 46, { width: CW, align: 'right' });

                // Job title banner
                doc.rect(M, 60, CW, 26).fillAndStroke('#ffffff20', '#ffffff40');
                doc.fontSize(15).fillColor('#FFFFFF').font('Helvetica-Bold')
                    .text(job.title, M + 12, 66, { width: CW - 24 });

                doc.y = 110;

                // ========== POSITION SUMMARY TABLE ==========
                doc.moveDown(0.3);
                doc.rect(M, doc.y, CW, 2).fill('#0066B3');
                doc.y += 4;

                const tableStartY = doc.y;
                const colW = CW / 2;
                const rowH = 20;
                const fields: [string, string][] = [];
                fields.push(['Position', job.position?.name || job.title]);
                if (job.department?.name) fields.push(['Department', job.department.name]);
                if (job.branch?.name) fields.push(['Branch / Location', job.branch.name]);
                if (job.region?.name) fields.push(['Region', job.region.name]);
                fields.push(['Employment Type', employmentTypeLabel[job.employment_type || ''] || 'Full-Time']);
                fields.push(['Experience Level', experienceLabel[job.experience_level || ''] || 'Mid-Level']);
                if (job.min_experience_years || job.max_experience_years) {
                    const expStr = job.min_experience_years && job.max_experience_years
                        ? `${job.min_experience_years} - ${job.max_experience_years} years`
                        : job.min_experience_years ? `${job.min_experience_years}+ years` : `Up to ${job.max_experience_years} years`;
                    fields.push(['Experience Required', expStr]);
                }
                if (job.location) fields.push(['Location', `${job.location}${job.is_remote ? ' (Remote)' : job.is_hybrid ? ' (Hybrid)' : ''}`]);
                if (job.vacancies && job.vacancies > 1) fields.push(['Vacancies', `${job.vacancies} positions`]);
                if (job.show_salary && (job.salary_min || job.salary_max)) {
                    const sal = job.salary_min && job.salary_max
                        ? `${fmtMoney(job.salary_min, job.salary_currency)} - ${fmtMoney(job.salary_max, job.salary_currency)}`
                        : job.salary_min ? `From ${fmtMoney(job.salary_min, job.salary_currency)}` : `Up to ${fmtMoney(job.salary_max, job.salary_currency)}`;
                    fields.push(['Salary Range', sal]);
                }
                if (job.hiringManager) fields.push(['Hiring Manager', `${job.hiringManager.first_name} ${job.hiringManager.last_name}`]);
                if (job.deadline) fields.push(['Application Deadline', fmtDate(job.deadline)]);

                // Draw table in 2 columns
                for (let i = 0; i < fields.length; i++) {
                    const row = Math.floor(i / 2);
                    const col = i % 2;
                    const x = M + col * colW;
                    const y = tableStartY + row * rowH;

                    if (row % 2 === 0) {
                        doc.rect(M, y, CW, rowH).fill('#f8fafc');
                    }

                    doc.fontSize(8).fillColor('#64748b').font('Helvetica')
                        .text(fields[i][0], x + 8, y + 3, { width: colW - 16 });
                    doc.fontSize(9.5).fillColor('#1e293b').font('Helvetica-Bold')
                        .text(fields[i][1], x + 8, y + 3, { width: colW - 16, align: 'right' });
                }

                doc.y = tableStartY + Math.ceil(fields.length / 2) * rowH + 6;
                doc.rect(M, doc.y, CW, 2).fill('#0066B3');
                doc.y += 8;

                // ========== HELPER: Section with blue left bar ==========
                const sectionTitle = (title: string) => {
                    doc.moveDown(0.6);
                    const sY = doc.y;
                    doc.rect(M, sY, 4, 16).fill('#0066B3');
                    doc.fontSize(11).fillColor('#0066B3').font('Helvetica-Bold')
                        .text(title.toUpperCase(), M + 12, sY + 1, { width: CW - 12 });
                    doc.y = sY + 20;
                    doc.moveTo(M, doc.y).lineTo(M + CW, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                    doc.y += 6;
                };
                const bodyText = (text: string) => {
                    doc.fontSize(9.5).fillColor('#334155').font('Helvetica')
                        .text(text, M + 4, doc.y, { width: CW - 8, lineGap: 3, align: 'justify' });
                };
                const bulletItem = (text: string) => {
                    doc.fontSize(9.5).fillColor('#334155').font('Helvetica')
                        .text(`  •  ${text}`, M + 4, doc.y, { width: CW - 16, lineGap: 2 });
                };

                // ========== JOB OVERVIEW ==========
                if (job.description) {
                    sectionTitle('Job Overview');
                    const descLines = splitLines(job.description);
                    if (descLines.length > 1) {
                        descLines.forEach(l => bodyText(l));
                    } else {
                        bodyText(job.description);
                    }
                }

                // ========== KEY RESPONSIBILITIES ==========
                if (job.responsibilities) {
                    sectionTitle('Key Responsibilities');
                    const lines = splitLines(job.responsibilities);
                    if (lines.length > 1) {
                        lines.forEach(l => {
                            const cleaned = l.replace(/^[-•*]\s*/, '');
                            bulletItem(cleaned);
                        });
                    } else {
                        bodyText(job.responsibilities);
                    }
                }

                // ========== REQUIREMENTS & QUALIFICATIONS ==========
                if (job.requirements || job.education_requirements) {
                    sectionTitle('Requirements & Qualifications');
                    if (job.requirements) {
                        const lines = splitLines(job.requirements);
                        if (lines.length > 1) {
                            lines.forEach(l => {
                                const cleaned = l.replace(/^[-•*]\s*/, '');
                                bulletItem(cleaned);
                            });
                        } else {
                            bodyText(job.requirements);
                        }
                    }
                    if (job.education_requirements) {
                        doc.moveDown(0.3);
                        doc.fontSize(9.5).fillColor('#0066B3').font('Helvetica-Bold')
                            .text('Education:', M + 4, doc.y, { width: CW - 8 });
                        bodyText(job.education_requirements);
                    }
                }

                // ========== SKILLS ==========
                if ((job.required_skills && job.required_skills.length > 0) || (job.preferred_skills && job.preferred_skills.length > 0)) {
                    sectionTitle('Skills');
                    if (job.required_skills && job.required_skills.length > 0) {
                        doc.fontSize(9).fillColor('#0066B3').font('Helvetica-Bold')
                            .text('Required Skills:', M + 4, doc.y, { width: CW });
                        doc.moveDown(0.2);
                        // Skill tags
                        let tagX = M + 8;
                        let tagY = doc.y;
                        for (const skill of job.required_skills) {
                            const w = doc.widthOfString(skill, { fontSize: 8 }) + 16;
                            if (tagX + w > M + CW - 8) {
                                tagX = M + 8;
                                tagY += 18;
                            }
                            doc.roundedRect(tagX, tagY, w, 16, 8).fillAndStroke('#e0f2fe', '#7dd3fc');
                            doc.fontSize(8).fillColor('#0369a1').font('Helvetica-Bold')
                                .text(skill, tagX + 8, tagY + 3, { width: w - 16 });
                            tagX += w + 6;
                        }
                        doc.y = tagY + 24;
                    }
                    if (job.preferred_skills && job.preferred_skills.length > 0) {
                        doc.fontSize(9).fillColor('#64748b').font('Helvetica-Bold')
                            .text('Preferred Skills:', M + 4, doc.y, { width: CW });
                        doc.moveDown(0.2);
                        let tagX = M + 8;
                        let tagY = doc.y;
                        for (const skill of job.preferred_skills) {
                            const w = doc.widthOfString(skill, { fontSize: 8 }) + 16;
                            if (tagX + w > M + CW - 8) {
                                tagX = M + 8;
                                tagY += 18;
                            }
                            doc.roundedRect(tagX, tagY, w, 16, 8).fillAndStroke('#f1f5f9', '#cbd5e1');
                            doc.fontSize(8).fillColor('#475569').font('Helvetica')
                                .text(skill, tagX + 8, tagY + 3, { width: w - 16 });
                            tagX += w + 6;
                        }
                        doc.y = tagY + 24;
                    }
                }

                // ========== BENEFITS ==========
                if (job.benefits) {
                    sectionTitle('What We Offer');
                    const lines = splitLines(job.benefits);
                    if (lines.length > 1) {
                        lines.forEach(l => {
                            const cleaned = l.replace(/^[-•*]\s*/, '');
                            bulletItem(cleaned);
                        });
                    } else {
                        bodyText(job.benefits);
                    }
                }

                // ========== HOW TO APPLY ==========
                sectionTitle('How to Apply');
                bodyText(`Interested candidates who meet the above requirements are invited to submit their application through the ${companyName} HR Portal.`);
                doc.moveDown(0.3);
                if (job.deadline) {
                    bodyText(`Applications must be received by ${fmtDate(job.deadline)}.`);
                    doc.moveDown(0.2);
                }
                bodyText('Please include:');
                bulletItem('Updated curriculum vitae (CV)');
                bulletItem('Cover letter addressed to the Human Resources Department');
                bulletItem('Copies of relevant academic and professional certificates');
                bulletItem('Names and contacts of at least three (3) professional referees');
                doc.moveDown(0.5);
                doc.fontSize(9).fillColor('#64748b').font('Helvetica-Oblique')
                    .text(`${companyName} is an equal opportunity employer and does not discriminate on the basis of race, gender, age, disability, or any other protected characteristic.`, M + 4, doc.y, { width: CW - 8, align: 'center', lineGap: 2 });

                // ========== FOOTER ON ALL PAGES ==========
                const pages = doc.bufferedPageRange();
                for (let i = 0; i < pages.count; i++) {
                    doc.switchToPage(i);
                    doc.rect(0, doc.page.height - 36, pageW, 36).fill('#f8fafc');
                    doc.moveTo(0, doc.page.height - 36).lineTo(pageW, doc.page.height - 36).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
                        .text(`${companyName} — Job Description — ${job.job_code || 'DRAFT'}`, M, doc.page.height - 26, { width: CW * 0.65 });
                    doc.text(`INTERNAL USE — Page ${i + 1} of ${pages.count}`, M, doc.page.height - 26, { width: CW, align: 'right' });
                }

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}
