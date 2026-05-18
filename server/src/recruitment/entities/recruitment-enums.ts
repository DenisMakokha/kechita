/**
 * Shared recruitment enums.
 *
 * These were originally declared inside `screening-criteria.entity.ts` and
 * imported by `job-post.entity.ts`, which also re-exports types referenced by
 * `screening-criteria.entity.ts`. The resulting circular import made `enum`
 * symbols evaluate to `undefined` when the entity glob loader (used by the
 * TypeORM CLI / migrations) loaded the files in a different order than the
 * Nest runtime, blowing up at decorator-evaluation time with errors like
 * `Cannot read properties of undefined (reading 'ANY')`.
 *
 * Pulling shared enums out into a leaf module breaks the cycle.
 */

export enum CriteriaType {
    EXPERIENCE_YEARS = 'experience_years',
    EDUCATION_LEVEL = 'education_level',
    SKILL_REQUIRED = 'skill_required',
    CERTIFICATION = 'certification',
    KEYWORD = 'keyword',
    LOCATION = 'location',
    SALARY_EXPECTATION = 'salary_expectation',
    AVAILABILITY = 'availability',
    WORK_AUTHORIZATION = 'work_authorization',
}

export enum EducationLevel {
    HIGH_SCHOOL = 'high_school',
    DIPLOMA = 'diploma',
    BACHELORS = 'bachelors',
    MASTERS = 'masters',
    PHD = 'phd',
    ANY = 'any',
}

export enum CriteriaImportance {
    KNOCKOUT = 'knockout',       // Must meet - auto-reject if not met
    REQUIRED = 'required',       // Strongly required - heavy score penalty if not met
    PREFERRED = 'preferred',     // Nice to have - bonus points if met
}
