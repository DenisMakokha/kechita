import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PettyCashService } from './src/petty-cash/petty-cash.service';
import { FloatTier } from './src/petty-cash/entities/petty-cash-float.entity';
import { DataSource } from 'typeorm';
import { Branch } from './src/org/entities/branch.entity';
import { Staff } from './src/staff/entities/staff.entity';

async function run() {
    console.log('Bootstrapping application context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(PettyCashService);
    const dataSource = app.get(DataSource);
    try {
        console.log('Fetching first branch...');
        const branch = await dataSource.getRepository(Branch).findOne({ where: {} });
        if (!branch) {
            console.log('No branches found in DB');
            return;
        }
        console.log('Using branch:', branch.name, 'ID:', branch.id);

        console.log('Checking admin@kechita.com user...');
        const adminUser = await dataSource.getRepository(Staff).manager.query('SELECT * FROM users WHERE email = $1', ['admin@kechita.com']);
        if (adminUser.length > 0) {
            const userId = adminUser[0].id;
            const staffProfile = await dataSource.getRepository(Staff).findOne({ where: { user: { id: userId } } });
            console.log('admin@kechita.com staff profile:', staffProfile);
        } else {
            console.log('admin@kechita.com user not found in DB');
        }

        console.log('Fetching first staff member...');
        const staff = await dataSource.getRepository(Staff).findOne({ where: {} });
        if (!staff) {
            console.log('No staff found in DB');
            return;
        }
        console.log('Using staff custodian:', staff.first_name, staff.last_name, 'ID:', staff.id);

        // Delete existing float if any, to avoid "already exists" error
        console.log('Cleaning up existing floats for this branch...');
        await dataSource.query('DELETE FROM petty_cash_transactions WHERE float_id IN (SELECT id FROM petty_cash_floats WHERE branch_id = $1)', [branch.id]);
        await dataSource.query('DELETE FROM petty_cash_floats WHERE branch_id = $1', [branch.id]);

        console.log('Testing createFloat with initial balance > 0...');
        const result = await service.createFloat({
            branch_id: branch.id,
            tier: FloatTier.SMALL,
            custodian_id: staff.id,
            initial_balance: 1000,
        }, staff.id);
        console.log('Float created successfully! ID:', result.id, 'Balance:', result.current_balance);

    } catch (err: any) {
        console.error('Error during float creation test:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await app.close();
    }
}

run().catch(err => {
    console.error('Script boot error:', err);
});
