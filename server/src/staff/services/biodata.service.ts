import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from '../entities/staff.entity';
import { StaffEducation } from '../entities/staff-education.entity';
import { StaffWorkExperience } from '../entities/staff-work-experience.entity';
import { StaffSkill } from '../entities/staff-skill.entity';
import { StaffLanguage } from '../entities/staff-language.entity';
import { StaffAsset, AssetStatus } from '../entities/staff-asset.entity';
import { StaffBankAccount } from '../entities/staff-bank-account.entity';
import { NextOfKin } from '../entities/next-of-kin.entity';
import { Dependent } from '../entities/dependent.entity';

/**
 * BiodataService handles the expanded staff profile data:
 *   - Education, Work Experience, Skills, Languages
 *   - Assets, Bank Accounts
 *   - Next of Kin, Dependents (existing entities)
 *   - Completeness score calculation
 */
@Injectable()
export class BiodataService {
    constructor(
        @InjectRepository(Staff)
        private readonly staffRepo: Repository<Staff>,
        @InjectRepository(StaffEducation)
        private readonly educationRepo: Repository<StaffEducation>,
        @InjectRepository(StaffWorkExperience)
        private readonly workExpRepo: Repository<StaffWorkExperience>,
        @InjectRepository(StaffSkill)
        private readonly skillRepo: Repository<StaffSkill>,
        @InjectRepository(StaffLanguage)
        private readonly languageRepo: Repository<StaffLanguage>,
        @InjectRepository(StaffAsset)
        private readonly assetRepo: Repository<StaffAsset>,
        @InjectRepository(StaffBankAccount)
        private readonly bankAccountRepo: Repository<StaffBankAccount>,
        @InjectRepository(NextOfKin)
        private readonly nextOfKinRepo: Repository<NextOfKin>,
        @InjectRepository(Dependent)
        private readonly dependentRepo: Repository<Dependent>,
    ) {}

    // ==================== COMPLETENESS SCORE ====================

    /**
     * Calculate a 0-100 completeness score based on filled fields
     * and presence of child records.
     */
    async calculateCompleteness(staffId: string): Promise<number> {
        const staff = await this.staffRepo.findOne({
            where: { id: staffId },
            relations: ['documents'],
        });
        if (!staff) throw new NotFoundException('Staff not found');

        let score = 0;
        const weights = {
            // Core personal (30 points)
            personal: {
                gender: 3,
                date_of_birth: 4,
                marital_status: 3,
                nationality: 3,
                national_id: 4,
                tax_pin: 3,
                passport_number: 3,
                blood_group: 2,
                religion: 2,
                has_disability: 1,
                photo_url: 5,
            },
            // Contact (15 points)
            contact: {
                personal_email: 4,
                phone: 5,
                address: 3,
                city: 3,
            },
            // Employment (20 points)
            employment: {
                employee_number: 5,
                hire_date: 5,
                position: 5,
                branch: 3,
                department: 2,
            },
            // Financial (10 points)
            financial: {
                bank_account_exists: 10,
            },
            // Documents (10 points)
            documents: {
                has_documents: 10,
            },
            // Relations (15 points) - via child entities
            relations: {
                next_of_kin: 8,
                dependents: 7,
            },
        };

        // Personal fields
        Object.entries(weights.personal).forEach(([field, weight]) => {
            const val = (staff as any)[field];
            if (val !== null && val !== undefined && val !== '') {
                score += weight;
            }
        });

        // Contact fields
        Object.entries(weights.contact).forEach(([field, weight]) => {
            const val = (staff as any)[field];
            if (val !== null && val !== undefined && val !== '') {
                score += weight;
            }
        });

        // Employment fields
        if (staff.employee_number) score += weights.employment.employee_number;
        if (staff.hire_date) score += weights.employment.hire_date;
        if (staff.position) score += weights.employment.position;
        if (staff.branch) score += weights.employment.branch;
        if (staff.department) score += weights.employment.department;

        // Financial
        const hasBank = await this.bankAccountRepo.count({ where: { staff_id: staffId, is_active: true } });
        if (hasBank > 0) score += weights.financial.bank_account_exists;

        // Documents
        if (staff.documents && staff.documents.length > 0) score += weights.documents.has_documents;

        // Relations
        const hasNok = await this.nextOfKinRepo.count({ where: { staff_id: staffId } });
        if (hasNok > 0) score += weights.relations.next_of_kin;

        const hasDeps = await this.dependentRepo.count({ where: { staff_id: staffId } });
        if (hasDeps > 0) score += weights.relations.dependents;

        // Cap at 100
        score = Math.min(100, score);

        // Save to staff record
        staff.completeness_score = score;
        await this.staffRepo.save(staff);

        return score;
    }

    // ==================== EDUCATION ====================

    async listEducation(staffId: string): Promise<StaffEducation[]> {
        return this.educationRepo.find({
            where: { staff_id: staffId },
            order: { end_date: 'DESC', start_date: 'DESC' },
        });
    }

    async createEducation(staffId: string, data: Partial<StaffEducation>): Promise<StaffEducation> {
        const edu = this.educationRepo.create({ staff_id: staffId, ...data });
        const saved = await this.educationRepo.save(edu);
        await this.calculateCompleteness(staffId);
        return saved;
    }

    async updateEducation(id: string, data: Partial<StaffEducation>): Promise<StaffEducation> {
        const edu = await this.educationRepo.findOne({ where: { id } });
        if (!edu) throw new NotFoundException('Education record not found');
        Object.assign(edu, data);
        const saved = await this.educationRepo.save(edu);
        await this.calculateCompleteness(edu.staff_id);
        return saved;
    }

    async removeEducation(id: string): Promise<void> {
        const edu = await this.educationRepo.findOne({ where: { id }, relations: ['staff'] });
        if (!edu) throw new NotFoundException('Education record not found');
        await this.educationRepo.remove(edu);
        await this.calculateCompleteness(edu.staff_id);
    }

    // ==================== WORK EXPERIENCE ====================

    async listWorkExperience(staffId: string): Promise<StaffWorkExperience[]> {
        return this.workExpRepo.find({
            where: { staff_id: staffId },
            order: { start_date: 'DESC' },
        });
    }

    async createWorkExperience(staffId: string, data: Partial<StaffWorkExperience>): Promise<StaffWorkExperience> {
        const mapped = this.mapExperienceData(data);
        const exp = this.workExpRepo.create({ staff_id: staffId, ...mapped });
        const saved = await this.workExpRepo.save(exp);
        await this.calculateCompleteness(staffId);
        return saved;
    }

    async updateWorkExperience(id: string, data: Partial<StaffWorkExperience>): Promise<StaffWorkExperience> {
        const exp = await this.workExpRepo.findOne({ where: { id } });
        if (!exp) throw new NotFoundException('Work experience record not found');
        const mapped = this.mapExperienceData(data);
        Object.assign(exp, mapped);
        const saved = await this.workExpRepo.save(exp);
        await this.calculateCompleteness(exp.staff_id);
        return saved;
    }

    async removeWorkExperience(id: string): Promise<void> {
        const exp = await this.workExpRepo.findOne({ where: { id } });
        if (!exp) throw new NotFoundException('Work experience record not found');
        await this.workExpRepo.remove(exp);
        await this.calculateCompleteness(exp.staff_id);
    }

    // ==================== SKILLS ====================

    async listSkills(staffId: string): Promise<StaffSkill[]> {
        return this.skillRepo.find({
            where: { staff_id: staffId },
            order: { proficiency: 'DESC', name: 'ASC' },
        });
    }

    async createSkill(staffId: string, data: Partial<StaffSkill>): Promise<StaffSkill> {
        const mapped = this.mapSkillData(data);
        const skill = this.skillRepo.create({ staff_id: staffId, ...mapped });
        const saved = await this.skillRepo.save(skill);
        await this.calculateCompleteness(staffId);
        return saved;
    }

    async updateSkill(id: string, data: Partial<StaffSkill>): Promise<StaffSkill> {
        const skill = await this.skillRepo.findOne({ where: { id } });
        if (!skill) throw new NotFoundException('Skill record not found');
        const mapped = this.mapSkillData(data);
        Object.assign(skill, mapped);
        const saved = await this.skillRepo.save(skill);
        await this.calculateCompleteness(skill.staff_id);
        return saved;
    }

    async removeSkill(id: string): Promise<void> {
        const skill = await this.skillRepo.findOne({ where: { id } });
        if (!skill) throw new NotFoundException('Skill record not found');
        await this.skillRepo.remove(skill);
        await this.calculateCompleteness(skill.staff_id);
    }

    // ==================== LANGUAGES ====================

    async listLanguages(staffId: string): Promise<StaffLanguage[]> {
        return this.languageRepo.find({
            where: { staff_id: staffId },
            order: { is_primary: 'DESC', language: 'ASC' },
        });
    }

    async createLanguage(staffId: string, data: Partial<StaffLanguage>): Promise<StaffLanguage> {
        const lang = this.languageRepo.create({ staff_id: staffId, ...data });
        const saved = await this.languageRepo.save(lang);
        await this.calculateCompleteness(staffId);
        return saved;
    }

    async updateLanguage(id: string, data: Partial<StaffLanguage>): Promise<StaffLanguage> {
        const lang = await this.languageRepo.findOne({ where: { id } });
        if (!lang) throw new NotFoundException('Language record not found');
        Object.assign(lang, data);
        const saved = await this.languageRepo.save(lang);
        await this.calculateCompleteness(lang.staff_id);
        return saved;
    }

    async removeLanguage(id: string): Promise<void> {
        const lang = await this.languageRepo.findOne({ where: { id } });
        if (!lang) throw new NotFoundException('Language record not found');
        await this.languageRepo.remove(lang);
        await this.calculateCompleteness(lang.staff_id);
    }

    // ==================== ASSETS ====================

    async listAssets(staffId: string): Promise<StaffAsset[]> {
        return this.assetRepo.find({
            where: { staff_id: staffId },
            order: { assigned_date: 'DESC' },
        });
    }

    async createAsset(staffId: string, data: Partial<StaffAsset>, assignedBy?: string): Promise<StaffAsset> {
        const mapped = this.mapAssetData(data);
        const asset = this.assetRepo.create({ staff_id: staffId, assigned_by: assignedBy, ...mapped });
        const saved = await this.assetRepo.save(asset);
        await this.calculateCompleteness(staffId);
        return saved;
    }

    async updateAsset(id: string, data: Partial<StaffAsset>): Promise<StaffAsset> {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset) throw new NotFoundException('Asset record not found');
        const mapped = this.mapAssetData(data);
        Object.assign(asset, mapped);
        const saved = await this.assetRepo.save(asset);
        await this.calculateCompleteness(asset.staff_id);
        return saved;
    }

    async removeAsset(id: string): Promise<void> {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset) throw new NotFoundException('Asset record not found');
        await this.assetRepo.remove(asset);
        await this.calculateCompleteness(asset.staff_id);
    }

    async returnAsset(id: string, returnedTo?: string): Promise<StaffAsset> {
        const asset = await this.assetRepo.findOne({ where: { id } });
        if (!asset) throw new NotFoundException('Asset record not found');
        asset.status = AssetStatus.RETURNED;
        asset.returned_date = new Date();
        if (returnedTo) {
            asset.returned_to = returnedTo;
        }
        const saved = await this.assetRepo.save(asset);
        await this.calculateCompleteness(asset.staff_id);
        return saved;
    }

    // ==================== BANK ACCOUNTS ====================

    async listBankAccounts(staffId: string): Promise<StaffBankAccount[]> {
        return this.bankAccountRepo.find({
            where: { staff_id: staffId },
            order: { is_primary: 'DESC', created_at: 'DESC' },
        });
    }

    async createBankAccount(staffId: string, data: Partial<StaffBankAccount>): Promise<StaffBankAccount> {
        const mapped = this.mapBankAccountData(data);
        // If this is marked primary, demote existing primary
        if (mapped.is_primary) {
            const existing = await this.bankAccountRepo.find({ where: { staff_id: staffId, is_primary: true } });
            for (const acc of existing) {
                acc.is_primary = false;
                await this.bankAccountRepo.save(acc);
            }
        }
        const acc = this.bankAccountRepo.create({ staff_id: staffId, ...mapped });
        const saved = await this.bankAccountRepo.save(acc);
        await this.calculateCompleteness(staffId);
        return saved;
    }

    async updateBankAccount(id: string, data: Partial<StaffBankAccount>): Promise<StaffBankAccount> {
        const acc = await this.bankAccountRepo.findOne({ where: { id } });
        if (!acc) throw new NotFoundException('Bank account not found');

        const mapped = this.mapBankAccountData(data);
        // If setting this as primary, demote others
        if (mapped.is_primary && !acc.is_primary) {
            const existing = await this.bankAccountRepo.find({
                where: { staff_id: acc.staff_id, is_primary: true },
            });
            for (const other of existing) {
                other.is_primary = false;
                await this.bankAccountRepo.save(other);
            }
        }

        Object.assign(acc, mapped);
        const saved = await this.bankAccountRepo.save(acc);
        await this.calculateCompleteness(acc.staff_id);
        return saved;
    }

    async removeBankAccount(id: string): Promise<void> {
        const acc = await this.bankAccountRepo.findOne({ where: { id } });
        if (!acc) throw new NotFoundException('Bank account not found');
        await this.bankAccountRepo.remove(acc);
        await this.calculateCompleteness(acc.staff_id);
    }

    // ==================== NEXT OF KIN (existing entity) ====================

    async listNextOfKin(staffId: string): Promise<any[]> {
        return this.nextOfKinRepo.find({
            where: { staff_id: staffId },
            order: { is_primary: 'DESC', created_at: 'DESC' },
        }) as any;
    }

    async createNextOfKin(staffId: string, data: Partial<NextOfKin>): Promise<any> {
        const nok = this.nextOfKinRepo.create({ staff_id: staffId, ...data } as any);
        const saved = await this.nextOfKinRepo.save(nok);
        await this.calculateCompleteness(staffId);
        return saved;
    }

    async updateNextOfKin(id: string, data: Partial<NextOfKin>): Promise<any> {
        const nok = await this.nextOfKinRepo.findOne({ where: { id } });
        if (!nok) throw new NotFoundException('Next of kin not found');
        Object.assign(nok, data);
        const saved = await this.nextOfKinRepo.save(nok);
        await this.calculateCompleteness(nok.staff_id);
        return saved;
    }

    async removeNextOfKin(id: string): Promise<void> {
        const nok = await this.nextOfKinRepo.findOne({ where: { id } });
        if (!nok) throw new NotFoundException('Next of kin not found');
        await this.nextOfKinRepo.remove(nok);
        await this.calculateCompleteness(nok.staff_id);
    }

    // ==================== DEPENDENTS (existing entity) ====================

    async listDependents(staffId: string): Promise<any[]> {
        return this.dependentRepo.find({
            where: { staff_id: staffId },
            order: { date_of_birth: 'ASC' },
        }) as any;
    }

    async createDependent(staffId: string, data: Partial<Dependent>): Promise<any> {
        const dep = this.dependentRepo.create({ staff_id: staffId, ...data } as any);
        const saved = await this.dependentRepo.save(dep);
        await this.calculateCompleteness(staffId);
        return saved;
    }

    async updateDependent(id: string, data: Partial<Dependent>): Promise<any> {
        const dep = await this.dependentRepo.findOne({ where: { id } });
        if (!dep) throw new NotFoundException('Dependent not found');
        Object.assign(dep, data);
        const saved = await this.dependentRepo.save(dep);
        await this.calculateCompleteness(dep.staff_id);
        return saved;
    }

    async removeDependent(id: string): Promise<void> {
        const dep = await this.dependentRepo.findOne({ where: { id } });
        if (!dep) throw new NotFoundException('Dependent not found');
        await this.dependentRepo.remove(dep);
        await this.calculateCompleteness(dep.staff_id);
    }

    private mapExperienceData(data: any): Partial<StaffWorkExperience> {
        const mapped = { ...data };
        if ('reference_name' in mapped) {
            mapped.contact_person = mapped.reference_name;
            delete mapped.reference_name;
        }
        if ('reference_phone' in mapped) {
            mapped.contact_phone = mapped.reference_phone;
            delete mapped.reference_phone;
        }
        if ('reference_email' in mapped) {
            mapped.contact_email = mapped.reference_email;
            delete mapped.reference_email;
        }
        return mapped;
    }

    private mapSkillData(data: any): Partial<StaffSkill> {
        const mapped = { ...data };
        if ('skill_name' in mapped) {
            mapped.name = mapped.skill_name;
            delete mapped.skill_name;
        }
        if ('certification_number' in mapped) {
            mapped.certificate_number = mapped.certification_number;
            delete mapped.certification_number;
        }
        if ('issuing_body' in mapped) {
            mapped.certification_body = mapped.issuing_body;
            delete mapped.issuing_body;
        }
        if ('category' in mapped) {
            const valid = ['technical', 'soft_skill', 'language', 'certification', 'tool', 'domain', 'other'];
            if (!valid.includes(mapped.category)) {
                mapped.category = 'other';
            }
        }
        return mapped;
    }

    private mapAssetData(data: any): Partial<StaffAsset> {
        const mapped = { ...data };
        if ('date_assigned' in mapped) {
            mapped.assigned_date = mapped.date_assigned;
            delete mapped.date_assigned;
        }
        if ('asset_tag' in mapped) {
            mapped.asset_code = mapped.asset_tag;
            delete mapped.asset_tag;
        }
        if ('category' in mapped) {
            const cat = mapped.category;
            if (['laptop', 'phone', 'tablet', 'electronics'].includes(cat)) {
                mapped.category = 'electronics';
            } else if (cat === 'vehicle') {
                mapped.category = 'vehicle';
            } else if (cat === 'access_card') {
                mapped.category = 'access_card';
            } else if (cat === 'equipment') {
                mapped.category = 'tool';
            } else {
                mapped.category = 'other';
            }
        }
        if (!mapped.asset_name) {
            mapped.asset_name = mapped.description || [mapped.brand, mapped.model].filter(Boolean).join(' ') || (mapped.category ? String(mapped.category).toUpperCase() : 'ASSET');
        }
        return mapped;
    }

    private mapBankAccountData(data: any): Partial<StaffBankAccount> {
        const mapped = { ...data };
        if ('account_type' in mapped) {
            const type = mapped.account_type;
            if (['current', 'savings', 'salary'].includes(type)) {
                mapped.account_type = 'salary';
            } else if (['reimbursement', 'bonus', 'other'].includes(type)) {
                mapped.account_type = type;
            } else {
                mapped.account_type = 'other';
            }
        }
        return mapped;
    }
}
