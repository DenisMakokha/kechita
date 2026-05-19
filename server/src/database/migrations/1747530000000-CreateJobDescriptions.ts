import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 — Job Description management.
 *
 * Creates a versioned, structured JD table attached to Position. The legacy
 * `position.description` (free-text) is preserved as a fallback so existing
 * code paths continue to work; new code should prefer the active JD.
 */
export class CreateJobDescriptions1747530000000 implements MigrationInterface {
    name = 'CreateJobDescriptions1747530000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."job_descriptions_status_enum" AS ENUM ('draft', 'approved', 'retired');
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE "job_descriptions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "position_id" uuid NOT NULL,
                "version" integer NOT NULL,
                "is_active" boolean NOT NULL DEFAULT false,
                "status" "public"."job_descriptions_status_enum" NOT NULL DEFAULT 'draft',
                "effective_from" date,
                "purpose" text,
                "notes" text,
                "responsibilities" jsonb,
                "qualifications" jsonb,
                "skills" jsonb,
                "kpis" jsonb,
                "reports_to" character varying,
                "working_conditions" text,
                "supersedes_id" uuid,
                "template_id" uuid,
                "created_by" character varying,
                "approved_by" character varying,
                "approved_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_job_descriptions" PRIMARY KEY ("id"),
                CONSTRAINT "FK_jd_position" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_jd_position_active" ON "job_descriptions" ("position_id", "is_active")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_jd_position_version" ON "job_descriptions" ("position_id", "version")`);
        // Enforce "at most one active JD per position" at the DB level.
        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_jd_one_active_per_position"
            ON "job_descriptions" ("position_id") WHERE "is_active" = true
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_jd_one_active_per_position"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_jd_position_version"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jd_position_active"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "job_descriptions"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."job_descriptions_status_enum"`);
    }
}
