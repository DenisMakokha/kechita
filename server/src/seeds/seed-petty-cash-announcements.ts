import { DataSource } from 'typeorm';
import { PettyCashFloat, FloatTier } from '../petty-cash/entities/petty-cash-float.entity';
import { PettyCashTransaction, TransactionType, ExpenseCategory, TransactionStatus } from '../petty-cash/entities/petty-cash-transaction.entity';
import { Announcement, AnnouncementPriority, AnnouncementStatus, DeliveryChannel, TargetAudience } from '../communications/entities/announcement.entity';
import { Branch } from '../org/entities/branch.entity';
import { Staff } from '../staff/entities/staff.entity';

export async function seedPettyCashAndAnnouncements(dataSource: DataSource) {
    const branchRepo = dataSource.getRepository(Branch);
    const staffRepo = dataSource.getRepository(Staff);
    const floatRepo = dataSource.getRepository(PettyCashFloat);
    const transactionRepo = dataSource.getRepository(PettyCashTransaction);
    const announcementRepo = dataSource.getRepository(Announcement);

    console.log('🏦 Seeding Petty Cash floats...');

    // Get branches
    const branches = await branchRepo.find({ take: 5 });
    if (branches.length === 0) {
        console.log('No branches found. Skipping petty cash seed.');
        return;
    }

    // Get staff for custodians
    const staff = await staffRepo.find({ take: 3 });

    // Create floats for each branch
    const floatData = [
        { tier: FloatTier.SMALL, max_limit: 50000, min_threshold: 10000 },
        { tier: FloatTier.MEDIUM, max_limit: 100000, min_threshold: 25000 },
        { tier: FloatTier.LARGE, max_limit: 250000, min_threshold: 50000 },
    ];

    for (let i = 0; i < Math.min(branches.length, 3); i++) {
        const branch = branches[i];
        const tierInfo = floatData[i % floatData.length];

        const existingFloat = await floatRepo.findOne({ where: { branch: { id: branch.id } } });
        if (existingFloat) continue;

        const float = floatRepo.create({
            branch,
            tier: tierInfo.tier,
            maximum_limit: tierInfo.max_limit,
            minimum_threshold: tierInfo.min_threshold,
            current_balance: Math.floor(tierInfo.max_limit * 0.7),
            custodian: staff[i] || null,
            is_active: true,
        });
        await floatRepo.save(float);

        // Create some transactions
        const categories = [
            ExpenseCategory.OFFICE_SUPPLIES,
            ExpenseCategory.TRANSPORT,
            ExpenseCategory.MEALS_TEA,
            ExpenseCategory.CLEANING,
            ExpenseCategory.UTILITIES,
        ];

        for (let j = 0; j < 5; j++) {
            const txn = transactionRepo.create({
                float,
                type: TransactionType.EXPENSE,
                category: categories[j % categories.length],
                description: `Sample expense for ${categories[j % categories.length].replace(/_/g, ' ')}`,
                amount: 1000 + Math.floor(Math.random() * 5000),
                balance_before: tierInfo.max_limit * 0.8,
                balance_after: tierInfo.max_limit * 0.7,
                transaction_date: new Date(Date.now() - j * 86400000),
                status: TransactionStatus.APPROVED,
                createdBy: staff[0] || null,
            });
            await transactionRepo.save(txn);
        }

        console.log(`  ✅ Created float for ${branch.name} with sample transactions`);
    }

    console.log('📢 Seeding Announcements...');

    const announcements = [
        {
            title: 'Welcome to Q4 2024!',
            content: `Dear Team,

As we enter the final quarter of 2024, I want to take a moment to celebrate our achievements and look ahead to our goals.

This year has been remarkable for our growth, and I'm proud of every member of this team for their dedication and hard work.

Key Priorities for Q4:
- Customer retention focus
- New product launch preparation
- Year-end targets achievement

Let's finish the year strong!

Best regards,
Management`,
            priority: AnnouncementPriority.URGENT,
            status: AnnouncementStatus.PUBLISHED,
            channels: [DeliveryChannel.PORTAL, DeliveryChannel.EMAIL],
            target_type: TargetAudience.ALL,
            requires_acknowledgment: false,
            published_at: new Date(),
        },
        {
            title: 'Updated Leave Policy - Effective January 2025',
            content: `Please note the following updates to our leave policy:

1. Annual leave will now accrue at 2 days per month
2. Sick leave documentation requirements have been simplified
3. Remote work days can now be combined with leave days

Please review the full policy document in the HR portal.

For questions, contact the HR team.`,
            priority: AnnouncementPriority.NORMAL,
            status: AnnouncementStatus.PUBLISHED,
            channels: [DeliveryChannel.PORTAL],
            target_type: TargetAudience.ALL,
            requires_acknowledgment: true,
            published_at: new Date(Date.now() - 86400000 * 3),
        },
        {
            title: 'Urgent: System Maintenance - Saturday',
            content: `IMPORTANT NOTICE

The system will undergo scheduled maintenance this Saturday from 10 PM to 6 AM.

During this time:
- Portal access may be intermittent
- Email notifications will be delayed
- Mobile app will be unavailable

Please plan your work accordingly.

IT Support Team`,
            priority: AnnouncementPriority.CRITICAL,
            status: AnnouncementStatus.PUBLISHED,
            channels: [DeliveryChannel.PORTAL, DeliveryChannel.EMAIL],
            target_type: TargetAudience.ALL,
            requires_acknowledgment: false,
            published_at: new Date(),
        },
        {
            title: 'New Training Program Launch',
            content: `We're excited to announce our new professional development program!

Starting next month, we'll offer:
- Leadership workshops
- Technical skill certifications
- Soft skills training

Enrollment opens next week. Stay tuned for details.`,
            priority: AnnouncementPriority.NORMAL,
            status: AnnouncementStatus.DRAFT,
            channels: [DeliveryChannel.PORTAL],
            target_type: TargetAudience.ALL,
            requires_acknowledgment: false,
        },
    ];

    for (const annData of announcements) {
        const existing = await announcementRepo.findOne({ where: { title: annData.title } });
        if (existing) continue;

        const announcement = announcementRepo.create({
            ...annData,
            createdBy: staff[0] || null,
        });
        await announcementRepo.save(announcement);
        console.log(`  ✅ Created announcement: ${annData.title}`);
    }

    console.log('✅ Petty Cash and Announcements seeding complete!');
}

// Run if called directly
if (require.main === module) {
    const { createDataSource } = require('./seed-org');
    createDataSource().then((ds: DataSource) => {
        seedPettyCashAndAnnouncements(ds)
            .then(() => ds.destroy())
            .catch(console.error);
    });
}
