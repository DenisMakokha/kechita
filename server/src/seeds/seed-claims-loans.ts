import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'kechita_portal',
    synchronize: false,
});

async function seedClaimsLoans() {
    await AppDataSource.initialize();
    console.log('🌱 Seeding Claims & Loans data...\n');

    const queryRunner = AppDataSource.createQueryRunner();

    try {
        // ==================== CLAIM TYPES ====================
        console.log('📋 Creating claim types...');

        const claimTypes = [
            {
                code: 'PER_DIEM',
                name: 'Per Diem',
                description: 'Daily allowance for official travel',
                max_amount_per_claim: 10000,
                max_amount_per_month: 50000,
                requires_receipt: false,
                requires_approval: true,
                is_taxable: false,
                icon: 'calendar',
                color: '#3B82F6',
                display_order: 1,
            },
            {
                code: 'FUEL',
                name: 'Fuel Allowance',
                description: 'Fuel reimbursement for official travel',
                max_amount_per_claim: 20000,
                max_amount_per_month: 80000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: false,
                icon: 'fuel',
                color: '#F59E0B',
                display_order: 2,
            },
            {
                code: 'TRANSPORT',
                name: 'Transport',
                description: 'Transport costs (taxi, bus, etc.)',
                max_amount_per_claim: 5000,
                max_amount_per_month: 20000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: false,
                icon: 'car',
                color: '#10B981',
                display_order: 3,
            },
            {
                code: 'MEALS',
                name: 'Meals & Entertainment',
                description: 'Meals during official duties or client entertainment',
                max_amount_per_claim: 5000,
                max_amount_per_month: 25000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: true,
                icon: 'utensils',
                color: '#EC4899',
                display_order: 4,
            },
            {
                code: 'ACCOMMODATION',
                name: 'Accommodation',
                description: 'Hotel/lodging during official travel',
                max_amount_per_claim: 15000,
                max_amount_per_month: 60000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: false,
                icon: 'building',
                color: '#8B5CF6',
                display_order: 5,
            },
            {
                code: 'MEDICAL',
                name: 'Medical Expense',
                description: 'Medical expenses not covered by insurance',
                max_amount_per_claim: 50000,
                max_amount_per_year: 200000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: false,
                icon: 'heart-pulse',
                color: '#EF4444',
                display_order: 6,
            },
            {
                code: 'AIRFARE',
                name: 'Air Travel',
                description: 'Flight tickets for official travel',
                max_amount_per_claim: 100000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: false,
                icon: 'plane',
                color: '#06B6D4',
                display_order: 7,
            },
            {
                code: 'COMMUNICATION',
                name: 'Communication',
                description: 'Phone, internet, and other communication costs',
                max_amount_per_claim: 3000,
                max_amount_per_month: 10000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: false,
                icon: 'phone',
                color: '#14B8A6',
                display_order: 8,
            },
            {
                code: 'TRAINING',
                name: 'Training & Development',
                description: 'Training courses, certifications, seminars',
                max_amount_per_claim: 100000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: false,
                icon: 'book-open',
                color: '#6366F1',
                display_order: 9,
            },
            {
                code: 'RELOCATION',
                name: 'Relocation Allowance',
                description: 'Moving expenses for staff transfers',
                max_amount_per_claim: 200000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: false,
                eligible_role_codes: ['BRANCH_MANAGER', 'REGIONAL_MANAGER', 'HR_MANAGER', 'CEO'],
                icon: 'truck',
                color: '#64748B',
                display_order: 10,
            },
            {
                code: 'MISC',
                name: 'Miscellaneous',
                description: 'Other approved expenses',
                max_amount_per_claim: 10000,
                requires_receipt: true,
                requires_approval: true,
                is_taxable: false,
                icon: 'receipt',
                color: '#94A3B8',
                display_order: 99,
            },
        ];

        for (const ct of claimTypes) {
            const existingType = await queryRunner.query(
                'SELECT id FROM claim_types WHERE code = $1',
                [ct.code]
            );

            if (existingType.length === 0) {
                await queryRunner.query(
                    `INSERT INTO claim_types (
                        id, code, name, description,
                        max_amount_per_claim, max_amount_per_month, max_amount_per_year,
                        requires_receipt, requires_approval, is_taxable,
                        eligible_role_codes, icon, color, display_order, is_active,
                        created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true,
                        NOW(), NOW()
                    )`,
                    [
                        ct.code, ct.name, ct.description,
                        ct.max_amount_per_claim || null,
                        ct.max_amount_per_month || null,
                        ct.max_amount_per_year || null,
                        ct.requires_receipt,
                        ct.requires_approval,
                        ct.is_taxable,
                        ct.eligible_role_codes?.join(',') || null,
                        ct.icon, ct.color, ct.display_order,
                    ]
                );
                console.log(`  ✅ Created claim type: ${ct.name}`);
            } else {
                console.log(`  ⏭️ Claim type ${ct.name} already exists`);
            }
        }

        // ==================== APPROVAL FLOWS FOR CLAIMS ====================
        console.log('\n📊 Creating approval flows for claims...');

        // Check and create CLAIM_DEFAULT flow
        const claimFlow = await queryRunner.query(
            'SELECT id FROM approval_flows WHERE code = $1',
            ['CLAIM_DEFAULT']
        );

        if (claimFlow.length === 0) {
            const [flow] = await queryRunner.query(
                `INSERT INTO approval_flows (id, code, name, target_type, is_active, priority, created_at, updated_at)
                VALUES (gen_random_uuid(), 'CLAIM_DEFAULT', 'Standard Claims Approval', 'claim', true, 1, NOW(), NOW())
                RETURNING id`
            );

            // Step 1: Branch Manager
            await queryRunner.query(
                `INSERT INTO approval_flow_steps (
                    id, flow_id, step_order, name, approver_type, approver_role_code, is_final, created_at, updated_at
                ) VALUES (gen_random_uuid(), $1, 1, 'Branch Manager Review', 'ROLE', 'BRANCH_MANAGER', false, NOW(), NOW())`,
                [flow.id]
            );

            // Step 2: HR Manager
            await queryRunner.query(
                `INSERT INTO approval_flow_steps (
                    id, flow_id, step_order, name, approver_type, approver_role_code, is_final, created_at, updated_at
                ) VALUES (gen_random_uuid(), $1, 2, 'HR Review', 'ROLE', 'HR_MANAGER', false, NOW(), NOW())`,
                [flow.id]
            );

            // Step 3: Accountant
            await queryRunner.query(
                `INSERT INTO approval_flow_steps (
                    id, flow_id, step_order, name, approver_type, approver_role_code, is_final, created_at, updated_at
                ) VALUES (gen_random_uuid(), $1, 3, 'Finance Approval', 'ROLE', 'ACCOUNTANT', true, NOW(), NOW())`,
                [flow.id]
            );

            console.log('  ✅ Created CLAIM_DEFAULT approval flow with 3 steps');
        } else {
            console.log('  ⏭️ CLAIM_DEFAULT approval flow already exists');
        }

        // ==================== APPROVAL FLOWS FOR LOANS ====================
        console.log('\n💰 Creating approval flows for loans...');

        // Salary Advance Flow
        const advanceFlow = await queryRunner.query(
            'SELECT id FROM approval_flows WHERE code = $1',
            ['SALARY_ADVANCE_DEFAULT']
        );

        if (advanceFlow.length === 0) {
            const [flow] = await queryRunner.query(
                `INSERT INTO approval_flows (id, code, name, target_type, is_active, priority, created_at, updated_at)
                VALUES (gen_random_uuid(), 'SALARY_ADVANCE_DEFAULT', 'Salary Advance Approval', 'staff_loan', true, 1, NOW(), NOW())
                RETURNING id`
            );

            // Step 1: Branch Manager
            await queryRunner.query(
                `INSERT INTO approval_flow_steps (
                    id, flow_id, step_order, name, approver_type, approver_role_code, is_final, created_at, updated_at
                ) VALUES (gen_random_uuid(), $1, 1, 'Branch Manager Approval', 'ROLE', 'BRANCH_MANAGER', false, NOW(), NOW())`,
                [flow.id]
            );

            // Step 2: HR
            await queryRunner.query(
                `INSERT INTO approval_flow_steps (
                    id, flow_id, step_order, name, approver_type, approver_role_code, is_final, created_at, updated_at
                ) VALUES (gen_random_uuid(), $1, 2, 'HR Approval', 'ROLE', 'HR_MANAGER', true, NOW(), NOW())`,
                [flow.id]
            );

            console.log('  ✅ Created SALARY_ADVANCE_DEFAULT flow with 2 steps');
        } else {
            console.log('  ⏭️ SALARY_ADVANCE_DEFAULT already exists');
        }

        // Staff Loan Flow (more steps)
        const loanFlow = await queryRunner.query(
            'SELECT id FROM approval_flows WHERE code = $1',
            ['STAFF_LOAN_DEFAULT']
        );

        if (loanFlow.length === 0) {
            const [flow] = await queryRunner.query(
                `INSERT INTO approval_flows (id, code, name, target_type, is_active, priority, created_at, updated_at)
                VALUES (gen_random_uuid(), 'STAFF_LOAN_DEFAULT', 'Staff Loan Approval', 'staff_loan', true, 2, NOW(), NOW())
                RETURNING id`
            );

            // Step 1: Branch Manager
            await queryRunner.query(
                `INSERT INTO approval_flow_steps (
                    id, flow_id, step_order, name, approver_type, approver_role_code, is_final, created_at, updated_at
                ) VALUES (gen_random_uuid(), $1, 1, 'Branch Manager Review', 'ROLE', 'BRANCH_MANAGER', false, NOW(), NOW())`,
                [flow.id]
            );

            // Step 2: Regional Manager
            await queryRunner.query(
                `INSERT INTO approval_flow_steps (
                    id, flow_id, step_order, name, approver_type, approver_role_code, is_final, created_at, updated_at
                ) VALUES (gen_random_uuid(), $1, 2, 'Regional Manager Review', 'ROLE', 'REGIONAL_MANAGER', false, NOW(), NOW())`,
                [flow.id]
            );

            // Step 3: HR Manager
            await queryRunner.query(
                `INSERT INTO approval_flow_steps (
                    id, flow_id, step_order, name, approver_type, approver_role_code, is_final, created_at, updated_at
                ) VALUES (gen_random_uuid(), $1, 3, 'HR Verification', 'ROLE', 'HR_MANAGER', false, NOW(), NOW())`,
                [flow.id]
            );

            // Step 4: CEO
            await queryRunner.query(
                `INSERT INTO approval_flow_steps (
                    id, flow_id, step_order, name, approver_type, approver_role_code, is_final, created_at, updated_at
                ) VALUES (gen_random_uuid(), $1, 4, 'CEO Final Approval', 'ROLE', 'CEO', true, NOW(), NOW())`,
                [flow.id]
            );

            console.log('  ✅ Created STAFF_LOAN_DEFAULT flow with 4 steps');
        } else {
            console.log('  ⏭️ STAFF_LOAN_DEFAULT already exists');
        }

        console.log('\n✅ Claims & Loans seeding completed!');

    } catch (error) {
        console.error('❌ Error seeding claims & loans:', error);
        throw error;
    } finally {
        await queryRunner.release();
        await AppDataSource.destroy();
    }
}

seedClaimsLoans().catch(console.error);
