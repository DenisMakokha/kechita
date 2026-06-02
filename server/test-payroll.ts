import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PayrollService } from './src/payroll/services/payroll.service';

async function run() {
    console.log('Bootstrapping application context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(PayrollService);
    try {
        console.log('Listing existing periods...');
        const periods = await service.listPeriods();
        let period = periods.find(p => p.year === 2026 && p.month === 6);
        if (!period) {
            console.log('Creating a test payroll period for June 2026...');
            period = await service.createPeriod({ year: 2026, month: 6, notes: 'Test Period' });
            console.log('Period created:', period.id);
        } else {
            console.log('Using existing period:', period.id);
        }

        console.log('Creating a test payroll run...');
        const run = await service.createRun({
            period_id: period.id,
            name: 'Test Payroll Run ' + Date.now(),
        });
        console.log('Run created:', run.id);

        console.log('Calculating payroll run...');
        const calculated = await service.calculateRun(run.id);
        console.log('Run calculated successfully! Employee count:', calculated.employee_count, 'Net total:', calculated.total_net);
    } catch (err: any) {
        console.error('Error during payroll calculation:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await app.close();
    }
}

run().catch(err => {
    console.error('Script boot error:', err);
});
