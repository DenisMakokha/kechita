-- Fix gender-specific leave balances
-- 1. Ensure MATERNITY/PATERNITY leave types have applicable_gender set
UPDATE leave_types SET applicable_gender = 'female' WHERE code = 'MATERNITY' AND (applicable_gender IS NULL OR applicable_gender = '');
UPDATE leave_types SET applicable_gender = 'male'   WHERE code = 'PATERNITY' AND (applicable_gender IS NULL OR applicable_gender = '');

-- 2. Delete balance records that violate gender rules
DELETE FROM leave_balances lb
USING leave_types lt, staff s
WHERE lb.leave_type_id = lt.id
  AND lb.staff_id = s.id
  AND lt.applicable_gender IS NOT NULL
  AND lt.applicable_gender <> ''
  AND s.gender::text IS DISTINCT FROM lt.applicable_gender;
