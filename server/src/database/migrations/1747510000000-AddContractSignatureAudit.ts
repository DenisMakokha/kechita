import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 — Contracts v2:
 * Adds the signature + audit + template-link columns to staff_contracts.
 * All columns are nullable / have safe defaults so existing rows remain
 * usable while we transition off the hard-coded PDFKit layout.
 */
export class AddContractSignatureAudit1747510000000 implements MigrationInterface {
    name = 'AddContractSignatureAudit1747510000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "staff_contracts"
                ADD COLUMN IF NOT EXISTS "signature_image" text,
                ADD COLUMN IF NOT EXISTS "signed_ip" character varying,
                ADD COLUMN IF NOT EXISTS "signed_user_agent" text,
                ADD COLUMN IF NOT EXISTS "signature_token" character varying,
                ADD COLUMN IF NOT EXISTS "signature_token_expires_at" TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS "e_signature_provider" character varying NOT NULL DEFAULT 'internal',
                ADD COLUMN IF NOT EXISTS "provider_envelope_id" character varying,
                ADD COLUMN IF NOT EXISTS "template_id" uuid
        `);
        // Unique index on signature_token so two contracts can't share a magic link.
        // Use a partial index so multiple NULLs are allowed.
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "UQ_staff_contracts_signature_token"
            ON "staff_contracts" ("signature_token") WHERE "signature_token" IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "UQ_staff_contracts_signature_token"`);
        await queryRunner.query(`
            ALTER TABLE "staff_contracts"
                DROP COLUMN IF EXISTS "template_id",
                DROP COLUMN IF EXISTS "provider_envelope_id",
                DROP COLUMN IF EXISTS "e_signature_provider",
                DROP COLUMN IF EXISTS "signature_token_expires_at",
                DROP COLUMN IF EXISTS "signature_token",
                DROP COLUMN IF EXISTS "signed_user_agent",
                DROP COLUMN IF EXISTS "signed_ip",
                DROP COLUMN IF EXISTS "signature_image"
        `);
    }
}
