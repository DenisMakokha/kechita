import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { assertSeedingEnabled, getRequiredDbConfig } from './seed-utils';

dotenv.config();

assertSeedingEnabled('seed-recruitment');

async function seedRecruitment() {
    console.log('🌱 Seeding Recruitment/ATS data...\n');

    const dbConfig = getRequiredDbConfig();
    const dataSource = new DataSource({
        type: 'postgres',
        ...dbConfig,
        synchronize: false,
        logging: false,
    });

    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
        // ==================== PIPELINE STAGES ====================
        console.log('📊 Creating pipeline stages...');

        const stages = [
            { code: 'APPLIED', name: 'Applied', position: 1, color: '#3B82F6', is_terminal: false, is_success: false, description: 'Candidate has submitted their application' },
            { code: 'SCREENING', name: 'Screening', position: 2, color: '#F59E0B', is_terminal: false, is_success: false, description: 'Initial resume/profile screening' },
            { code: 'PHONE_SCREEN', name: 'Phone Screen', position: 3, color: '#8B5CF6', is_terminal: false, is_success: false, description: 'Initial phone interview' },
            { code: 'INTERVIEW', name: 'Interview', position: 4, color: '#6366F1', is_terminal: false, is_success: false, requires_interview: true, description: 'In-person or video interview' },
            { code: 'ASSESSMENT', name: 'Assessment', position: 5, color: '#EC4899', is_terminal: false, is_success: false, description: 'Skills assessment or test' },
            { code: 'FINAL_INTERVIEW', name: 'Final Interview', position: 6, color: '#14B8A6', is_terminal: false, is_success: false, requires_interview: true, description: 'Final round interview' },
            { code: 'REFERENCE_CHECK', name: 'Reference Check', position: 7, color: '#0EA5E9', is_terminal: false, is_success: false, description: 'Checking candidate references' },
            { code: 'OFFER', name: 'Offer', position: 8, color: '#84CC16', is_terminal: false, is_success: false, description: 'Job offer extended' },
            { code: 'HIRED', name: 'Hired', position: 9, color: '#22C55E', is_terminal: true, is_success: true, send_candidate_email: true, description: 'Candidate has been hired' },
            { code: 'REJECTED', name: 'Rejected', position: 10, color: '#EF4444', is_terminal: true, is_success: false, send_candidate_email: true, description: 'Candidate has been rejected' },
        ];

        for (const stage of stages) {
            const existing = await queryRunner.query(
                `SELECT id FROM pipeline_stages WHERE code = $1`,
                [stage.code]
            );

            if (existing.length === 0) {
                await queryRunner.query(
                    `INSERT INTO pipeline_stages (id, code, name, position, color, is_terminal, is_success, description, requires_interview, send_candidate_email, is_active, created_at, updated_at)
                     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())`,
                    [stage.code, stage.name, stage.position, stage.color, stage.is_terminal, stage.is_success, stage.description, stage.requires_interview || false, stage.send_candidate_email || false]
                );
                console.log(`  ✅ Created stage: ${stage.name}`);
            } else {
                // Update existing
                await queryRunner.query(
                    `UPDATE pipeline_stages SET color = $1, description = $2, is_active = true WHERE code = $3`,
                    [stage.color, stage.description, stage.code]
                );
                console.log(`  ⏭️ Stage ${stage.name} already exists (updated)`);
            }
        }

        // ==================== SAMPLE JOB POSTS ====================
        console.log('\n📋 Creating sample job posts...');

        const sampleJobs = [
            {
                title: 'Senior Software Engineer',
                description: 'We are looking for an experienced Senior Software Engineer to join our technology team. You will be responsible for designing, developing, and maintaining high-quality software solutions.',
                responsibilities: '• Design and implement scalable software solutions\n• Lead technical discussions and code reviews\n• Mentor junior developers\n• Collaborate with cross-functional teams',
                requirements: '• 5+ years of software development experience\n• Proficiency in TypeScript, Node.js, React\n• Experience with PostgreSQL and cloud services\n• Strong problem-solving skills',
                required_skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'AWS'],
                preferred_skills: ['Docker', 'Kubernetes', 'GraphQL'],
                employment_type: 'full_time',
                experience_level: 'senior',
                min_experience_years: 5,
                salary_min: 150000,
                salary_max: 250000,
                is_urgent: true,
            },
            {
                title: 'HR Coordinator',
                description: 'Join our HR team to help manage recruitment, onboarding, and employee relations. This role is perfect for someone passionate about people and organizational development.',
                responsibilities: '• Support recruitment and onboarding processes\n• Maintain employee records\n• Coordinate HR events and training\n• Assist with payroll administration',
                requirements: '• Bachelor\'s degree in HR or related field\n• 2+ years HR experience\n• Excellent communication skills\n• Knowledge of labor laws',
                required_skills: ['HR Management', 'Communication', 'Microsoft Office', 'Payroll'],
                preferred_skills: ['HRIS Systems', 'Training & Development'],
                employment_type: 'full_time',
                experience_level: 'mid',
                min_experience_years: 2,
                salary_min: 60000,
                salary_max: 90000,
                is_urgent: false,
            },
            {
                title: 'Marketing Intern',
                description: 'Exciting opportunity for a Marketing Intern to gain hands-on experience in digital marketing, content creation, and campaign management.',
                responsibilities: '• Assist with social media management\n• Create content for marketing materials\n• Support campaign analytics\n• Research market trends',
                requirements: '• Currently pursuing degree in Marketing or Business\n• Strong writing skills\n• Familiarity with social media platforms\n• Creative mindset',
                required_skills: ['Social Media', 'Content Writing', 'Canva'],
                preferred_skills: ['Google Analytics', 'SEO'],
                employment_type: 'internship',
                experience_level: 'entry',
                min_experience_years: 0,
                salary_min: 15000,
                salary_max: 25000,
                is_urgent: false,
            },
        ];

        for (const job of sampleJobs) {
            const existing = await queryRunner.query(
                `SELECT id FROM job_posts WHERE title = $1`,
                [job.title]
            );

            if (existing.length === 0) {
                const jobCode = `JOB-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
                await queryRunner.query(
                    `INSERT INTO job_posts (
                        id, job_code, title, description, responsibilities, requirements, 
                        required_skills, preferred_skills, employment_type, experience_level,
                        min_experience_years, salary_min, salary_max, salary_currency, show_salary,
                        vacancies, is_urgent, status, requires_resume, created_at, updated_at
                    ) VALUES (
                        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'KES', true,
                        1, $13, 'published', true, NOW(), NOW()
                    )`,
                    [
                        jobCode, job.title, job.description, job.responsibilities, job.requirements,
                        job.required_skills.join(','), job.preferred_skills.join(','),
                        job.employment_type, job.experience_level, job.min_experience_years,
                        job.salary_min, job.salary_max, job.is_urgent
                    ]
                );
                console.log(`  ✅ Created job: ${job.title}`);
            } else {
                console.log(`  ⏭️ Job ${job.title} already exists`);
            }
        }

        console.log('\n✅ Recruitment/ATS seeding completed!');

    } catch (error) {
        console.error('❌ Error seeding recruitment data:', error);
        throw error;
    } finally {
        await queryRunner.release();
        await dataSource.destroy();
    }
}

seedRecruitment().catch(console.error);
