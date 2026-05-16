import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPositionTargetingToAnnouncements1747401000000 implements MigrationInterface {
    name = 'AddPositionTargetingToAnnouncements1747401000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add target_position_ids column (simple-array stored as text)
        await queryRunner.query(`ALTER TABLE "announcements" ADD COLUMN IF NOT EXISTS "target_position_ids" text`);

        // Add 'positions' to the target_type enum if it doesn't already exist
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum
                    WHERE enumlabel = 'positions'
                      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'announcements_target_type_enum')
                ) THEN
                    ALTER TYPE "announcements_target_type_enum" ADD VALUE 'positions';
                END IF;
            END$$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "announcements" DROP COLUMN IF EXISTS "target_position_ids"`);
        // Note: Postgres does not support removing enum values; left in place.
    }
}
