import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { Staff, StaffStatus, ProbationStatus } from '../staff/entities/staff.entity';
import { Region } from '../org/entities/region.entity';
import { Branch } from '../org/entities/branch.entity';
import { Department } from '../org/entities/department.entity';
import { Position } from '../org/entities/position.entity';
import { Document } from '../staff/entities/document.entity';
import { DocumentType } from '../staff/entities/document-type.entity';
import { StaffDocument } from '../staff/entities/staff-document.entity';
import { EmploymentHistory } from '../staff/entities/employment-history.entity';
import { OnboardingTemplate } from '../staff/entities/onboarding-template.entity';
import { OnboardingTask } from '../staff/entities/onboarding-task.entity';
import { OnboardingInstance } from '../staff/entities/onboarding-instance.entity';
import { OnboardingTaskStatus } from '../staff/entities/onboarding-task-status.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [
        Role, User, Region, Branch, Department, Position,
        Staff, Document, DocumentType, StaffDocument, EmploymentHistory,
        OnboardingTemplate, OnboardingTask, OnboardingInstance, OnboardingTaskStatus,
    ],
    synchronize: true,
});

async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected for admin seeding...');

    try {
        const userRepo = AppDataSource.getRepository(User);
        const roleRepo = AppDataSource.getRepository(Role);
        const staffRepo = AppDataSource.getRepository(Staff);
        const positionRepo = AppDataSource.getRepository(Position);

        // 1. Ensure CEO Role exists
        const ceoRole = await roleRepo.findOneBy({ code: 'CEO' });
        if (!ceoRole) throw new Error('CEO Role not found. Run seed-roles.ts first.');

        // 2. Create CEO User
        const existingUser = await userRepo.findOneBy({ email: 'ceo@kechita.com' });
        if (existingUser) {
            console.log('CEO User already exists.');
            return;
        }

        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = userRepo.create({
            email: 'ceo@kechita.com',
            password_hash: hashedPassword,
            is_active: true,
            roles: [ceoRole]
        });
        const savedUser = await userRepo.save(user);

        // 3. Create CEO Position if missing
        let ceoPos = await positionRepo.findOneBy({ code: 'CEO' });
        if (!ceoPos) {
            ceoPos = positionRepo.create({ name: 'Chief Executive Officer', code: 'CEO' });
            await positionRepo.save(ceoPos);
        }

        // 4. Create Staff Profile with new entity structure
        const staff = staffRepo.create({
            user: savedUser,
            employee_number: 'KEC250001',
            first_name: 'System',
            last_name: 'Admin',
            status: StaffStatus.ACTIVE,
            probation_status: ProbationStatus.NOT_APPLICABLE,
            position: ceoPos,
            hire_date: new Date(),
            confirmation_date: new Date(),
        });
        await staffRepo.save(staff);

        console.log('CEO User & Staff profile created. Email: ceo@kechita.com, Pass: password123');

    } catch (err) {
        console.error(err);
    } finally {
        await AppDataSource.destroy();
    }
}

seed();
