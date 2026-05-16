import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsPaidToLeaveType1747393800000 implements MigrationInterface {
    name = 'AddIsPaidToLeaveType1747393800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leave_types" ADD COLUMN IF NOT EXISTS "is_paid" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "leave_types" DROP COLUMN IF EXISTS "is_paid"`);
    }
}
