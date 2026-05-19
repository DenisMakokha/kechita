import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5 — Staff Biodata Expansion.
 *
 * Adds:
 *   - New fields to staff table (marital_status, religion, blood_group, etc.)
 *   - Child entities: education, work_experience, skills, languages, assets, bank_accounts
 *   - Completeness score tracking
 */
export class StaffBiodataExpansion1747540000000 implements MigrationInterface {
    name = 'StaffBiodataExpansion1747540000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ---- Add new columns to staff table ----
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_marital_status_enum" AS ENUM ('single', 'married', 'divorced', 'widowed', 'separated');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_religion_enum" AS ENUM ('christian', 'muslim', 'hindu', 'buddhist', 'other', 'prefer_not_to_say');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_blood_group_enum" AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "marital_status" "public"."staff_marital_status_enum"`);
        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "religion" "public"."staff_religion_enum"`);
        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "blood_group" "public"."staff_blood_group_enum"`);
        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "nationality" character varying`);
        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "place_of_birth" character varying`);
        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "passport_number" character varying`);
        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "passport_expiry" date`);
        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "has_disability" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "disability_details" text`);
        await queryRunner.query(`ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "completeness_score" integer`);

        // ---- Create staff_education table ----
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_education_level_enum" AS ENUM ('primary', 'secondary', 'certificate', 'diploma', 'bachelors', 'masters', 'phd', 'other');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            CREATE TABLE "staff_education" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "staff_id" uuid NOT NULL,
                "level" "public"."staff_education_level_enum" NOT NULL,
                "institution" character varying NOT NULL,
                "qualification" character varying NOT NULL,
                "field_of_study" character varying,
                "start_date" date,
                "end_date" date,
                "grade" character varying,
                "certificate_number" character varying,
                "document_url" character varying,
                "is_verified" boolean NOT NULL DEFAULT false,
                "verified_by" character varying,
                "verified_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_staff_education" PRIMARY KEY ("id"),
                CONSTRAINT "FK_staff_education_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_education_staff_level" ON "staff_education" ("staff_id", "level")`);

        // ---- Create staff_work_experience table ----
        await queryRunner.query(`
            CREATE TABLE "staff_work_experience" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "staff_id" uuid NOT NULL,
                "employer_name" character varying NOT NULL,
                "job_title" character varying NOT NULL,
                "department" character varying,
                "start_date" date NOT NULL,
                "end_date" date,
                "is_current" boolean NOT NULL DEFAULT false,
                "responsibilities" text,
                "reason_for_leaving" character varying,
                "contact_person" character varying,
                "contact_phone" character varying,
                "contact_email" character varying,
                "is_verified" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_staff_work_experience" PRIMARY KEY ("id"),
                CONSTRAINT "FK_staff_work_experience_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_work_experience_staff_date" ON "staff_work_experience" ("staff_id", "start_date")`);

        // ---- Create staff_skills table ----
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_skill_category_enum" AS ENUM ('technical', 'soft_skill', 'language', 'certification', 'tool', 'domain', 'other');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_skill_proficiency_enum" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            CREATE TABLE "staff_skills" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "staff_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "category" "public"."staff_skill_category_enum" NOT NULL DEFAULT 'technical',
                "proficiency" "public"."staff_skill_proficiency_enum" NOT NULL DEFAULT 'intermediate',
                "years_experience" integer,
                "certification_body" character varying,
                "date_acquired" date,
                "expiry_date" date,
                "certificate_number" character varying,
                "document_url" character varying,
                "notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_staff_skills" PRIMARY KEY ("id"),
                CONSTRAINT "FK_staff_skills_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_skills_staff_category" ON "staff_skills" ("staff_id", "category")`);

        // ---- Create staff_languages table ----
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_language_proficiency_enum" AS ENUM ('basic', 'conversational', 'working_proficiency', 'fluent', 'native');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            CREATE TABLE "staff_languages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "staff_id" uuid NOT NULL,
                "language" character varying NOT NULL,
                "proficiency" "public"."staff_language_proficiency_enum" NOT NULL,
                "is_primary" boolean NOT NULL DEFAULT false,
                "can_read" boolean NOT NULL DEFAULT false,
                "can_write" boolean NOT NULL DEFAULT false,
                "can_speak" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_staff_languages" PRIMARY KEY ("id"),
                CONSTRAINT "FK_staff_languages_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_languages_staff_primary" ON "staff_languages" ("staff_id", "is_primary")`);

        // ---- Create staff_assets table ----
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_asset_status_enum" AS ENUM ('assigned', 'returned', 'damaged', 'lost');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_asset_category_enum" AS ENUM ('electronics', 'furniture', 'vehicle', 'tool', 'uniform', 'access_card', 'other');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            CREATE TABLE "staff_assets" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "staff_id" uuid NOT NULL,
                "asset_name" character varying NOT NULL,
                "category" "public"."staff_asset_category_enum" NOT NULL,
                "asset_code" character varying,
                "serial_number" character varying,
                "model" character varying,
                "manufacturer" character varying,
                "value" numeric(12,2),
                "status" "public"."staff_asset_status_enum" NOT NULL DEFAULT 'assigned',
                "assigned_date" date NOT NULL,
                "expected_return_date" date,
                "returned_date" date,
                "condition_notes" text,
                "assigned_by" character varying,
                "returned_to" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_staff_assets" PRIMARY KEY ("id"),
                CONSTRAINT "FK_staff_assets_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_assets_staff_status" ON "staff_assets" ("staff_id", "status")`);

        // ---- Create staff_bank_accounts table ----
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_bank_account_type_enum" AS ENUM ('salary', 'reimbursement', 'bonus', 'other');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);
        await queryRunner.query(`
            CREATE TABLE "staff_bank_accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "staff_id" uuid NOT NULL,
                "bank_name" character varying NOT NULL,
                "bank_branch" character varying,
                "bank_code" character varying,
                "account_number" character varying NOT NULL,
                "account_name" character varying NOT NULL,
                "account_type" "public"."staff_bank_account_type_enum" NOT NULL DEFAULT 'salary',
                "is_primary" boolean NOT NULL DEFAULT true,
                "swift_code" text,
                "iban" text,
                "routing_number" text,
                "is_active" boolean NOT NULL DEFAULT true,
                "verified_by" character varying,
                "verified_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_staff_bank_accounts" PRIMARY KEY ("id"),
                CONSTRAINT "FK_staff_bank_accounts_staff" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_bank_accounts_staff_primary" ON "staff_bank_accounts" ("staff_id", "is_primary")`);
        await queryRunner.query(`CREATE INDEX "IDX_bank_accounts_staff_type" ON "staff_bank_accounts" ("staff_id", "account_type")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "staff_bank_accounts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "staff_assets"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "staff_languages"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "staff_skills"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "staff_work_experience"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "staff_education"`);

        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "completeness_score"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "disability_details"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "has_disability"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "passport_expiry"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "passport_number"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "place_of_birth"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "nationality"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "blood_group"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "religion"`);
        await queryRunner.query(`ALTER TABLE "staff" DROP COLUMN IF EXISTS "marital_status"`);

        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_bank_account_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_asset_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_asset_category_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_language_proficiency_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_skill_proficiency_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_skill_category_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_education_level_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_marital_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_religion_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_blood_group_enum"`);
    }
}
