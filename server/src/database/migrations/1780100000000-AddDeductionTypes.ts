import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeductionTypes1780100000000 implements MigrationInterface {
    name = 'AddDeductionTypes1780100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."staff_recurring_deductions_type_enum" ADD VALUE IF NOT EXISTS 'helb'`);
        await queryRunner.query(`ALTER TYPE "public"."staff_recurring_deductions_type_enum" ADD VALUE IF NOT EXISTS 'car_loan'`);
        await queryRunner.query(`ALTER TYPE "public"."staff_recurring_deductions_type_enum" ADD VALUE IF NOT EXISTS 'staff_loan'`);
        await queryRunner.query(`ALTER TYPE "public"."staff_recurring_deductions_type_enum" ADD VALUE IF NOT EXISTS 'salary_advance'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // PostgreSQL does not support dropping enum values.
    }
}
