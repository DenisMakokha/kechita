import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2C — Contract addendums.
 *
 * Captures contract variations (salary change, role change, working hours,
 * etc.) without replacing the contract itself. Each addendum can be signed
 * independently via the same e-signature flow as the parent contract.
 */
export class CreateContractAddendums1747520000000 implements MigrationInterface {
    name = 'CreateContractAddendums1747520000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."staff_contract_addendums_status_enum" AS ENUM (
                    'draft', 'pending_signature', 'signed', 'void'
                );
            EXCEPTION WHEN duplicate_object THEN null; END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE "staff_contract_addendums" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "contract_id" uuid NOT NULL,
                "sequence" integer NOT NULL,
                "title" character varying NOT NULL,
                "body" text NOT NULL,
                "effective_date" date NOT NULL,
                "status" "public"."staff_contract_addendums_status_enum" NOT NULL DEFAULT 'draft',
                "signature_image" text,
                "signed_by_staff" character varying,
                "signed_date" TIMESTAMP WITH TIME ZONE,
                "signed_ip" character varying,
                "signed_user_agent" text,
                "signature_token" character varying,
                "signature_token_expires_at" TIMESTAMP WITH TIME ZONE,
                "created_by" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_staff_contract_addendums" PRIMARY KEY ("id"),
                CONSTRAINT "FK_staff_contract_addendums_contract"
                    FOREIGN KEY ("contract_id") REFERENCES "staff_contracts"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_addendum_contract" ON "staff_contract_addendums" ("contract_id", "effective_date")`);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_addendum_signature_token"
            ON "staff_contract_addendums" ("signature_token") WHERE "signature_token" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_addendum_signature_token"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_addendum_contract"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "staff_contract_addendums"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."staff_contract_addendums_status_enum"`);
    }
}
