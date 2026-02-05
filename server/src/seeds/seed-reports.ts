import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { assertSeedingEnabled } from './seed-utils';

dotenv.config();

assertSeedingEnabled('seed-reports', { destructive: true });

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected for reporting data seeding...');

    try {
        const qr = AppDataSource.createQueryRunner();

        // Create regions if they don't exist
        const regions = [
            { name: 'Central', code: 'CENTRAL' },
            { name: 'Western', code: 'WESTERN' },
            { name: 'Eastern', code: 'EASTERN' },
            { name: 'Northern', code: 'NORTHERN' },
            { name: 'Southern', code: 'SOUTHERN' },
        ];

        const regionIds: { [key: string]: string } = {};
        for (const r of regions) {
            const existing = await qr.query(
                `SELECT id FROM regions WHERE code = $1`, [r.code]
            );
            if (existing.length === 0) {
                const result = await qr.query(
                    `INSERT INTO regions (name, code) VALUES ($1, $2) RETURNING id`,
                    [r.name, r.code]
                );
                regionIds[r.code] = result[0].id;
                console.log(`Created region: ${r.name}`);
            } else {
                regionIds[r.code] = existing[0].id;
                console.log(`Region exists: ${r.name}`);
            }
        }

        // Create branches for each region
        const branchNames = ['Main', 'North'];
        const branchIds: string[] = [];

        for (const [code, regionId] of Object.entries(regionIds)) {
            for (const suffix of branchNames) {
                const branchCode = `${code}-${suffix}`.toUpperCase();
                const branchName = `${code} ${suffix} Branch`;

                const existing = await qr.query(
                    `SELECT id FROM branches WHERE code = $1`, [branchCode]
                );
                if (existing.length === 0) {
                    const result = await qr.query(
                        `INSERT INTO branches (name, code, region_id) VALUES ($1, $2, $3) RETURNING id`,
                        [branchName, branchCode, regionId]
                    );
                    branchIds.push(result[0].id);
                    console.log(`Created branch: ${branchName}`);
                } else {
                    branchIds.push(existing[0].id);
                    console.log(`Branch exists: ${branchName}`);
                }
            }
        }

        // Clear existing reports
        await qr.query(`DELETE FROM branch_daily_reports`);
        console.log('Cleared existing reports...');

        // Create daily reports for the last 6 months
        const today = new Date();
        let reportCount = 0;

        for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
            const reportMonth = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
            const daysInMonth = new Date(reportMonth.getFullYear(), reportMonth.getMonth() + 1, 0).getDate();

            for (const branchId of branchIds) {
                // Weekly reports
                for (let day = 1; day <= daysInMonth; day += 7) {
                    const reportDate = new Date(reportMonth.getFullYear(), reportMonth.getMonth(), Math.min(day, daysInMonth));

                    const loansDisbursed = Math.floor(Math.random() * 500000) + 100000;
                    const recoveries = Math.floor(loansDisbursed * (0.7 + Math.random() * 0.25));
                    const newLoans = Math.floor(Math.random() * 10) + 5;
                    const parRatio = Math.random() * 6 + 1;
                    const parAmount = loansDisbursed * (parRatio / 100);

                    await qr.query(
                        `INSERT INTO branch_daily_reports 
                         (report_date, branch_id, status, loans_new_count, loans_disbursed_amount, 
                          recoveries_amount, arrears_collected, prepayments_due, par_amount, par_ratio)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                        [
                            reportDate.toISOString().split('T')[0],
                            branchId,
                            'approved',
                            newLoans,
                            loansDisbursed,
                            recoveries,
                            Math.floor(Math.random() * 50000),
                            Math.floor(Math.random() * 30000),
                            parAmount,
                            Number(parRatio.toFixed(2))
                        ]
                    );
                    reportCount++;
                }
            }
        }

        console.log(`\nSuccessfully seeded ${reportCount} branch daily reports!`);
        console.log('Regions:', Object.keys(regionIds).length);
        console.log('Branches:', branchIds.length);

    } catch (err) {
        console.error('Error seeding reports:', err);
    } finally {
        await AppDataSource.destroy();
    }
}

seed();
