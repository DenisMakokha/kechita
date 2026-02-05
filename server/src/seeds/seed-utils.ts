export function getRequiredDbConfig() {
    const required = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required database env vars: ${missing.join(', ')}. Check your .env file.`);
    }
    return {
        host: process.env.DB_HOST!,
        port: parseInt(process.env.DB_PORT!),
        username: process.env.DB_USERNAME!,
        password: process.env.DB_PASSWORD!,
        database: process.env.DB_DATABASE!,
    };
}

export function assertSeedingEnabled(seedName: string, options?: { destructive?: boolean }) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        throw new Error(`Refusing to run seed '${seedName}' in production`);
    }

    const enabled = process.env.SEED_MODE === 'true';
    if (!enabled) {
        throw new Error(
            `Seeding is disabled. To run '${seedName}', set SEED_MODE=true in your environment.`,
        );
    }

    if (options?.destructive) {
        const destructiveEnabled = process.env.SEED_DESTRUCTIVE === 'true';
        if (!destructiveEnabled) {
            throw new Error(
                `Seed '${seedName}' is destructive. Set SEED_DESTRUCTIVE=true to allow destructive seeding.`,
            );
        }
    }
}
