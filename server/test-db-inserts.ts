import 'reflect-metadata';
import { AppDataSource } from './src/database/data-source';
import { Staff } from './src/staff/entities/staff.entity';
import { StaffSkill, SkillCategory, SkillProficiency } from './src/staff/entities/staff-skill.entity';
import { StaffAsset, AssetCategory, AssetStatus } from './src/staff/entities/staff-asset.entity';
import { StaffBankAccount, BankAccountType } from './src/staff/entities/staff-bank-account.entity';
import { ScreeningCriteria } from './src/recruitment/entities/screening-criteria.entity';
import { KnockoutQuestion, QuestionType } from './src/recruitment/entities/knockout-question.entity';
import { JobPost } from './src/recruitment/entities/job-post.entity';
import { CriteriaType, CriteriaImportance } from './src/recruitment/entities/recruitment-enums';

async function testInserts() {
    console.log('Initializing data source...');
    await AppDataSource.initialize();
    console.log('Data source initialized.');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        console.log('Fetching a staff member...');
        const staff = await queryRunner.manager.findOne(Staff, { where: {} });
        if (!staff) {
            console.log('No staff found in DB!');
        } else {
            console.log(`Found staff: ${staff.id} - ${staff.first_name} ${staff.last_name}`);

            // 1. Test StaffSkill
            try {
                console.log('Testing StaffSkill insert...');
                const skill = queryRunner.manager.create(StaffSkill, {
                    staff_id: staff.id,
                    name: 'Test Skill',
                    category: SkillCategory.TECHNICAL,
                    proficiency: SkillProficiency.INTERMEDIATE,
                    years_experience: 3,
                });
                await queryRunner.manager.save(skill);
                console.log('StaffSkill insert successful!');
            } catch (err: any) {
                console.error('StaffSkill insert FAILED:', err.message);
                if (err.stack) console.error(err.stack);
            }

            // 2. Test StaffAsset
            try {
                console.log('Testing StaffAsset insert...');
                const asset = queryRunner.manager.create(StaffAsset, {
                    staff_id: staff.id,
                    asset_name: 'Test Laptop',
                    category: AssetCategory.ELECTRONICS,
                    assigned_date: new Date(),
                    status: AssetStatus.ASSIGNED,
                });
                await queryRunner.manager.save(asset);
                console.log('StaffAsset insert successful!');
            } catch (err: any) {
                console.error('StaffAsset insert FAILED:', err.message);
                if (err.stack) console.error(err.stack);
            }

            // 3. Test StaffBankAccount
            try {
                console.log('Testing StaffBankAccount insert...');
                const account = queryRunner.manager.create(StaffBankAccount, {
                    staff_id: staff.id,
                    bank_name: 'Test Bank',
                    account_number: '1234567890',
                    account_name: 'Test Account Name',
                    account_type: BankAccountType.SALARY,
                    is_primary: true,
                    is_active: true,
                });
                await queryRunner.manager.save(account);
                console.log('StaffBankAccount insert successful!');
            } catch (err: any) {
                console.error('StaffBankAccount insert FAILED:', err.message);
                if (err.stack) console.error(err.stack);
            }
        }

        console.log('Fetching a job post...');
        const job = await queryRunner.manager.findOne(JobPost, { where: {} });
        if (!job) {
            console.log('No JobPost found in DB!');
        } else {
            console.log(`Found job post: ${job.id} - ${job.title}`);

            // 4. Test ScreeningCriteria
            try {
                console.log('Testing ScreeningCriteria insert...');
                const criteria = queryRunner.manager.create(ScreeningCriteria, {
                    jobPost: job,
                    name: 'Test Criteria',
                    type: CriteriaType.EXPERIENCE_YEARS,
                    value: '3',
                    importance: CriteriaImportance.KNOCKOUT,
                    display_order: 1,
                    is_active: true,
                    weight: 10,
                });
                await queryRunner.manager.save(criteria);
                console.log('ScreeningCriteria insert successful!');
            } catch (err: any) {
                console.error('ScreeningCriteria insert FAILED:', err.message);
                if (err.stack) console.error(err.stack);
            }

            // 5. Test KnockoutQuestion
            try {
                console.log('Testing KnockoutQuestion insert...');
                const question = queryRunner.manager.create(KnockoutQuestion, {
                    jobPost: job,
                    question: 'Do you have 3 years of experience?',
                    type: QuestionType.YES_NO,
                    acceptable_answer: 'yes',
                    is_knockout: true,
                    is_required: true,
                    display_order: 1,
                    is_active: true,
                    points: 10,
                });
                await queryRunner.manager.save(question);
                console.log('KnockoutQuestion insert successful!');
            } catch (err: any) {
                console.error('KnockoutQuestion insert FAILED:', err.message);
                if (err.stack) console.error(err.stack);
            }
        }

    } finally {
        console.log('Rolling back transaction...');
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        await AppDataSource.destroy();
        console.log('Done.');
    }
}

testInserts().catch(err => {
    console.error('Test script failed:', err);
});
