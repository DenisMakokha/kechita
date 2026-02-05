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
                const doc = new PDFDocument({ margin: 50 });
                const safeName = (data.employee_name || 'employee').replace(/[^a-z0-9_-]/gi, '_');
                const fileName = `Contract_${safeName}_${uuid()}.pdf`;
                const filePath = path.join(this.uploadDir, fileName);
                const writeStream = fs.createWriteStream(filePath);

                doc.pipe(writeStream);

                // Header
                doc.fontSize(20).fillColor('#1e293b').text(data.company_name || 'KECHITA MICROFINANCE LIMITED', { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(16).fillColor('#4f46e5').text('EMPLOYMENT CONTRACT', { align: 'center' });
                doc.moveDown();

                // Line separator
                doc.strokeColor('#e2e8f0').lineWidth(1)
                    .moveTo(50, doc.y).lineTo(550, doc.y).stroke();
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
                doc.text(`EMPLOYER: ${data.company_name || 'Kechita Microfinance Limited'}`);
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
                const doc = new PDFDocument({ margin: 50 });
                const safeName = (data.candidate_name || 'candidate').replace(/[^a-z0-9_-]/gi, '_');
                const fileName = `Offer_${safeName}_${uuid()}.pdf`;
                const filePath = path.join(this.uploadDir, fileName);
                const writeStream = fs.createWriteStream(filePath);

                doc.pipe(writeStream);

                // Header
                doc.fontSize(20).fillColor('#1e293b').text(data.company_name || 'KECHITA MICROFINANCE LIMITED', { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(16).fillColor('#059669').text('OFFER OF EMPLOYMENT', { align: 'center' });
                doc.moveDown();

                // Date
                doc.fontSize(10).fillColor('#334155')
                    .text(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
                doc.moveDown();

                // Greeting
                doc.fontSize(11).fillColor('#334155');
                doc.text(`Dear ${data.candidate_name},`);
                doc.moveDown();

                // Opening
                doc.text('We are pleased to offer you employment at ' + (data.company_name || 'Kechita Microfinance Limited') + ' on the following terms:');
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
                doc.text(data.company_name || 'Kechita Microfinance Limited');

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
}
