import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { Staff, StaffStatus, ProbationStatus } from '../entities/staff.entity';
import { EmploymentHistory } from '../entities/employment-history.entity';
import { User } from '../../auth/entities/user.entity';
import { Role } from '../../auth/entities/role.entity';
import { Region } from '../../org/entities/region.entity';
import { Branch } from '../../org/entities/branch.entity';
import { Department } from '../../org/entities/department.entity';
import { Position } from '../../org/entities/position.entity';

export interface BulkImportRow {
    row: number;
    // Personal
    first_name: string;
    middle_name?: string;
    last_name: string;
    email: string;
    personal_email?: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
    national_id?: string;
    tax_pin?: string;
    // Employment
    role_code: string;
    position_name: string;
    position_code?: string;
    region_name?: string;
    region_code?: string;
    branch_name?: string;
    branch_code?: string;
    department_name?: string;
    department_code?: string;
    hire_date?: string;
    basic_salary?: number;
    probation_months?: number;
    // Emergency
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relationship?: string;
    // Bank
    bank_name?: string;
    bank_account_number?: string;
    // Address
    address?: string;
    city?: string;
}

export interface BulkImportResult {
    total: number;
    succeeded: number;
    failed: number;
    errors: { row: number; email: string; error: string }[];
    created: { row: number; email: string; employee_number: string }[];
}

@Injectable()
export class BulkImportService {
    private readonly logger = new Logger(BulkImportService.name);

    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Staff) private staffRepo: Repository<Staff>,
        @InjectRepository(User) private userRepo: Repository<User>,
        @InjectRepository(Role) private roleRepo: Repository<Role>,
        @InjectRepository(Region) private regionRepo: Repository<Region>,
        @InjectRepository(Branch) private branchRepo: Repository<Branch>,
        @InjectRepository(Department) private deptRepo: Repository<Department>,
        @InjectRepository(Position) private positionRepo: Repository<Position>,
    ) {}

    // ─── Template Generator ───────────────────────────────────────────────────

    async generateTemplate(): Promise<Buffer> {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'Kechita Capital';
        wb.created = new Date();

        // ── Main data sheet ──
        const ws = wb.addWorksheet('Staff Import', {
            views: [{ state: 'frozen', ySplit: 2 }],
        });

        const COLUMNS: { header: string; key: string; width: number; required?: boolean; note?: string }[] = [
            // Personal
            { header: 'First Name *', key: 'first_name', width: 18, required: true },
            { header: 'Middle Name', key: 'middle_name', width: 18 },
            { header: 'Last Name *', key: 'last_name', width: 18, required: true },
            { header: 'Work Email *', key: 'email', width: 28, required: true, note: 'Used for system login' },
            { header: 'Personal Email', key: 'personal_email', width: 28 },
            { header: 'Phone', key: 'phone', width: 16 },
            { header: 'Gender', key: 'gender', width: 12, note: 'male / female / other' },
            { header: 'Date of Birth', key: 'date_of_birth', width: 16, note: 'YYYY-MM-DD' },
            { header: 'National ID', key: 'national_id', width: 16 },
            { header: 'Tax PIN (KRA)', key: 'tax_pin', width: 16 },
            // Employment
            { header: 'Role Code *', key: 'role_code', width: 22, required: true, note: 'See Roles sheet' },
            { header: 'Position Name *', key: 'position_name', width: 22, required: true, note: 'Created if not exists' },
            { header: 'Position Code', key: 'position_code', width: 16, note: 'Auto-generated if blank' },
            { header: 'Region Name', key: 'region_name', width: 20, note: 'Created if not exists' },
            { header: 'Region Code', key: 'region_code', width: 14, note: 'Auto-generated if blank' },
            { header: 'Branch Name', key: 'branch_name', width: 20, note: 'Created if not exists' },
            { header: 'Branch Code', key: 'branch_code', width: 14, note: 'Auto-generated if blank' },
            { header: 'Department Name', key: 'department_name', width: 22, note: 'Created if not exists' },
            { header: 'Department Code', key: 'department_code', width: 16, note: 'Auto-generated if blank' },
            { header: 'Hire Date', key: 'hire_date', width: 14, note: 'YYYY-MM-DD (default: today)' },
            { header: 'Basic Salary (KES)', key: 'basic_salary', width: 20 },
            { header: 'Probation Months', key: 'probation_months', width: 18, note: 'Default: 3' },
            // Emergency
            { header: 'Emergency Contact Name', key: 'emergency_contact_name', width: 24 },
            { header: 'Emergency Contact Phone', key: 'emergency_contact_phone', width: 24 },
            { header: 'Emergency Relationship', key: 'emergency_contact_relationship', width: 22 },
            // Bank
            { header: 'Bank Name', key: 'bank_name', width: 20 },
            { header: 'Bank Account Number', key: 'bank_account_number', width: 22 },
            // Address
            { header: 'Address', key: 'address', width: 28 },
            { header: 'City', key: 'city', width: 16 },
        ];

        ws.columns = COLUMNS.map(c => ({ header: c.header, key: c.key, width: c.width }));

        // Style header row
        const headerRow = ws.getRow(1);
        headerRow.height = 32;
        headerRow.eachCell((cell, colNum) => {
            const col = COLUMNS[colNum - 1];
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col?.required ? 'FF0066B3' : 'FF334155' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                bottom: { style: 'medium', color: { argb: 'FF00AEEF' } },
            };
        });

        // Notes row (row 2)
        const noteRow = ws.getRow(2);
        noteRow.height = 20;
        COLUMNS.forEach((col, i) => {
            const cell = noteRow.getCell(i + 1);
            cell.value = col.note || (col.required ? 'Required' : 'Optional');
            cell.font = { italic: true, color: { argb: 'FF64748B' }, size: 9 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            cell.alignment = { horizontal: 'center' };
        });

        // Sample rows
        const samples = [
            {
                first_name: 'Jane', middle_name: '', last_name: 'Doe', email: 'jane.doe@kechita.co.ke',
                personal_email: 'jane@gmail.com', phone: '0712345678', gender: 'female',
                date_of_birth: '1990-05-15', national_id: '12345678', tax_pin: 'A001234567B',
                role_code: 'RELATIONSHIP_OFFICER', position_name: 'Relationship Officer', position_code: 'RO',
                region_name: 'Nairobi Region', region_code: 'NBI', branch_name: 'Westlands Branch', branch_code: 'WL',
                department_name: 'Operations', department_code: 'OPS',
                hire_date: new Date().toISOString().split('T')[0], basic_salary: 45000, probation_months: 3,
                emergency_contact_name: 'John Doe', emergency_contact_phone: '0722000000', emergency_contact_relationship: 'Spouse',
                bank_name: 'Equity Bank', bank_account_number: '0123456789', address: '123 Westlands Rd', city: 'Nairobi',
            },
            {
                first_name: 'James', middle_name: 'K', last_name: 'Mwangi', email: 'james.mwangi@kechita.co.ke',
                personal_email: '', phone: '0733456789', gender: 'male',
                date_of_birth: '1988-11-20', national_id: '87654321', tax_pin: 'B009876543A',
                role_code: 'BRANCH_MANAGER', position_name: 'Branch Manager', position_code: 'BM',
                region_name: 'Nairobi Region', region_code: 'NBI', branch_name: 'Westlands Branch', branch_code: 'WL',
                department_name: 'Management', department_code: 'MGT',
                hire_date: new Date().toISOString().split('T')[0], basic_salary: 90000, probation_months: 6,
                emergency_contact_name: 'Mary Mwangi', emergency_contact_phone: '0711000000', emergency_contact_relationship: 'Wife',
                bank_name: 'KCB Bank', bank_account_number: '9876543210', address: '45 Parklands Ave', city: 'Nairobi',
            },
        ];

        samples.forEach(s => {
            const row = ws.addRow(s);
            row.eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
            });
        });

        // Gender dropdown validation
        const genderCol = COLUMNS.findIndex(c => c.key === 'gender') + 1;
        for (let r = 3; r <= 502; r++) {
            ws.getCell(r, genderCol).dataValidation = {
                type: 'list', allowBlank: true,
                formulae: ['"male,female,other"'],
                showErrorMessage: true, errorTitle: 'Invalid', error: 'Choose male, female, or other',
            };
        }

        // ── Roles reference sheet ──
        const rolesWs = wb.addWorksheet('Roles Reference');
        rolesWs.columns = [
            { header: 'Role Code', key: 'code', width: 28 },
            { header: 'Role Name', key: 'name', width: 32 },
        ];
        const rolesHeaderRow = rolesWs.getRow(1);
        rolesHeaderRow.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066B3' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        });

        const roles = await this.roleRepo.find({ where: { is_active: true } });
        roles.forEach(r => {
            const row = rolesWs.addRow({ code: r.code, name: r.name });
            row.getCell(1).font = { bold: true, color: { argb: 'FF0066B3' } };
        });

        // ── Instructions sheet ──
        const instrWs = wb.addWorksheet('Instructions');
        instrWs.getColumn(1).width = 80;
        const instructions = [
            ['KECHITA CAPITAL — STAFF BULK IMPORT INSTRUCTIONS'],
            [''],
            ['HOW TO USE THIS TEMPLATE:'],
            ['1. Fill in the "Staff Import" sheet starting from row 3 (rows 1-2 are headers).'],
            ['2. Delete the sample rows (rows 3-4) before uploading.'],
            ['3. Required fields are marked with * and have a blue header.'],
            ['4. Refer to the "Roles Reference" sheet for valid Role Codes.'],
            [''],
            ['ORGANIZATION AUTO-CREATION:'],
            ['• Region, Branch, Department, and Position will be created automatically if they do not exist.'],
            ['• Use consistent names/codes across rows to avoid duplicates.'],
            ['• If a code is left blank, it is auto-generated from the name (e.g. "Nairobi Region" → "NAIROBI_REGION").'],
            ['• Branch is linked to its Region automatically.'],
            [''],
            ['DATES:'],
            ['• Use YYYY-MM-DD format (e.g. 2024-01-15).'],
            ['• Hire Date defaults to today if left blank.'],
            [''],
            ['AFTER IMPORT:'],
            ['• Each staff member receives a welcome email with a link to set their password.'],
            ['• A summary of successes and errors is shown after upload.'],
            ['• Rows with errors are skipped; valid rows are still imported.'],
        ];
        instructions.forEach((line, i) => {
            const cell = instrWs.getCell(i + 1, 1);
            cell.value = line[0] || '';
            if (i === 0) { cell.font = { bold: true, size: 14, color: { argb: 'FF0066B3' } }; }
            else if (line[0]?.endsWith(':')) { cell.font = { bold: true, size: 11 }; }
            else { cell.font = { size: 10 }; }
        });

        const buffer = await wb.xlsx.writeBuffer();
        return Buffer.from(buffer as ArrayBuffer);
    }

    // ─── Parse Excel ──────────────────────────────────────────────────────────

    async parseExcel(buffer: Buffer): Promise<BulkImportRow[]> {
        const wb = new ExcelJS.Workbook();
        await (wb.xlsx as any).load(buffer);

        const ws = wb.getWorksheet('Staff Import') || wb.worksheets[0];
        if (!ws) throw new BadRequestException('Could not find "Staff Import" worksheet');

        // Row 1 = headers, Row 2 = notes, data starts at row 3
        const keys = [
            'first_name', 'middle_name', 'last_name', 'email', 'personal_email', 'phone',
            'gender', 'date_of_birth', 'national_id', 'tax_pin',
            'role_code', 'position_name', 'position_code',
            'region_name', 'region_code', 'branch_name', 'branch_code',
            'department_name', 'department_code',
            'hire_date', 'basic_salary', 'probation_months',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'bank_name', 'bank_account_number', 'address', 'city',
        ];

        const rows: BulkImportRow[] = [];

        ws.eachRow((row, rowNum) => {
            if (rowNum <= 2) return; // skip header + notes
            const obj: any = { row: rowNum };
            let hasData = false;
            keys.forEach((key, i) => {
                const cell = row.getCell(i + 1);
                let val = cell.value;
                if (val === null || val === undefined || val === '') {
                    obj[key] = undefined;
                } else {
                    hasData = true;
                    if (typeof val === 'object' && 'text' in (val as any)) {
                        val = (val as any).text;
                    }
                    obj[key] = String(val).trim();
                }
            });
            if (hasData && obj.email) rows.push(obj as BulkImportRow);
        });

        return rows;
    }

    // ─── Org Upsert Helpers ───────────────────────────────────────────────────

    private toCode(name: string): string {
        return name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    }

    private async upsertRegion(manager: any, name: string, code?: string): Promise<Region> {
        const resolvedCode = code?.trim() || this.toCode(name);
        let region = await manager.findOne(Region, { where: { code: resolvedCode } });
        if (!region) {
            region = manager.create(Region, { name: name.trim(), code: resolvedCode, is_active: true });
            region = await manager.save(Region, region);
            this.logger.log(`Created region: ${name} (${resolvedCode})`);
        }
        return region;
    }

    private async upsertBranch(manager: any, name: string, code: string | undefined, region: Region): Promise<Branch> {
        const resolvedCode = code?.trim() || this.toCode(name);
        let branch = await manager.findOne(Branch, { where: { code: resolvedCode } });
        if (!branch) {
            branch = manager.create(Branch, { name: name.trim(), code: resolvedCode, region, is_active: true });
            branch = await manager.save(Branch, branch);
            this.logger.log(`Created branch: ${name} (${resolvedCode})`);
        }
        return branch;
    }

    private async upsertDepartment(manager: any, name: string, code?: string): Promise<Department> {
        const resolvedCode = code?.trim() || this.toCode(name);
        let dept = await manager.findOne(Department, { where: { code: resolvedCode } });
        if (!dept) {
            dept = manager.create(Department, { name: name.trim(), code: resolvedCode, is_active: true });
            dept = await manager.save(Department, dept);
            this.logger.log(`Created department: ${name} (${resolvedCode})`);
        }
        return dept;
    }

    private async upsertPosition(manager: any, name: string, code?: string, dept?: Department): Promise<Position> {
        const resolvedCode = code?.trim() || this.toCode(name);
        let pos = await manager.findOne(Position, { where: { code: resolvedCode } });
        if (!pos) {
            pos = manager.create(Position, {
                name: name.trim(), code: resolvedCode, is_active: true, level: 5,
                ...(dept ? { department: dept } : {}),
            });
            pos = await manager.save(Position, pos);
            this.logger.log(`Created position: ${name} (${resolvedCode})`);
        }
        return pos;
    }

    // ─── Generate Employee Number ─────────────────────────────────────────────

    private async generateEmployeeNumber(manager: any): Promise<string> {
        const count = await manager.count(Staff);
        const year = new Date().getFullYear().toString().slice(-2);
        return `EMP${year}${String(count + 1).padStart(4, '0')}`;
    }

    // ─── Main Import ──────────────────────────────────────────────────────────

    async importStaff(buffer: Buffer, importedBy?: string): Promise<BulkImportResult> {
        const rows = await this.parseExcel(buffer);
        if (rows.length === 0) throw new BadRequestException('No data rows found in the uploaded file');

        const result: BulkImportResult = {
            total: rows.length,
            succeeded: 0,
            failed: 0,
            errors: [],
            created: [],
        };

        for (const row of rows) {
            const qr = this.dataSource.createQueryRunner();
            await qr.connect();
            await qr.startTransaction();

            try {
                // ── Validate required fields ──
                if (!row.first_name) throw new Error('first_name is required');
                if (!row.last_name) throw new Error('last_name is required');
                if (!row.email) throw new Error('email is required');
                if (!row.role_code) throw new Error('role_code is required');
                if (!row.position_name) throw new Error('position_name is required');

                // ── Check duplicate email ──
                const existing = await qr.manager.findOne(User, { where: { email: row.email.toLowerCase() } });
                if (existing) throw new Error(`Email already exists: ${row.email}`);

                // ── Resolve role ──
                const role = await qr.manager.findOne(Role, { where: { code: row.role_code.toUpperCase(), is_active: true } });
                if (!role) throw new Error(`Invalid role_code: ${row.role_code}. See Roles Reference sheet.`);

                // ── Upsert org entities ──
                let region: Region | undefined;
                if (row.region_name) {
                    region = await this.upsertRegion(qr.manager, row.region_name, row.region_code);
                }

                let branch: Branch | undefined;
                if (row.branch_name && region) {
                    branch = await this.upsertBranch(qr.manager, row.branch_name, row.branch_code, region);
                } else if (row.branch_name && !region) {
                    throw new Error('branch_name provided but region_name is missing');
                }

                let department: Department | undefined;
                if (row.department_name) {
                    department = await this.upsertDepartment(qr.manager, row.department_name, row.department_code);
                }

                const position = await this.upsertPosition(qr.manager, row.position_name, row.position_code, department);

                // ── Create User ──
                const tempPassword = crypto.randomBytes(16).toString('hex');
                const hashedPassword = await bcrypt.hash(tempPassword, 10);
                const user = qr.manager.create(User, {
                    email: row.email.toLowerCase(),
                    password_hash: hashedPassword,
                    is_active: true,
                    roles: [role],
                });
                const savedUser = await qr.manager.save(User, user);

                // ── Create Staff ──
                const hireDate = row.hire_date ? new Date(row.hire_date) : new Date();
                const probationMonths = row.probation_months ? parseInt(String(row.probation_months)) : 3;
                const probationEndDate = new Date(hireDate);
                probationEndDate.setMonth(probationEndDate.getMonth() + probationMonths);

                const empNumber = await this.generateEmployeeNumber(qr.manager);

                const staff = qr.manager.create(Staff, {
                    user: savedUser,
                    employee_number: empNumber,
                    first_name: row.first_name.trim(),
                    middle_name: row.middle_name?.trim() || undefined,
                    last_name: row.last_name.trim(),
                    personal_email: row.personal_email?.trim() || undefined,
                    phone: row.phone?.trim() || undefined,
                    gender: (row.gender?.toLowerCase() as any) || undefined,
                    date_of_birth: row.date_of_birth ? new Date(row.date_of_birth) as any : undefined,
                    national_id: row.national_id?.trim() || undefined,
                    tax_pin: row.tax_pin?.trim() || undefined,
                    address: row.address?.trim() || undefined,
                    city: row.city?.trim() || undefined,
                    emergency_contact_name: row.emergency_contact_name?.trim() || undefined,
                    emergency_contact_phone: row.emergency_contact_phone?.trim() || undefined,
                    emergency_contact_relationship: row.emergency_contact_relationship?.trim() || undefined,
                    bank_name: row.bank_name?.trim() || undefined,
                    bank_account_number: row.bank_account_number?.trim() || undefined,
                    basic_salary: row.basic_salary ? parseFloat(String(row.basic_salary)) : undefined,
                    status: StaffStatus.ONBOARDING,
                    position,
                    ...(region ? { region } : {}),
                    ...(branch ? { branch } : {}),
                    ...(department ? { department } : {}),
                    hire_date: hireDate,
                    probation_start_date: hireDate,
                    probation_end_date: probationEndDate,
                    probation_months: probationMonths,
                    probation_status: ProbationStatus.IN_PROGRESS,
                    created_by: importedBy,
                });

                const savedStaff = await qr.manager.save(Staff, staff);

                // ── Employment history ──
                const history = qr.manager.create(EmploymentHistory, {
                    staff: savedStaff,
                    position,
                    branch: branch || undefined,
                    employment_type: 'full-time',
                    start_date: hireDate,
                });
                await qr.manager.save(EmploymentHistory, history);

                await qr.commitTransaction();

                result.succeeded++;
                result.created.push({ row: row.row, email: row.email, employee_number: empNumber });
                this.logger.log(`Bulk import: created staff ${row.email} (${empNumber})`);

            } catch (err: any) {
                await qr.rollbackTransaction();
                result.failed++;
                result.errors.push({ row: row.row, email: row.email || '(unknown)', error: err.message });
                this.logger.warn(`Bulk import row ${row.row} failed: ${err.message}`);
            } finally {
                await qr.release();
            }
        }

        return result;
    }
}
