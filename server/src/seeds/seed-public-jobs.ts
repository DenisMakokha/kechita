import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { JobPost, JobStatus, EmploymentType, ExperienceLevel } from '../recruitment/entities/job-post.entity';
import { Department } from '../org/entities/department.entity';
import { Branch } from '../org/entities/branch.entity';
import { Staff } from '../staff/entities/staff.entity';
import { Position } from '../org/entities/position.entity';
import { Region } from '../org/entities/region.entity';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [path.join(__dirname, '../**/*.entity.{ts,js}')],
    synchronize: false,
});

async function seed() {
    await AppDataSource.initialize();
    console.log('Database connected for public jobs seeding...');

    try {
        const jobRepo = AppDataSource.getRepository(JobPost);
        const deptRepo = AppDataSource.getRepository(Department);
        const branchRepo = AppDataSource.getRepository(Branch);
        const staffRepo = AppDataSource.getRepository(Staff);

        const creator = await staffRepo.findOne({ where: {} });

        if (!creator) {
            console.log('No staff found. Please run staff seeder first.');
            process.exit(0);
        }

        const depts = await deptRepo.find();
        const branches = await branchRepo.find();

        const jobsData = [
            {
                title: 'Senior Credit Analyst',
                deptName: 'Operations',
                location: 'Nairobi HQ',
                type: EmploymentType.FULL_TIME,
                level: ExperienceLevel.SENIOR,
                min: 120000,
                max: 180000,
                desc: 'We are looking for an experienced Senior Credit Analyst to join our team. You will be responsible for evaluating creditworthiness and managing risk for our high-value portfolio.\n\nKey Responsibilities:\n• Analyze financial data and credit histories.\n• Assess credit risk and make lending recommendations.\n• Monitor loan portfolio performance.\n• Mentor junior analysts.\n\nRequirements:\n• Bachelors degree in Finance, Economics, or related field.\n• 5+ years of experience in credit analysis.\n• Strong analytical and problem-solving skills.',
                skills: ['Finance', 'Risk Analysis', 'Excel', 'Credit Assessment'],
                urgent: true
            },
            {
                title: 'Branch Manager',
                deptName: 'Operations',
                branchName: 'Kisumu',
                type: EmploymentType.FULL_TIME,
                level: ExperienceLevel.MID,
                min: 100000,
                max: 150000,
                desc: 'Lead our team in Kisumu! We need a dynamic Branch Manager to oversee daily operations and drive business growth.\n\nResponsibilities:\n• Manage branch staff and operations.\n• Develop and implement sales strategies.\n• Ensure compliance with company policies.\n• Build relationships with local clients.\n\nRequirements:\n• 3+ years of management experience.\n• Proven track record in sales.\n• Excellent leadership skills.',
                skills: ['Management', 'Sales', 'Leadership', 'Operations'],
                urgent: false
            },
            {
                title: 'IT Support Specialist',
                deptName: 'IT',
                type: EmploymentType.FULL_TIME,
                level: ExperienceLevel.JUNIOR,
                min: 50000,
                max: 70000,
                desc: 'Join our IT team to provide technical support to our staff.\n\nResponsibilities:\n• Troubleshoot hardware and software issues.\n• Set up new user accounts and equipment.\n• Monitoring network performance.\n\nRequirements:\n• Diploma/Degree in IT.\n• Knowledge of Windows and networking.\n• Good communication skills.',
                skills: ['IT Support', 'Networking', 'Windows', 'Troubleshooting'],
                urgent: false
            },
            {
                title: 'Marketing Executive',
                deptName: 'Sales',
                type: EmploymentType.CONTRACT,
                level: ExperienceLevel.ENTRY,
                min: 40000,
                max: 60000,
                desc: 'We are seeking a creative Marketing Executive to help promote our financial products.\n\nResponsibilities:\n• Assist in creating marketing campaigns.\n• Manage social media accounts.\n• Organize promotional events.\n\nRequirements:\n• Degree in Marketing or related field.\n• Creativity and enthusiasm.\n• Strong communication skills.',
                skills: ['Marketing', 'Social Media', 'Communication'],
                urgent: false
            }
        ];

        for (const job of jobsData) {
            const dept = depts.find(d => d.name.toLowerCase().includes(job.deptName.toLowerCase())) || depts[0];
            const branch = job.branchName ? branches.find(b => b.name.includes(job.branchName)) : null;

            const existing = await jobRepo.findOneBy({ title: job.title });
            if (!existing) {
                const newJob = jobRepo.create({
                    job_code: 'JOB-' + Math.floor(Math.random() * 100000),
                    title: job.title,
                    department: dept,
                    branch: branch || undefined,
                    location: job.location || (branch ? branch.name : 'Head Office'),
                    employment_type: job.type as any,
                    experience_level: job.level as any,
                    salary_min: job.min,
                    salary_max: job.max,
                    description: job.desc,
                    required_skills: job.skills,
                    is_urgent: job.urgent,
                    status: JobStatus.PUBLISHED,
                    published_at: new Date(),
                    createdBy: creator,
                    show_salary: true
                });
                await jobRepo.save(newJob);
                console.log('Created job: ' + job.title);
            } else {
                console.log('Job already exists: ' + job.title);
                // Update status to PUBLISHED if stuck in draft
                if (existing.status !== JobStatus.PUBLISHED) {
                    existing.status = JobStatus.PUBLISHED;
                    existing.published_at = new Date();
                    await jobRepo.save(existing);
                    console.log('Updated status to PUBLISHED for: ' + job.title);
                }
            }
        }

    } catch (err) {
        console.error('Error seeding jobs:', err);
    } finally {
        await AppDataSource.destroy();
    }
}

seed();
