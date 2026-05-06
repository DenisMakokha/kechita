import { seedProductionDefaults } from '../seeds/seed-production-defaults';

async function runSeed() {
    try {
        await seedProductionDefaults();
        console.log('Seed completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

runSeed();
