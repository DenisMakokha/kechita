import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { v4 as uuidv4 } from 'uuid';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [],
    synchronize: false,
});

async function seed() {
    await AppDataSource.initialize();
    console.log('Connected to database');

    const users: Array<{ id: string }> = await AppDataSource.query('SELECT id FROM users ORDER BY created_at ASC LIMIT 3');
    if (users.length === 0) {
        console.log('No users found; cannot seed audit logs.');
        await AppDataSource.destroy();
        process.exit(0);
    }

    const logs = [
        { action: AuditAction.LOGIN, entity_type: 'auth', description: 'User logged in successfully' },
        { action: AuditAction.CREATE, entity_type: 'staff', description: 'Created new staff member' },
        { action: AuditAction.UPDATE, entity_type: 'staff', description: 'Updated staff profile' },
        { action: AuditAction.CREATE, entity_type: 'leave', description: 'Submitted leave request' },
        { action: AuditAction.APPROVE, entity_type: 'leave', description: 'Approved leave request' },
        { action: AuditAction.CREATE, entity_type: 'claim', description: 'Submitted expense claim' },
        { action: AuditAction.APPROVE, entity_type: 'claim', description: 'Approved expense claim' },
        { action: AuditAction.CREATE, entity_type: 'job_post', description: 'Created job posting' },
        { action: AuditAction.CREATE, entity_type: 'announcement', description: 'Published announcement' },
        { action: AuditAction.LOGOUT, entity_type: 'auth', description: 'User logged out' },
        { action: AuditAction.EXPORT, entity_type: 'report', description: 'Exported report' },
        { action: AuditAction.UPDATE, entity_type: 'settings', description: 'Updated settings' },
    ];

    for (let i = 0; i < 50; i++) {
        const log = logs[i % logs.length];
        const user = users[i % users.length];
        const daysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date();
        createdAt.setDate(createdAt.getDate() - daysAgo);

        await AppDataSource.query(
            `
            INSERT INTO audit_logs (
                id,
                user_id,
                staff_id,
                action,
                entity_type,
                entity_id,
                entity_name,
                description,
                old_values,
                new_values,
                metadata,
                ip_address,
                user_agent,
                request_url,
                request_method,
                is_successful,
                error_message,
                created_at
            ) VALUES (
                $1,$2,NULL,$3,$4,NULL,NULL,$5,NULL,NULL,NULL,$6,NULL,NULL,NULL,$7,NULL,$8
            )
            `,
            [
                uuidv4(),
                user.id,
                log.action,
                log.entity_type,
                log.description,
                `192.168.1.${Math.floor(Math.random() * 255)}`,
                Math.random() > 0.1,
                createdAt,
            ],
        );
    }

    console.log('Created 50 audit logs');
    await AppDataSource.destroy();
    process.exit(0);
}

seed().catch(console.error);
