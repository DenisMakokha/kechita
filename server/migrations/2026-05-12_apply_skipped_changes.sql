-- Companion to 2026-05-12_create_missing_tables.skipped.sql.
-- These touch existing tables, so they were parked for a separate apply.
--
-- 1. Drop orphan column pipeline_stages.order_index (entity uses
--    `position`; order_index is residue from an earlier migration and
--    nothing reads it).
-- 2. Extend audit_logs_action_enum to include the new values
--    ACCESS_DENIED and SUSPICIOUS_ACTIVITY that the AuditAction enum
--    declares. Without this, attempting to write an audit log with one
--    of those values raises invalid_text_representation.

BEGIN;

ALTER TABLE "pipeline_stages" DROP COLUMN IF EXISTS "order_index";

ALTER TYPE "public"."audit_logs_action_enum" RENAME TO "audit_logs_action_enum_old";
CREATE TYPE "public"."audit_logs_action_enum" AS ENUM(
    'CREATE','READ','UPDATE','DELETE',
    'LOGIN','LOGOUT','LOGIN_FAILED',
    'APPROVE','REJECT','SUBMIT',
    'EXPORT','UPLOAD','DOWNLOAD',
    'PASSWORD_CHANGE','PASSWORD_RESET',
    'ROLE_ASSIGN','PERMISSION_CHANGE',
    'ACTIVATE','DEACTIVATE',
    'ACCESS_DENIED','SUSPICIOUS_ACTIVITY'
);
ALTER TABLE "audit_logs"
    ALTER COLUMN "action" TYPE "public"."audit_logs_action_enum"
    USING "action"::text::"public"."audit_logs_action_enum";
DROP TYPE "public"."audit_logs_action_enum_old";

COMMIT;
