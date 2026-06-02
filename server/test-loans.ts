import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { LoansService } from './src/loans/loans.service';
import { LoanStatus } from './src/loans/entities/staff-loan.entity';

async function run() {
    console.log('Bootstrapping application context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(LoansService);
    try {
        console.log('Finding approved loans...');
        const loans = await service.findAll({ status: LoanStatus.APPROVED });
        console.log('Approved loans count:', loans.length);
        if (loans.length > 0) {
            const loan = loans[0];
            console.log('Testing disburse for loan:', loan.loan_number, 'ID:', loan.id);
            const disburserId = loan.staff.id; // use staff ID for testing
            const result = await service.disburseLoan(
                loan.id,
                disburserId,
                'TEST-DISB-REF-' + Date.now(),
                'bank_transfer',
            );
            console.log('Loan disbursed successfully! Status:', result.status);
        } else {
            console.log('No approved loans found to test.');
        }

        console.log('Checking active loans and their repayment counts...');
        const activeLoans = await service.findAll({ status: LoanStatus.ACTIVE });
        console.log('Active loans count:', activeLoans.length);
        for (const al of activeLoans) {
            const schedule = await service.findById(al.id).then(l => l.repayments);
            console.log(`Loan ${al.loan_number} (ID: ${al.id}) has ${schedule ? schedule.length : 0} repayments in schedule.`);
        }
    } catch (err: any) {
        console.error('Error during loan disbursement test:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await app.close();
    }
}

run().catch(err => {
    console.error('Script boot error:', err);
});
