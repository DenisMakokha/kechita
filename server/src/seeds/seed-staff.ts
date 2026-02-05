import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { DocumentType } from '../staff/entities/document-type.entity';
import { OnboardingTemplate } from '../staff/entities/onboarding-template.entity';
import { OnboardingTask, TaskCategory } from '../staff/entities/onboarding-task.entity';
import { Position } from '../org/entities/position.entity';
import { Department } from '../org/entities/department.entity';
import { assertSeedingEnabled } from './seed-utils';

dotenv.config();

assertSeedingEnabled('seed-staff');

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [DocumentType, OnboardingTemplate, OnboardingTask, Position, Department],
    synchronize: true,
});

async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected for staff seeding...');

    try {
        const docTypeRepo = AppDataSource.getRepository(DocumentType);
        const templateRepo = AppDataSource.getRepository(OnboardingTemplate);
        const taskRepo = AppDataSource.getRepository(OnboardingTask);

        // ==================== DOCUMENT TYPES ====================
        console.log('Seeding document types...');

        const documentTypes = [
            // Personal Documents
            { code: 'NATIONAL_ID', name: 'National ID Copy', category: 'personal', is_required: true, has_expiry: true, default_expiry_months: 120, sort_order: 1 },
            { code: 'PASSPORT', name: 'Passport', category: 'personal', is_required: false, has_expiry: true, default_expiry_months: 120, sort_order: 2 },
            { code: 'PASSPORT_PHOTO', name: 'Passport Photo', category: 'personal', is_required: true, has_expiry: false, sort_order: 3 },
            { code: 'KRA_PIN', name: 'KRA PIN Certificate', category: 'personal', is_required: true, has_expiry: false, sort_order: 4 },
            { code: 'BIRTH_CERT', name: 'Birth Certificate', category: 'personal', is_required: false, has_expiry: false, sort_order: 5 },

            // Academic Documents
            { code: 'CV', name: 'Curriculum Vitae', category: 'academic', is_required: true, has_expiry: false, sort_order: 10 },
            { code: 'CERT_KCSE', name: 'KCSE Certificate', category: 'academic', is_required: false, has_expiry: false, sort_order: 11 },
            { code: 'CERT_DEGREE', name: 'University Degree', category: 'academic', is_required: false, has_expiry: false, sort_order: 12 },
            { code: 'CERT_DIPLOMA', name: 'Diploma Certificate', category: 'academic', is_required: false, has_expiry: false, sort_order: 13 },
            { code: 'CERT_PROF', name: 'Professional Certificate', category: 'academic', is_required: false, has_expiry: true, default_expiry_months: 36, sort_order: 14 },

            // Employment Documents
            { code: 'OFFER_LETTER', name: 'Offer Letter (Signed)', category: 'employment', is_required: true, has_expiry: false, sort_order: 20 },
            { code: 'CONTRACT', name: 'Employment Contract', category: 'employment', is_required: true, has_expiry: true, default_expiry_months: 12, sort_order: 21 },
            { code: 'NDA', name: 'Non-Disclosure Agreement', category: 'employment', is_required: true, has_expiry: false, sort_order: 22 },
            { code: 'CODE_OF_CONDUCT', name: 'Code of Conduct (Signed)', category: 'employment', is_required: true, has_expiry: false, sort_order: 23 },
            { code: 'REF_LETTER', name: 'Reference Letter', category: 'employment', is_required: false, has_expiry: false, sort_order: 24 },

            // Financial Documents
            { code: 'BANK_DETAILS', name: 'Bank Account Confirmation', category: 'financial', is_required: true, has_expiry: false, sort_order: 30 },
            { code: 'NSSF_CARD', name: 'NSSF Card', category: 'financial', is_required: true, has_expiry: false, sort_order: 31 },
            { code: 'NHIF_CARD', name: 'NHIF Card', category: 'financial', is_required: true, has_expiry: false, sort_order: 32 },

            // Compliance Documents
            { code: 'GOOD_CONDUCT', name: 'Certificate of Good Conduct', category: 'compliance', is_required: true, has_expiry: true, default_expiry_months: 24, reminder_days_before: 60, sort_order: 40 },
            { code: 'CRB_REPORT', name: 'CRB Report', category: 'compliance', is_required: true, has_expiry: true, default_expiry_months: 3, reminder_days_before: 30, sort_order: 41 },
            { code: 'MEDICAL_CERT', name: 'Medical Fitness Certificate', category: 'compliance', is_required: false, has_expiry: true, default_expiry_months: 12, sort_order: 42 },
        ];

        for (const dt of documentTypes) {
            const existing = await docTypeRepo.findOneBy({ code: dt.code });
            if (!existing) {
                await docTypeRepo.save(docTypeRepo.create(dt));
                console.log(`  Created document type: ${dt.name}`);
            }
        }

        // ==================== ONBOARDING TEMPLATES ====================
        console.log('\nSeeding onboarding templates...');

        // Check if default template exists
        let defaultTemplate = await templateRepo.findOne({
            where: { is_default: true },
            relations: ['tasks'],
        });

        if (!defaultTemplate) {
            defaultTemplate = templateRepo.create({
                name: 'Standard Onboarding',
                description: 'Default onboarding checklist for all new employees',
                is_default: true,
                expected_days: 30,
            });
            await templateRepo.save(defaultTemplate);
            console.log('  Created default onboarding template');

            // Create tasks for default template
            const defaultTasks = [
                // Day 1 - Orientation
                { name: 'Welcome Orientation', category: TaskCategory.ORIENTATION, sort_order: 1, due_days_from_start: 0, responsible_party: 'hr', instructions: 'Complete welcome session with HR including company overview, mission, and values.' },
                { name: 'Office Tour', category: TaskCategory.ORIENTATION, sort_order: 2, due_days_from_start: 0, responsible_party: 'manager', instructions: 'Tour of office facilities including workstation, restrooms, kitchen, and emergency exits.' },
                { name: 'Meet the Team', category: TaskCategory.ORIENTATION, sort_order: 3, due_days_from_start: 0, responsible_party: 'manager', instructions: 'Introduction to immediate team members and key stakeholders.' },

                // Day 1-3 - IT Setup
                { name: 'Workstation Setup', category: TaskCategory.IT_SETUP, sort_order: 10, due_days_from_start: 1, responsible_party: 'it', instructions: 'Computer, monitor, and peripherals setup at assigned workstation.' },
                { name: 'Email & System Access', category: TaskCategory.IT_SETUP, sort_order: 11, due_days_from_start: 1, responsible_party: 'it', instructions: 'Create company email and grant system access.' },
                { name: 'Software Installation', category: TaskCategory.IT_SETUP, sort_order: 12, due_days_from_start: 2, responsible_party: 'it', instructions: 'Install required software including core banking system access.' },
                { name: 'ID Card & Access Badge', category: TaskCategory.IT_SETUP, sort_order: 13, due_days_from_start: 3, responsible_party: 'hr', instructions: 'Issue employee ID card and building access badge.' },

                // Week 1 - Documentation
                { name: 'Submit National ID Copy', category: TaskCategory.DOCUMENTATION, sort_order: 20, due_days_from_start: 3, responsible_party: 'employee', is_required: true },
                { name: 'Submit KRA PIN', category: TaskCategory.DOCUMENTATION, sort_order: 21, due_days_from_start: 3, responsible_party: 'employee', is_required: true },
                { name: 'Submit Bank Details', category: TaskCategory.DOCUMENTATION, sort_order: 22, due_days_from_start: 3, responsible_party: 'employee', is_required: true },
                { name: 'Submit NSSF/NHIF Cards', category: TaskCategory.DOCUMENTATION, sort_order: 23, due_days_from_start: 5, responsible_party: 'employee', is_required: true },
                { name: 'Sign Employment Contract', category: TaskCategory.DOCUMENTATION, sort_order: 24, due_days_from_start: 2, responsible_party: 'hr', is_required: true },
                { name: 'Sign Code of Conduct', category: TaskCategory.DOCUMENTATION, sort_order: 25, due_days_from_start: 2, responsible_party: 'hr', is_required: true },
                { name: 'Sign NDA', category: TaskCategory.DOCUMENTATION, sort_order: 26, due_days_from_start: 2, responsible_party: 'hr', is_required: true },

                // Week 1-2 - Training
                { name: 'HR Policies Training', category: TaskCategory.TRAINING, sort_order: 30, due_days_from_start: 5, responsible_party: 'hr', instructions: 'Complete HR policies training including leave, attendance, and conduct.' },
                { name: 'Product Training', category: TaskCategory.TRAINING, sort_order: 31, due_days_from_start: 7, responsible_party: 'manager', instructions: 'Training on company products and services.' },
                { name: 'Systems Training', category: TaskCategory.TRAINING, sort_order: 32, due_days_from_start: 10, responsible_party: 'it', instructions: 'Training on core systems and software.' },
                { name: 'Role-Specific Training', category: TaskCategory.TRAINING, sort_order: 33, due_days_from_start: 14, responsible_party: 'manager', instructions: 'Detailed training on job-specific responsibilities.' },

                // Week 2-3 - Compliance
                { name: 'Submit Good Conduct Certificate', category: TaskCategory.COMPLIANCE, sort_order: 40, due_days_from_start: 14, responsible_party: 'employee', is_required: true },
                { name: 'Submit CRB Report', category: TaskCategory.COMPLIANCE, sort_order: 41, due_days_from_start: 14, responsible_party: 'employee', is_required: true },
                { name: 'AML/CFT Training', category: TaskCategory.COMPLIANCE, sort_order: 42, due_days_from_start: 14, responsible_party: 'hr', instructions: 'Complete Anti-Money Laundering and Counter-Terrorism Financing training.' },
                { name: 'Data Protection Training', category: TaskCategory.COMPLIANCE, sort_order: 43, due_days_from_start: 14, responsible_party: 'hr', instructions: 'Complete data protection and privacy training.' },

                // Week 3-4 - Benefits & Completion
                { name: 'Benefits Enrollment', category: TaskCategory.BENEFITS, sort_order: 50, due_days_from_start: 21, responsible_party: 'hr', instructions: 'Enroll in medical insurance and other staff benefits.' },
                { name: 'Emergency Contact Form', category: TaskCategory.BENEFITS, sort_order: 51, due_days_from_start: 7, responsible_party: 'employee', is_required: true },
                { name: 'Manager Check-in Meeting', category: TaskCategory.OTHER, sort_order: 60, due_days_from_start: 14, responsible_party: 'manager', instructions: 'Two-week check-in meeting with manager to discuss progress and questions.' },
                { name: 'HR Check-in Meeting', category: TaskCategory.OTHER, sort_order: 61, due_days_from_start: 28, responsible_party: 'hr', instructions: 'One-month check-in meeting with HR.' },
                { name: 'Onboarding Feedback Survey', category: TaskCategory.OTHER, sort_order: 62, due_days_from_start: 30, responsible_party: 'employee', is_required: false, instructions: 'Complete onboarding feedback survey.' },
            ];

            for (const taskData of defaultTasks) {
                const task = taskRepo.create({
                    ...taskData,
                    template: defaultTemplate,
                });
                await taskRepo.save(task);
            }
            console.log(`  Created ${defaultTasks.length} onboarding tasks`);
        } else {
            console.log('  Default onboarding template already exists');
        }

        console.log('\nStaff seeding complete!');

    } catch (err) {
        console.error('Error seeding staff data:', err);
    } finally {
        await AppDataSource.destroy();
    }
}

seed();
