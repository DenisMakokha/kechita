import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { BiodataService } from './src/staff/services/biodata.service';

async function run() {
    console.log('Bootstrapping application context...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(BiodataService);
    try {
        console.log('Calculating completeness for staff d5dbf2c9-0bae-4fa7-b8ef-8d4d5cbaf1fc...');
        const score = await service.calculateCompleteness('d5dbf2c9-0bae-4fa7-b8ef-8d4d5cbaf1fc');
        console.log('Success! Completeness score:', score);
    } catch (err: any) {
        console.error('Error calculating completeness:', err.message);
        if (err.stack) console.error(err.stack);
    } finally {
        await app.close();
    }
}

run().catch(err => {
    console.error('Script boot error:', err);
});
