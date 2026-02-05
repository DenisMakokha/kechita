import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { Region } from '../org/entities/region.entity';
import { Branch } from '../org/entities/branch.entity';
import { Department } from '../org/entities/department.entity';
import { Position } from '../org/entities/position.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [Role, User, Region, Branch, Department, Position],
    synchronize: true, // Reuse the sync config
});

const ROLES = [
    { code: 'CEO', name: 'Chief Executive Officer' },
    { code: 'HR_MANAGER', name: 'HR Manager' },
    { code: 'REGIONAL_ADMIN', name: 'Regional Admin' },
    { code: 'HR_ASSISTANT', name: 'HR Assistant' },
    { code: 'REGIONAL_MANAGER', name: 'Regional Manager' },
    { code: 'BRANCH_MANAGER', name: 'Branch Manager' },
    { code: 'RELATIONSHIP_OFFICER', name: 'Relationship Officer' },
    { code: 'BDM', name: 'Business Development Manager' },
    { code: 'ACCOUNTANT', name: 'Accountant' },
];

async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected for seeding...');

    const roleRepo = AppDataSource.getRepository(Role);

    for (const roleData of ROLES) {
        const existing = await roleRepo.findOneBy({ code: roleData.code });
        if (!existing) {
            const role = roleRepo.create(roleData);
            await roleRepo.save(role);
            console.log(`Created role: ${roleData.code}`);
        } else {
            console.log(`Role exists: ${roleData.code}`);
        }
    }

    await AppDataSource.destroy();
}

seed().catch((error) => console.log(error));
