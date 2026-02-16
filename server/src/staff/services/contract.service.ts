import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between, Not, IsNull } from 'typeorm';
import { StaffContract, ContractType, ContractStatus } from '../entities/staff-contract.entity';
import { Staff } from '../entities/staff.entity';
import { JobPost } from '../../recruitment/entities/job-post.entity';
import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class ContractService {
    constructor(
        @InjectRepository(StaffContract)
        private contractRepo: Repository<StaffContract>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
        @InjectRepository(JobPost)
        private jobPostRepo: Repository<JobPost>,
    ) {}

    async create(
        staffId: string,
        data: {
            contract_type: ContractType;
            start_date: Date;
            end_date?: Date;
            salary?: number;
            salary_currency?: string;
            job_title?: string;
            title?: string;
            terms?: string;
            special_conditions?: string;
            notice_period_days?: number;
        },
        createdBy?: string,
    ): Promise<StaffContract> {
        const staff = await this.staffRepo.findOneBy({ id: staffId });
        if (!staff) throw new NotFoundException('Staff not found');

        // Supersede any active contracts
        const activeContracts = await this.contractRepo.find({
            where: { staff: { id: staffId }, status: ContractStatus.ACTIVE },
        });
        for (const c of activeContracts) {
            c.status = ContractStatus.SUPERSEDED;
            await this.contractRepo.save(c);
        }

        const contractNumber = await this.generateContractNumber();

        const contract = this.contractRepo.create({
            staff,
            contract_type: data.contract_type,
            contract_number: contractNumber,
            title: data.title || `${data.contract_type.replace('_', ' ')} Contract`,
            start_date: data.start_date,
            end_date: data.end_date,
            salary: data.salary,
            salary_currency: data.salary_currency || 'KES',
            job_title: data.job_title,
            terms: data.terms,
            special_conditions: data.special_conditions,
            notice_period_days: data.notice_period_days || 30,
            status: ContractStatus.DRAFT,
            created_by: createdBy,
        });

        return this.contractRepo.save(contract);
    }

    async findByStaff(staffId: string): Promise<StaffContract[]> {
        return this.contractRepo.find({
            where: { staff: { id: staffId } },
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string): Promise<StaffContract> {
        const contract = await this.contractRepo.findOne({
            where: { id },
            relations: ['staff', 'document'],
        });
        if (!contract) throw new NotFoundException('Contract not found');
        return contract;
    }

    async getActiveContract(staffId: string): Promise<StaffContract | null> {
        return this.contractRepo.findOne({
            where: { staff: { id: staffId }, status: ContractStatus.ACTIVE },
            relations: ['staff', 'document'],
        });
    }

    async update(id: string, data: Partial<StaffContract>): Promise<StaffContract> {
        const contract = await this.findOne(id);
        if (contract.status === ContractStatus.ACTIVE || contract.status === ContractStatus.TERMINATED) {
            throw new BadRequestException('Cannot edit an active or terminated contract');
        }
        Object.assign(contract, data);
        return this.contractRepo.save(contract);
    }

    async activate(id: string): Promise<StaffContract> {
        const contract = await this.findOne(id);
        if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING_SIGNATURE) {
            throw new BadRequestException('Only draft or pending contracts can be activated');
        }
        contract.status = ContractStatus.ACTIVE;
        return this.contractRepo.save(contract);
    }

    async terminate(id: string, reason: string, terminationDate?: Date): Promise<StaffContract> {
        const contract = await this.findOne(id);
        contract.status = ContractStatus.TERMINATED;
        contract.termination_date = terminationDate || new Date();
        contract.termination_reason = reason;
        return this.contractRepo.save(contract);
    }

    async renew(
        id: string,
        data: {
            new_end_date: Date;
            new_salary?: number;
            new_terms?: string;
        },
        createdBy?: string,
    ): Promise<StaffContract> {
        const oldContract = await this.findOne(id);
        oldContract.status = ContractStatus.RENEWED;
        await this.contractRepo.save(oldContract);

        // Create new contract based on old one
        const newContract = this.contractRepo.create({
            staff: oldContract.staff,
            contract_type: oldContract.contract_type,
            contract_number: await this.generateContractNumber(),
            title: oldContract.title,
            start_date: oldContract.end_date || new Date(),
            end_date: data.new_end_date,
            salary: data.new_salary || oldContract.salary,
            salary_currency: oldContract.salary_currency,
            job_title: oldContract.job_title,
            terms: data.new_terms || oldContract.terms,
            special_conditions: oldContract.special_conditions,
            notice_period_days: oldContract.notice_period_days,
            status: ContractStatus.ACTIVE,
            renewal_count: oldContract.renewal_count + 1,
            created_by: createdBy,
        });

        return this.contractRepo.save(newContract);
    }

    async getExpiringContracts(daysAhead: number = 30): Promise<StaffContract[]> {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return this.contractRepo.find({
            where: {
                status: ContractStatus.ACTIVE,
                end_date: Between(today, futureDate),
            },
            relations: ['staff'],
            order: { end_date: 'ASC' },
        });
    }

    async getExpiredContracts(): Promise<StaffContract[]> {
        return this.contractRepo.find({
            where: {
                status: ContractStatus.ACTIVE,
                end_date: LessThanOrEqual(new Date()),
            },
            relations: ['staff'],
        });
    }

    async delete(id: string): Promise<void> {
        const contract = await this.findOne(id);
        if (contract.status === ContractStatus.ACTIVE) {
            throw new BadRequestException('Cannot delete an active contract');
        }
        await this.contractRepo.delete(id);
    }

    private async generateContractNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const count = await this.contractRepo.count();
        return `CTR-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // ==================== PDF GENERATION ====================

    async generateContractPDF(contractId: string): Promise<{ buffer: Buffer; fileName: string }> {
        const contract = await this.contractRepo.findOne({
            where: { id: contractId },
            relations: ['staff', 'staff.position', 'staff.branch', 'staff.region', 'staff.department', 'staff.manager'],
        });
        if (!contract) throw new NotFoundException('Contract not found');

        const staff = contract.staff;
        if (!staff) throw new BadRequestException('Contract has no linked staff member');

        // Try to find the matching job post for the JD appendix
        let jobPost: JobPost | null = null;
        if (staff.position) {
            jobPost = await this.jobPostRepo.findOne({
                where: { position: { id: (staff.position as any).id } },
                relations: ['department', 'branch', 'region', 'position', 'hiringManager'],
                order: { created_at: 'DESC' },
            });
        }

        const companyName = 'Kechita Capital Limited';
        const companyAddress = 'Nairobi, Kenya';

        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 60,
                    size: 'A4',
                    bufferPages: true,
                    info: {
                        Title: `Employment Contract - ${staff.first_name} ${staff.last_name}`,
                        Author: companyName,
                        Subject: 'Employment Contract',
                        Creator: `${companyName} HR Portal`,
                    },
                });

                const chunks: Buffer[] = [];
                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const safeName = `${staff.first_name}_${staff.last_name}`.replace(/[^a-z0-9_-]/gi, '_');
                    resolve({ buffer, fileName: `Contract_${safeName}_${contract.contract_number || contractId}.pdf` });
                });
                doc.on('error', reject);

                const pageW = doc.page.width;
                const M = 60; // margin
                const CW = pageW - M * 2; // content width
                const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
                const fmtMoney = (v: any, cur?: string) => `${cur || 'KES'} ${Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                const contractTypeLabel: Record<string, string> = {
                    permanent: 'Permanent Employment',
                    fixed_term: 'Fixed-Term Employment',
                    probation: 'Probationary Employment',
                    casual: 'Casual Employment',
                    internship: 'Internship',
                    consultancy: 'Consultancy Agreement',
                };
                let sectionNum = 0;
                const section = (title: string) => {
                    sectionNum++;
                    doc.moveDown(0.8);
                    doc.fontSize(11).fillColor('#0066B3').font('Helvetica-Bold')
                        .text(`${sectionNum}. ${title.toUpperCase()}`, M, doc.y, { width: CW });
                    doc.moveDown(0.3);
                    doc.moveTo(M, doc.y).lineTo(M + CW, doc.y).strokeColor('#d1d5db').lineWidth(0.5).stroke();
                    doc.moveDown(0.4);
                    doc.font('Helvetica').fillColor('#334155').fontSize(9.5);
                };
                const para = (text: string) => {
                    doc.fontSize(9.5).fillColor('#334155').font('Helvetica')
                        .text(text, M, doc.y, { width: CW, lineGap: 3, align: 'justify' });
                };
                const bullet = (text: string) => {
                    doc.fontSize(9.5).fillColor('#334155').font('Helvetica')
                        .text(`    •  ${text}`, M, doc.y, { width: CW - 20, lineGap: 2 });
                };
                const field = (label: string, value: string) => {
                    const y = doc.y;
                    doc.fontSize(9).fillColor('#64748b').font('Helvetica').text(label, M + 20, y, { width: 160 });
                    doc.fontSize(9.5).fillColor('#1e293b').font('Helvetica-Bold').text(value, M + 185, y, { width: CW - 205 });
                    doc.y = Math.max(doc.y, y + 14);
                };

                // ========== PAGE 1: HEADER ==========
                // Blue header bar
                doc.rect(0, 0, pageW, 80).fill('#0066B3');
                doc.rect(0, 80, pageW, 4).fill('#004d86');

                doc.fontSize(22).fillColor('#FFFFFF').font('Helvetica-Bold')
                    .text(companyName.toUpperCase(), M, 18, { width: CW });
                doc.fontSize(9).fillColor('#b3d9f2').font('Helvetica')
                    .text(companyAddress, M, 44);

                doc.fontSize(13).fillColor('#FFFFFF').font('Helvetica-Bold')
                    .text('EMPLOYMENT CONTRACT', M, 22, { width: CW, align: 'right' });
                doc.fontSize(9).fillColor('#b3d9f2').font('Helvetica')
                    .text(`Ref: ${contract.contract_number || 'DRAFT'}`, M, 40, { width: CW, align: 'right' });
                doc.fontSize(8).fillColor('#b3d9f2')
                    .text(`Generated: ${fmtDate(new Date())}`, M, 52, { width: CW, align: 'right' });

                doc.y = 100;

                // Contract title block
                doc.moveDown(0.5);
                doc.rect(M, doc.y, CW, 32).fillAndStroke('#f0f9ff', '#bfdbfe');
                const titleY = doc.y + 8;
                doc.fontSize(12).fillColor('#0066B3').font('Helvetica-Bold')
                    .text(contractTypeLabel[contract.contract_type] || 'Employment Contract', M, titleY, { width: CW, align: 'center' });
                doc.y = titleY + 32;

                // ========== PREAMBLE ==========
                doc.moveDown(0.5);
                para(`This Employment Contract ("Contract") is entered into on ${fmtDate(new Date())} between:`);
                doc.moveDown(0.6);

                // Employer box
                doc.rect(M, doc.y, CW, 44).fillAndStroke('#f8fafc', '#e2e8f0');
                const ey = doc.y + 6;
                doc.fontSize(8).fillColor('#64748b').font('Helvetica').text('THE EMPLOYER', M + 12, ey);
                doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold').text(companyName, M + 12, ey + 12);
                doc.fontSize(9).fillColor('#475569').font('Helvetica').text(companyAddress, M + 12, ey + 26);
                doc.y = ey + 50;

                doc.moveDown(0.3);
                doc.fontSize(9).fillColor('#64748b').font('Helvetica').text('AND', M, doc.y, { width: CW, align: 'center' });
                doc.moveDown(0.3);

                // Employee box
                doc.rect(M, doc.y, CW, 58).fillAndStroke('#f8fafc', '#e2e8f0');
                const ey2 = doc.y + 6;
                doc.fontSize(8).fillColor('#64748b').font('Helvetica').text('THE EMPLOYEE', M + 12, ey2);
                doc.fontSize(10).fillColor('#1e293b').font('Helvetica-Bold')
                    .text(`${staff.first_name}${staff.middle_name ? ' ' + staff.middle_name : ''} ${staff.last_name}`, M + 12, ey2 + 12);
                const empDetails = [`Employee No: ${staff.employee_number}`];
                if (staff.national_id) empDetails.push(`National ID: ${staff.national_id}`);
                if (staff.phone) empDetails.push(`Phone: ${staff.phone}`);
                if (staff.personal_email) empDetails.push(`Email: ${staff.personal_email}`);
                doc.fontSize(9).fillColor('#475569').font('Helvetica').text(empDetails.join('   |   '), M + 12, ey2 + 26, { width: CW - 24 });
                const addrParts = [staff.address, staff.city, staff.postal_code].filter(Boolean);
                if (addrParts.length) doc.text(addrParts.join(', '), M + 12, ey2 + 40, { width: CW - 24 });
                doc.y = ey2 + 68;

                doc.moveDown(0.5);
                para('The parties hereby agree to the following terms and conditions of employment:');

                // ========== SECTION 1: APPOINTMENT ==========
                section('Appointment & Position');
                para(`The Employer hereby appoints the Employee to the position detailed below, and the Employee accepts such appointment subject to the terms and conditions set out in this Contract.`);
                doc.moveDown(0.4);
                field('Position:', contract.job_title || staff.position?.name || 'As assigned');
                field('Department:', staff.department?.name || 'N/A');
                field('Branch/Location:', staff.branch?.name || 'Head Office');
                field('Region:', staff.region?.name || 'N/A');
                if (staff.manager) field('Reports To:', `${staff.manager.first_name} ${staff.manager.last_name}`);
                doc.moveDown(0.3);
                para('The Employee shall perform all duties reasonably associated with the above position, as well as any additional duties that may be assigned from time to time by the Employer.');

                // ========== SECTION 2: COMMENCEMENT & DURATION ==========
                section('Commencement & Duration');
                field('Start Date:', fmtDate(contract.start_date));
                if (contract.end_date) field('End Date:', fmtDate(contract.end_date));
                field('Contract Type:', contractTypeLabel[contract.contract_type] || contract.contract_type);
                doc.moveDown(0.3);

                if (contract.contract_type === 'probation' || contract.contract_type === 'permanent') {
                    para('The Employee shall serve an initial probationary period of three (3) months from the commencement date. During probation, either party may terminate with seven (7) days\' written notice. Confirmation of employment shall be subject to satisfactory performance during this period.');
                }
                if (contract.contract_type === 'fixed_term' && contract.end_date) {
                    const months = Math.round((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30));
                    para(`This is a fixed-term contract for a period of approximately ${months} month(s), commencing on ${fmtDate(contract.start_date)} and ending on ${fmtDate(contract.end_date)}, unless renewed or terminated earlier in accordance with this Contract.`);
                }

                // ========== SECTION 3: REMUNERATION ==========
                section('Remuneration & Benefits');
                doc.moveDown(0.2);

                // Salary box
                doc.rect(M + 20, doc.y, CW - 40, 36).fillAndStroke('#ecfdf5', '#a7f3d0');
                const salY = doc.y + 6;
                doc.fontSize(8).fillColor('#065f46').font('Helvetica').text('GROSS MONTHLY SALARY', M + 32, salY);
                doc.fontSize(14).fillColor('#047857').font('Helvetica-Bold')
                    .text(fmtMoney(contract.salary, contract.salary_currency), M + 32, salY + 16);
                doc.y = salY + 44;

                doc.moveDown(0.3);
                para('The salary shall be paid monthly in arrears, on or before the last working day of each month, via direct bank transfer to the Employee\'s designated bank account.');
                doc.moveDown(0.3);
                para('The following statutory deductions shall be made in accordance with Kenyan law:');
                bullet('Pay As You Earn (PAYE) — Income Tax');
                bullet('National Social Security Fund (NSSF) contributions');
                bullet('National Hospital Insurance Fund (NHIF) contributions');
                bullet('Housing Levy as applicable');
                doc.moveDown(0.3);
                para('The Employer shall additionally provide:');
                bullet('Medical insurance cover for the Employee and dependants as per company policy');
                bullet('Group Life Assurance and Personal Accident cover');
                bullet('Annual salary review subject to company performance and individual appraisal');

                // ========== SECTION 4: WORKING HOURS ==========
                section('Working Hours');
                para('The standard working hours shall be Monday to Friday, 8:00 AM to 5:00 PM, with a one-hour lunch break. The Employee may be required to work additional hours as reasonably necessary to fulfil their duties. Overtime shall be compensated in accordance with the Employment Act, 2007.');

                // ========== SECTION 5: LEAVE ==========
                section('Leave Entitlements');
                para('The Employee shall be entitled to the following leave benefits:');
                bullet('Annual Leave: 21 working days per calendar year, to be taken at mutually agreed times');
                bullet('Sick Leave: As per the Employment Act — up to 30 days on full pay and 15 days on half pay per year, supported by a medical certificate');
                bullet('Maternity Leave: 3 months on full pay (female employees)');
                bullet('Paternity Leave: 2 weeks on full pay (male employees)');
                bullet('Compassionate Leave: Up to 5 days per occurrence, as approved by management');
                bullet('Public Holidays: All gazetted public holidays in Kenya');

                // ========== SECTION 6: CONFIDENTIALITY ==========
                section('Confidentiality & Intellectual Property');
                para('The Employee acknowledges that during the course of employment, they may have access to confidential information, trade secrets, and proprietary materials belonging to the Employer. The Employee agrees to:');
                doc.moveDown(0.2);
                bullet('Maintain strict confidentiality of all business information, client data, and trade secrets');
                bullet('Not disclose any confidential information to third parties without prior written consent');
                bullet('Return all company materials, documents, and property upon termination of employment');
                bullet('Assign to the Employer all intellectual property created during the course of employment');
                doc.moveDown(0.3);
                para('This confidentiality obligation shall survive the termination of this Contract for a period of two (2) years.');

                // ========== SECTION 7: TERMINATION ==========
                section('Termination of Employment');
                field('Notice Period:', `${contract.notice_period_days || 30} days written notice by either party`);
                doc.moveDown(0.3);
                para('This Contract may be terminated by:');
                bullet(`Either party giving ${contract.notice_period_days || 30} days\' written notice, or payment in lieu of notice`);
                bullet('The Employer, for gross misconduct or material breach of contract, without notice');
                bullet('Mutual written agreement between both parties');
                if (contract.contract_type === 'fixed_term') {
                    bullet('Expiry of the fixed term without renewal');
                }
                bullet('Redundancy, in accordance with the Employment Act, 2007');
                doc.moveDown(0.3);
                para('Upon termination, the Employee shall be entitled to all accrued and unpaid salary, any outstanding leave days, and any other terminal benefits as required by law.');

                // ========== SECTION 8: CODE OF CONDUCT ==========
                section('Code of Conduct & Disciplinary Procedure');
                para('The Employee shall at all times comply with the Employer\'s policies, procedures, and Code of Conduct. The Employer\'s disciplinary procedures, as amended from time to time, shall apply. The Employee shall:');
                bullet('Act with honesty, integrity, and professionalism at all times');
                bullet('Comply with all applicable laws and company policies');
                bullet('Avoid conflicts of interest and disclose any potential conflicts promptly');
                bullet('Maintain a professional appearance and conduct in the workplace');

                // ========== SECTION 9: DISPUTE RESOLUTION ==========
                section('Dispute Resolution');
                para('Any disputes arising out of or in connection with this Contract shall first be resolved through internal grievance procedures. If unresolved, the matter shall be referred to mediation, and thereafter to the Employment and Labour Relations Court of Kenya.');

                // ========== SECTION 10: SPECIAL CONDITIONS ==========
                if (contract.terms || contract.special_conditions) {
                    section('Special Terms & Conditions');
                    if (contract.terms) {
                        para(contract.terms);
                        doc.moveDown(0.3);
                    }
                    if (contract.special_conditions) {
                        para(contract.special_conditions);
                    }
                }

                // ========== SECTION 11: GENERAL ==========
                section('General Provisions');
                para('This Contract constitutes the entire agreement between the parties and supersedes all prior negotiations, representations, and agreements. No amendment to this Contract shall be effective unless made in writing and signed by both parties.');
                doc.moveDown(0.3);
                para('This Contract shall be governed by and construed in accordance with the laws of the Republic of Kenya, including but not limited to the Employment Act, 2007, and the Labour Relations Act, 2007.');
                if (jobPost) {
                    para('The Job Description attached hereto as Appendix A forms an integral part of this Contract.');
                }

                // ========== APPENDIX A: JOB DESCRIPTION ==========
                if (jobPost) {
                    doc.addPage();
                    doc.rect(0, 0, pageW, 60).fill('#0066B3');
                    doc.rect(0, 60, pageW, 4).fill('#004d86');
                    doc.fontSize(16).fillColor('#FFFFFF').font('Helvetica-Bold')
                        .text('APPENDIX A: JOB DESCRIPTION', M, 18, { width: CW, align: 'center' });
                    doc.fontSize(9).fillColor('#b3d9f2').font('Helvetica')
                        .text(`Contract Ref: ${contract.contract_number || 'DRAFT'}`, M, 40, { width: CW, align: 'center' });
                    doc.y = 80;

                    // Job Title banner
                    doc.moveDown(0.3);
                    doc.rect(M, doc.y, CW, 30).fillAndStroke('#f0f9ff', '#bfdbfe');
                    const jtY = doc.y + 7;
                    doc.fontSize(13).fillColor('#0066B3').font('Helvetica-Bold')
                        .text(jobPost.title, M, jtY, { width: CW, align: 'center' });
                    doc.y = jtY + 28;

                    // Summary table
                    doc.moveDown(0.3);
                    const jdField = (label: string, value: string) => {
                        const fy = doc.y;
                        doc.rect(M, fy, CW, 18).fill(doc.y % 2 === 0 ? '#f8fafc' : '#ffffff');
                        doc.fontSize(8).fillColor('#64748b').font('Helvetica').text(label, M + 8, fy + 3);
                        doc.fontSize(9.5).fillColor('#1e293b').font('Helvetica-Bold').text(value, M + 160, fy + 3, { width: CW - 168 });
                        doc.y = fy + 18;
                    };
                    jdField('Position', jobPost.position?.name || jobPost.title);
                    if (jobPost.department?.name) jdField('Department', jobPost.department.name);
                    if (jobPost.branch?.name) jdField('Branch', jobPost.branch.name);
                    const empTypes: Record<string, string> = { full_time: 'Full-Time', part_time: 'Part-Time', contract: 'Contract', internship: 'Internship', temporary: 'Temporary' };
                    jdField('Employment Type', empTypes[jobPost.employment_type] || 'Full-Time');
                    const expLevels: Record<string, string> = { entry: 'Entry', junior: 'Junior', mid: 'Mid-Level', senior: 'Senior', lead: 'Lead', executive: 'Executive' };
                    jdField('Experience Level', expLevels[jobPost.experience_level] || 'Mid-Level');
                    if (jobPost.location) jdField('Location', `${jobPost.location}${jobPost.is_remote ? ' (Remote)' : ''}`);
                    if (jobPost.hiringManager) jdField('Hiring Manager', `${jobPost.hiringManager.first_name} ${jobPost.hiringManager.last_name}`);
                    doc.moveDown(0.5);

                    const splitLines = (t: string): string[] => t.split(/\n/).map(l => l.trim()).filter(Boolean);
                    const jdSection = (title: string) => {
                        doc.moveDown(0.5);
                        const sy = doc.y;
                        doc.rect(M, sy, 4, 14).fill('#0066B3');
                        doc.fontSize(10).fillColor('#0066B3').font('Helvetica-Bold')
                            .text(title.toUpperCase(), M + 12, sy + 1, { width: CW - 12 });
                        doc.y = sy + 18;
                        doc.moveTo(M, doc.y).lineTo(M + CW, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                        doc.y += 5;
                    };
                    const jdBullet = (text: string) => {
                        doc.fontSize(9).fillColor('#334155').font('Helvetica')
                            .text(`  •  ${text.replace(/^[-•*]\s*/, '')}`, M + 4, doc.y, { width: CW - 16, lineGap: 2 });
                    };
                    const jdPara = (text: string) => {
                        doc.fontSize(9).fillColor('#334155').font('Helvetica')
                            .text(text, M + 4, doc.y, { width: CW - 8, lineGap: 2, align: 'justify' });
                    };

                    if (jobPost.description) {
                        jdSection('Job Overview');
                        jdPara(jobPost.description);
                    }
                    if (jobPost.responsibilities) {
                        jdSection('Key Responsibilities');
                        const lines = splitLines(jobPost.responsibilities);
                        if (lines.length > 1) lines.forEach(l => jdBullet(l));
                        else jdPara(jobPost.responsibilities);
                    }
                    if (jobPost.requirements) {
                        jdSection('Requirements & Qualifications');
                        const lines = splitLines(jobPost.requirements);
                        if (lines.length > 1) lines.forEach(l => jdBullet(l));
                        else jdPara(jobPost.requirements);
                    }
                    if (jobPost.education_requirements) {
                        jdSection('Education');
                        jdPara(jobPost.education_requirements);
                    }
                    if (jobPost.required_skills?.length) {
                        jdSection('Required Skills');
                        // Render skills as inline tags
                        let tx = M + 8;
                        let ty = doc.y;
                        for (const skill of jobPost.required_skills) {
                            const w = doc.widthOfString(skill, { fontSize: 8 }) + 14;
                            if (tx + w > M + CW - 8) { tx = M + 8; ty += 16; }
                            doc.roundedRect(tx, ty, w, 14, 7).fillAndStroke('#e0f2fe', '#7dd3fc');
                            doc.fontSize(7.5).fillColor('#0369a1').font('Helvetica-Bold').text(skill, tx + 7, ty + 3, { width: w - 14 });
                            tx += w + 5;
                        }
                        doc.y = ty + 22;
                    }
                    if (jobPost.benefits) {
                        jdSection('Benefits');
                        const lines = splitLines(jobPost.benefits);
                        if (lines.length > 1) lines.forEach(l => jdBullet(l));
                        else jdPara(jobPost.benefits);
                    }
                    doc.moveDown(1);
                    doc.fontSize(8).fillColor('#94a3b8').font('Helvetica-Oblique')
                        .text('This Job Description is subject to periodic review and may be amended by the Employer as the needs of the role and organisation evolve.', M, doc.y, { width: CW, align: 'center', lineGap: 2 });
                }

                // ========== SIGNATURE PAGE ==========
                doc.addPage();

                // Signature header
                doc.rect(0, 0, pageW, 50).fill('#0066B3');
                doc.fontSize(14).fillColor('#FFFFFF').font('Helvetica-Bold')
                    .text('EXECUTION PAGE', M, 14, { width: CW, align: 'center' });
                doc.fontSize(9).fillColor('#b3d9f2').font('Helvetica')
                    .text(`Contract Ref: ${contract.contract_number || 'DRAFT'}`, M, 32, { width: CW, align: 'center' });

                doc.y = 70;
                doc.moveDown(0.5);
                doc.fontSize(10).fillColor('#334155').font('Helvetica')
                    .text('IN WITNESS WHEREOF, the parties have executed this Contract on the date first written above.', M, doc.y, { width: CW, align: 'center' });

                doc.moveDown(2);

                // Employer signature block
                doc.rect(M, doc.y, CW, 120).fillAndStroke('#f8fafc', '#e2e8f0');
                const esY = doc.y + 10;
                doc.fontSize(10).fillColor('#0066B3').font('Helvetica-Bold')
                    .text('FOR AND ON BEHALF OF THE EMPLOYER', M + 20, esY);
                doc.fontSize(9).fillColor('#64748b').font('Helvetica')
                    .text(companyName, M + 20, esY + 16);

                doc.moveDown(0.5);
                // Signature line
                const sigLineY1 = esY + 60;
                doc.moveTo(M + 20, sigLineY1).lineTo(M + 230, sigLineY1).strokeColor('#94a3b8').lineWidth(0.8).stroke();
                doc.fontSize(8).fillColor('#64748b').font('Helvetica')
                    .text('Authorised Signatory', M + 20, sigLineY1 + 4);

                // Date line
                doc.moveTo(M + 280, sigLineY1).lineTo(M + CW - 20, sigLineY1).strokeColor('#94a3b8').lineWidth(0.8).stroke();
                doc.fontSize(8).fillColor('#64748b').font('Helvetica')
                    .text('Date', M + 280, sigLineY1 + 4);

                doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
                    .text('Name: ____________________________', M + 20, sigLineY1 + 20);
                doc.text('Title: ____________________________', M + 20, sigLineY1 + 34);

                doc.y = esY + 130;
                doc.moveDown(1.5);

                // Employee signature block
                doc.rect(M, doc.y, CW, 140).fillAndStroke('#f8fafc', '#e2e8f0');
                const eeY = doc.y + 10;
                doc.fontSize(10).fillColor('#0066B3').font('Helvetica-Bold')
                    .text('EMPLOYEE ACCEPTANCE', M + 20, eeY);
                doc.fontSize(9).fillColor('#334155').font('Helvetica')
                    .text(`I, ${staff.first_name}${staff.middle_name ? ' ' + staff.middle_name : ''} ${staff.last_name}, hereby confirm that I have read, understood, and agree to be bound by the terms and conditions set forth in this Employment Contract.`, M + 20, eeY + 18, { width: CW - 40, lineGap: 2 });

                const sigLineY2 = eeY + 80;
                doc.moveTo(M + 20, sigLineY2).lineTo(M + 230, sigLineY2).strokeColor('#94a3b8').lineWidth(0.8).stroke();
                doc.fontSize(8).fillColor('#64748b').font('Helvetica')
                    .text('Employee Signature', M + 20, sigLineY2 + 4);

                doc.moveTo(M + 280, sigLineY2).lineTo(M + CW - 20, sigLineY2).strokeColor('#94a3b8').lineWidth(0.8).stroke();
                doc.fontSize(8).fillColor('#64748b').font('Helvetica')
                    .text('Date', M + 280, sigLineY2 + 4);

                doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
                    .text(`Name: ${staff.first_name} ${staff.last_name}`, M + 20, sigLineY2 + 20);
                doc.text(`Employee No: ${staff.employee_number}`, M + 20, sigLineY2 + 34);
                if (staff.national_id) doc.text(`ID Number: ${staff.national_id}`, M + 20, sigLineY2 + 48);

                doc.y = eeY + 160;

                // Witness
                doc.moveDown(1.5);
                doc.rect(M, doc.y, CW, 80).fillAndStroke('#f8fafc', '#e2e8f0');
                const wY = doc.y + 10;
                doc.fontSize(10).fillColor('#0066B3').font('Helvetica-Bold')
                    .text('WITNESS', M + 20, wY);

                const sigLineY3 = wY + 40;
                doc.moveTo(M + 20, sigLineY3).lineTo(M + 230, sigLineY3).strokeColor('#94a3b8').lineWidth(0.8).stroke();
                doc.fontSize(8).fillColor('#64748b').font('Helvetica')
                    .text('Witness Signature', M + 20, sigLineY3 + 4);

                doc.moveTo(M + 280, sigLineY3).lineTo(M + CW - 20, sigLineY3).strokeColor('#94a3b8').lineWidth(0.8).stroke();
                doc.fontSize(8).fillColor('#64748b').font('Helvetica')
                    .text('Date', M + 280, sigLineY3 + 4);

                doc.fontSize(8).fillColor('#94a3b8').font('Helvetica')
                    .text('Name: ____________________________   ID No: ____________________________', M + 20, sigLineY3 + 20);

                // Footer on all pages
                const pages = doc.bufferedPageRange();
                for (let i = 0; i < pages.count; i++) {
                    doc.switchToPage(i);
                    // Bottom border
                    doc.rect(0, doc.page.height - 40, pageW, 40).fill('#f8fafc');
                    doc.moveTo(0, doc.page.height - 40).lineTo(pageW, doc.page.height - 40).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                    doc.fontSize(7).fillColor('#94a3b8').font('Helvetica')
                        .text(`${companyName} — Employment Contract — ${contract.contract_number || 'DRAFT'}`, M, doc.page.height - 30, { width: CW * 0.6 });
                    doc.text(`CONFIDENTIAL — Page ${i + 1} of ${pages.count}`, M, doc.page.height - 30, { width: CW, align: 'right' });
                }

                doc.end();
            } catch (error) {
                reject(error);
            }
        });
    }
}
