import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { BiodataService } from './src/staff/services/biodata.service';

async function run() {
    console.log('Bootstrapping application context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(BiodataService);
    const staffId = 'd5dbf2c9-0bae-4fa7-b8ef-8d4d5cbaf1fc';

    try {
        console.log('--- 1. Testing createWorkExperience ---');
        try {
            await service.createWorkExperience(staffId, {
                employer_name: 'Test Employer',
                job_title: 'Test Title',
                employment_type: 'full_time',
                start_date: '2020-01-01' as any,
                end_date: '2022-01-01' as any,
                is_current: false,
                responsibilities: 'Some duties',
                reference_name: 'Ref Name',
                reference_phone: '0712345678',
                reference_email: 'ref@example.com'
            } as any);
            console.log('createWorkExperience success');
        } catch (err: any) {
            console.error('createWorkExperience error:', err.message);
        }

        console.log('--- 2. Testing createSkill ---');
        try {
            await service.createSkill(staffId, {
                skill_name: 'JavaScript',
                category: 'technical',
                proficiency: 'intermediate',
                years_experience: 3,
                certification_name: 'JS Cert',
                certification_number: '12345',
                issuing_body: 'Oracle',
                expiry_date: '2025-01-01',
                is_certified: true
            } as any);
            console.log('createSkill success');
        } catch (err: any) {
            console.error('createSkill error:', err.message);
        }

        console.log('--- 3. Testing createAsset ---');
        try {
            await service.createAsset(staffId, {
                category: 'laptop',
                description: 'Work Macbook',
                brand: 'Apple',
                model: 'Pro',
                serial_number: 'XYZ123',
                asset_tag: 'TAG-123',
                date_assigned: '2026-06-01',
                expected_return_date: '2028-06-01',
                condition_notes: 'New'
            } as any);
            console.log('createAsset success');
        } catch (err: any) {
            console.error('createAsset error:', err.message);
        }

        console.log('--- 4. Testing createBankAccount ---');
        try {
            await service.createBankAccount(staffId, {
                bank_name: 'Equity Bank',
                bank_branch: 'Nairobi',
                account_type: 'current',
                account_number: '1234567890',
                account_name: 'John Doe',
                swift_code: 'EQTYKE',
                iban: 'IBAN123',
                is_primary: true
            } as any);
            console.log('createBankAccount success');
        } catch (err: any) {
            console.error('createBankAccount error:', err.message);
        }

    } finally {
        await app.close();
    }
}

run().catch(err => {
    console.error('Script boot error:', err);
});
