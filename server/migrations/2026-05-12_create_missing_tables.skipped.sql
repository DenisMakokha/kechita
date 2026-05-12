-- Queries TypeORM wanted to run but which touch EXISTING tables.
-- These are NOT safe to auto-apply; review each one manually.

-- ALTER TABLE "pipeline_stages" DROP COLUMN "order_index";
-- ALTER TYPE "public"."audit_logs_action_enum" RENAME TO "audit_logs_action_enum_old";
-- CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'APPROVE', 'REJECT', 'SUBMIT', 'EXPORT', 'UPLOAD', 'DOWNLOAD', 'PASSWORD_CHANGE', 'PASSWORD_RESET', 'ROLE_ASSIGN', 'PERMISSION_CHANGE', 'ACTIVATE', 'DEACTIVATE', 'ACCESS_DENIED', 'SUSPICIOUS_ACTIVITY');
-- ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "public"."audit_logs_action_enum" USING "action"::"text"::"public"."audit_logs_action_enum";
-- DROP TYPE "public"."audit_logs_action_enum_old";