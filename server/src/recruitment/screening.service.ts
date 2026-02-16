import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobPost } from './entities/job-post.entity';
import { Application, ApplicationStatus } from './entities/application.entity';
import { Candidate } from './entities/candidate.entity';
import { ScreeningCriteria, CriteriaType, CriteriaImportance, EducationLevel } from './entities/screening-criteria.entity';
import { KnockoutQuestion, QuestionType } from './entities/knockout-question.entity';
import { ScreeningResult, ScreeningStatus, ScoreBreakdown, KnockoutResult } from './entities/screening-result.entity';
import { PipelineStage } from './entities/pipeline-stage.entity';

const EDUCATION_HIERARCHY: Record<EducationLevel, number> = {
    [EducationLevel.ANY]: 0,
    [EducationLevel.HIGH_SCHOOL]: 1,
    [EducationLevel.DIPLOMA]: 2,
    [EducationLevel.BACHELORS]: 3,
    [EducationLevel.MASTERS]: 4,
    [EducationLevel.PHD]: 5,
};

@Injectable()
export class ScreeningService {
    constructor(
        @InjectRepository(JobPost)
        private jobPostRepo: Repository<JobPost>,
        @InjectRepository(Application)
        private applicationRepo: Repository<Application>,
        @InjectRepository(Candidate)
        private candidateRepo: Repository<Candidate>,
        @InjectRepository(ScreeningCriteria)
        private criteriaRepo: Repository<ScreeningCriteria>,
        @InjectRepository(KnockoutQuestion)
        private questionRepo: Repository<KnockoutQuestion>,
        @InjectRepository(ScreeningResult)
        private resultRepo: Repository<ScreeningResult>,
        @InjectRepository(PipelineStage)
        private stageRepo: Repository<PipelineStage>,
    ) {}

    // ==================== SCREENING CRITERIA MANAGEMENT ====================

    async addScreeningCriteria(jobPostId: string, data: Partial<ScreeningCriteria>): Promise<ScreeningCriteria> {
        const jobPost = await this.jobPostRepo.findOne({ where: { id: jobPostId } });
        if (!jobPost) throw new NotFoundException('Job post not found');

        const criteria = this.criteriaRepo.create({
            ...data,
            jobPost,
        });
        return this.criteriaRepo.save(criteria);
    }

    async getScreeningCriteria(jobPostId: string): Promise<ScreeningCriteria[]> {
        return this.criteriaRepo.find({
            where: { jobPost: { id: jobPostId }, is_active: true },
            order: { display_order: 'ASC' },
        });
    }

    async updateScreeningCriteria(id: string, data: Partial<ScreeningCriteria>): Promise<ScreeningCriteria> {
        const criteria = await this.criteriaRepo.findOne({ where: { id } });
        if (!criteria) throw new NotFoundException('Screening criteria not found');
        Object.assign(criteria, data);
        return this.criteriaRepo.save(criteria);
    }

    async deleteScreeningCriteria(id: string): Promise<void> {
        await this.criteriaRepo.delete(id);
    }

    // ==================== KNOCKOUT QUESTIONS MANAGEMENT ====================

    async addKnockoutQuestion(jobPostId: string, data: Partial<KnockoutQuestion>): Promise<KnockoutQuestion> {
        const jobPost = await this.jobPostRepo.findOne({ where: { id: jobPostId } });
        if (!jobPost) throw new NotFoundException('Job post not found');

        const question = this.questionRepo.create({
            ...data,
            jobPost,
        });
        return this.questionRepo.save(question);
    }

    async getKnockoutQuestions(jobPostId: string): Promise<KnockoutQuestion[]> {
        return this.questionRepo.find({
            where: { jobPost: { id: jobPostId }, is_active: true },
            order: { display_order: 'ASC' },
        });
    }

    async updateKnockoutQuestion(id: string, data: Partial<KnockoutQuestion>): Promise<KnockoutQuestion> {
        const question = await this.questionRepo.findOne({ where: { id } });
        if (!question) throw new NotFoundException('Knockout question not found');
        Object.assign(question, data);
        return this.questionRepo.save(question);
    }

    async deleteKnockoutQuestion(id: string): Promise<void> {
        await this.questionRepo.delete(id);
    }

    // ==================== MAIN SCREENING LOGIC ====================

    async screenApplication(
        applicationId: string,
        questionResponses?: Record<string, any>
    ): Promise<ScreeningResult> {
        const application = await this.applicationRepo.findOne({
            where: { id: applicationId },
            relations: ['candidate', 'jobPost'],
        });
        if (!application) throw new NotFoundException('Application not found');

        const { candidate, jobPost } = application;

        // Get screening criteria and questions for this job
        const criteria = await this.getScreeningCriteria(jobPost.id);
        const questions = await this.getKnockoutQuestions(jobPost.id);

        // Check for existing result
        let result = await this.resultRepo.findOne({
            where: { application: { id: applicationId } },
        });

        if (!result) {
            result = this.resultRepo.create({ application });
        }

        result.question_responses = questionResponses || {};

        // Run knockout checks first
        const knockoutReasons: KnockoutResult[] = [];

        // Check knockout criteria
        for (const c of criteria.filter(c => c.importance === CriteriaImportance.KNOCKOUT)) {
            const knockoutResult = this.checkKnockoutCriteria(c, candidate, jobPost);
            if (knockoutResult) {
                knockoutReasons.push(knockoutResult);
            }
        }

        // Check knockout questions
        if (questionResponses) {
            for (const q of questions.filter(q => q.is_knockout)) {
                const knockoutResult = this.checkKnockoutQuestion(q, questionResponses[q.id]);
                if (knockoutResult) {
                    knockoutReasons.push(knockoutResult);
                }
            }
        }

        // If any knockouts, fail immediately
        if (knockoutReasons.length > 0) {
            result.status = ScreeningStatus.FAILED;
            result.knockout_reasons = knockoutReasons;
            result.total_score = 0;
            result.percentage = 0;
            result.screened_at = new Date();
            result.notes = `Failed screening: ${knockoutReasons.map(k => k.reason).join('; ')}`;

            await this.resultRepo.save(result);

            // Auto-reject if configured
            if (jobPost.auto_reject_below_threshold) {
                await this.rejectApplication(application);
            }

            return result;
        }

        // Calculate comprehensive score
        const scoreBreakdown = this.calculateComprehensiveScore(
            candidate,
            jobPost,
            criteria,
            questions,
            questionResponses || {}
        );

        result.score_breakdown = scoreBreakdown;
        result.total_score = scoreBreakdown.total;
        result.max_score = scoreBreakdown.maxPossible;
        result.percentage = scoreBreakdown.percentage;
        result.screened_at = new Date();

        // Determine status based on score
        if (scoreBreakdown.percentage >= jobPost.min_screening_score) {
            result.status = ScreeningStatus.PASSED;

            // Auto-shortlist if above threshold
            if (scoreBreakdown.percentage >= jobPost.auto_shortlist_threshold) {
                await this.shortlistApplication(application);
                result.notes = 'Auto-shortlisted based on high screening score';
            } else {
                result.notes = 'Passed screening, awaiting manual review';
            }
        } else {
            result.status = ScreeningStatus.FAILED;
            result.notes = `Score ${scoreBreakdown.percentage.toFixed(1)}% below minimum ${jobPost.min_screening_score}%`;

            if (jobPost.auto_reject_below_threshold) {
                await this.rejectApplication(application);
            }
        }

        await this.resultRepo.save(result);

        // Update application match score
        application.match_score = scoreBreakdown.percentage;
        await this.applicationRepo.save(application);

        return result;
    }

    private checkKnockoutCriteria(
        criteria: ScreeningCriteria,
        candidate: Candidate,
        jobPost: JobPost
    ): KnockoutResult | null {
        switch (criteria.type) {
            case CriteriaType.EXPERIENCE_YEARS: {
                const minYears = parseInt(criteria.value);
                if (candidate.years_of_experience < minYears) {
                    return {
                        criteriaId: criteria.id,
                        type: 'criteria',
                        name: criteria.name,
                        reason: `Minimum ${minYears} years experience required`,
                        candidateValue: `${candidate.years_of_experience || 0} years`,
                        requiredValue: `${minYears} years`,
                    };
                }
                break;
            }

            case CriteriaType.EDUCATION_LEVEL: {
                const requiredLevel = criteria.value as EducationLevel;
                const candidateLevel = candidate.education_level || EducationLevel.ANY;
                if (EDUCATION_HIERARCHY[candidateLevel] < EDUCATION_HIERARCHY[requiredLevel]) {
                    return {
                        criteriaId: criteria.id,
                        type: 'criteria',
                        name: criteria.name,
                        reason: `Minimum education level ${requiredLevel} required`,
                        candidateValue: candidateLevel,
                        requiredValue: requiredLevel,
                    };
                }
                break;
            }

            case CriteriaType.SKILL_REQUIRED: {
                const requiredSkill = criteria.value.toLowerCase();
                const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
                const hasSkill = candidateSkills.some(s => 
                    s.includes(requiredSkill) || requiredSkill.includes(s)
                );
                if (!hasSkill) {
                    return {
                        criteriaId: criteria.id,
                        type: 'criteria',
                        name: criteria.name,
                        reason: `Required skill "${criteria.value}" not found`,
                        candidateValue: candidateSkills.join(', ') || 'None listed',
                        requiredValue: criteria.value,
                    };
                }
                break;
            }

            case CriteriaType.CERTIFICATION: {
                const requiredCert = criteria.value.toLowerCase();
                const candidateCerts = (candidate.certifications || []).map((c: string) => c.toLowerCase());
                const hasCert = candidateCerts.some((c: string) => 
                    c.includes(requiredCert) || requiredCert.includes(c)
                );
                if (!hasCert) {
                    return {
                        criteriaId: criteria.id,
                        type: 'criteria',
                        name: criteria.name,
                        reason: `Required certification "${criteria.value}" not found`,
                        candidateValue: candidateCerts.join(', ') || 'None listed',
                        requiredValue: criteria.value,
                    };
                }
                break;
            }

            case CriteriaType.WORK_AUTHORIZATION: {
                if (!candidate.work_authorization || candidate.work_authorization !== criteria.value) {
                    return {
                        criteriaId: criteria.id,
                        type: 'criteria',
                        name: criteria.name,
                        reason: `Work authorization "${criteria.value}" required`,
                        candidateValue: candidate.work_authorization || 'Not specified',
                        requiredValue: criteria.value,
                    };
                }
                break;
            }

            case CriteriaType.SALARY_EXPECTATION: {
                const [min, max] = criteria.value.split('-').map(Number);
                const expected = candidate.expected_salary;
                if (expected && max && expected > max) {
                    return {
                        criteriaId: criteria.id,
                        type: 'criteria',
                        name: criteria.name,
                        reason: `Salary expectation exceeds budget`,
                        candidateValue: `${expected}`,
                        requiredValue: `Max ${max}`,
                    };
                }
                break;
            }
        }

        return null;
    }

    private checkKnockoutQuestion(
        question: KnockoutQuestion,
        response: any
    ): KnockoutResult | null {
        if (response === undefined || response === null) {
            if (question.is_required) {
                return {
                    questionId: question.id,
                    type: 'question',
                    name: question.question,
                    reason: 'Required question not answered',
                    candidateValue: 'No response',
                    requiredValue: question.acceptable_answer,
                };
            }
            return null;
        }

        const responseStr = String(response).toLowerCase().trim();
        const acceptableStr = question.acceptable_answer.toLowerCase().trim();

        let passed = false;

        switch (question.type) {
            case QuestionType.YES_NO:
                passed = responseStr === acceptableStr;
                break;

            case QuestionType.SINGLE_CHOICE:
                passed = responseStr === acceptableStr;
                break;

            case QuestionType.MULTIPLE_CHOICE: {
                const acceptableOptions = JSON.parse(question.acceptable_answer).map((o: string) => o.toLowerCase());
                const selectedOptions = Array.isArray(response) 
                    ? response.map(o => o.toLowerCase()) 
                    : [responseStr];
                passed = selectedOptions.every(o => acceptableOptions.includes(o));
                break;
            }

            case QuestionType.NUMBER: {
                const num = parseFloat(responseStr);
                if (acceptableStr.startsWith('>=')) {
                    passed = num >= parseFloat(acceptableStr.slice(2));
                } else if (acceptableStr.startsWith('<=')) {
                    passed = num <= parseFloat(acceptableStr.slice(2));
                } else if (acceptableStr.includes('-')) {
                    const [min, max] = acceptableStr.split('-').map(Number);
                    passed = num >= min && num <= max;
                } else {
                    passed = num === parseFloat(acceptableStr);
                }
                break;
            }

            case QuestionType.TEXT:
                // Text questions are typically not knockout, but if they are,
                // check if response contains required keywords
                const keywords = acceptableStr.split(',').map(k => k.trim());
                passed = keywords.some(k => responseStr.includes(k));
                break;
        }

        if (!passed && question.is_knockout) {
            return {
                questionId: question.id,
                type: 'question',
                name: question.question,
                reason: 'Answer does not meet requirements',
                candidateValue: String(response),
                requiredValue: question.acceptable_answer,
            };
        }

        return null;
    }

    private calculateComprehensiveScore(
        candidate: Candidate,
        jobPost: JobPost,
        criteria: ScreeningCriteria[],
        questions: KnockoutQuestion[],
        questionResponses: Record<string, any>
    ): ScoreBreakdown {
        const weights = {
            experience: jobPost.weight_experience || 30,
            education: jobPost.weight_education || 15,
            skills: jobPost.weight_skills || 30,
            certifications: jobPost.weight_certifications || 10,
            keywords: jobPost.weight_keywords || 15,
        };

        // Experience Score
        let experienceScore = 0;
        let experienceDetails = '';
        if (jobPost.min_experience_years) {
            const candidateExp = candidate.years_of_experience || 0;
            if (candidateExp >= jobPost.min_experience_years) {
                experienceScore = weights.experience;
                experienceDetails = `${candidateExp} years meets requirement of ${jobPost.min_experience_years}`;
            } else {
                const ratio = candidateExp / jobPost.min_experience_years;
                experienceScore = Math.round(weights.experience * ratio);
                experienceDetails = `${candidateExp} years vs required ${jobPost.min_experience_years}`;
            }
        } else {
            experienceScore = weights.experience * 0.5; // Neutral if no requirement
            experienceDetails = 'No experience requirement specified';
        }

        // Education Score
        let educationScore = 0;
        let educationDetails = '';
        const candidateEdu = candidate.education_level || EducationLevel.ANY;
        const requiredEdu = jobPost.min_education_level || EducationLevel.ANY;
        if (requiredEdu === EducationLevel.ANY) {
            educationScore = weights.education;
            educationDetails = 'No education requirement';
        } else if (EDUCATION_HIERARCHY[candidateEdu] >= EDUCATION_HIERARCHY[requiredEdu]) {
            educationScore = weights.education;
            educationDetails = `${candidateEdu} meets requirement of ${requiredEdu}`;
        } else {
            const ratio = EDUCATION_HIERARCHY[candidateEdu] / EDUCATION_HIERARCHY[requiredEdu];
            educationScore = Math.round(weights.education * ratio);
            educationDetails = `${candidateEdu} below requirement of ${requiredEdu}`;
        }

        // Skills Score
        let skillsScore = 0;
        const matchedSkills: string[] = [];
        const missingSkills: string[] = [];
        const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase());
        const requiredSkills = jobPost.required_skills || [];

        if (requiredSkills.length > 0) {
            for (const skill of requiredSkills) {
                const skillLower = skill.toLowerCase();
                const hasSkill = candidateSkills.some(cs => 
                    cs.includes(skillLower) || skillLower.includes(cs)
                );
                if (hasSkill) {
                    matchedSkills.push(skill);
                } else {
                    missingSkills.push(skill);
                }
            }
            const matchRatio = matchedSkills.length / requiredSkills.length;
            skillsScore = Math.round(weights.skills * matchRatio);
        } else {
            skillsScore = weights.skills * 0.5;
        }

        // Certifications Score
        let certificationsScore = 0;
        const matchedCerts: string[] = [];
        const missingCerts: string[] = [];
        const candidateCerts = (candidate.certifications || []).map((c: string) => c.toLowerCase());
        const requiredCerts = jobPost.required_certifications || [];

        if (requiredCerts.length > 0) {
            for (const cert of requiredCerts) {
                const certLower = cert.toLowerCase();
                const hasCert = candidateCerts.some((cc: string) => 
                    cc.includes(certLower) || certLower.includes(cc)
                );
                if (hasCert) {
                    matchedCerts.push(cert);
                } else {
                    missingCerts.push(cert);
                }
            }
            const matchRatio = matchedCerts.length / requiredCerts.length;
            certificationsScore = Math.round(weights.certifications * matchRatio);
        } else {
            certificationsScore = weights.certifications; // Full score if no certs required
        }

        // Keywords Score
        let keywordsScore = 0;
        const matchedKeywords: string[] = [];
        const screeningKeywords = jobPost.screening_keywords || [];
        const searchableText = [
            candidate.resume_text || '',
            candidate.cover_letter_url || '',
            ...(candidate.skills || []),
            candidate.current_title || '',
            candidate.current_company || '',
        ].join(' ').toLowerCase();

        if (screeningKeywords.length > 0) {
            for (const keyword of screeningKeywords) {
                if (searchableText.includes(keyword.toLowerCase())) {
                    matchedKeywords.push(keyword);
                }
            }
            const matchRatio = matchedKeywords.length / screeningKeywords.length;
            keywordsScore = Math.round(weights.keywords * matchRatio);
        } else {
            keywordsScore = weights.keywords; // Full score if no keywords specified
        }

        // Questions Score (from non-knockout questions)
        let questionsScore = 0;
        let questionsMax = 0;
        let correctAnswers = 0;
        const nonKnockoutQuestions = questions.filter(q => !q.is_knockout);

        for (const q of nonKnockoutQuestions) {
            questionsMax += q.points;
            const response = questionResponses[q.id];
            if (response !== undefined) {
                const passed = !this.checkKnockoutQuestion(q, response);
                if (passed) {
                    questionsScore += q.points;
                    correctAnswers++;
                }
            }
        }

        // Calculate totals
        const total = experienceScore + educationScore + skillsScore + 
                      certificationsScore + keywordsScore + questionsScore;
        const maxPossible = weights.experience + weights.education + weights.skills + 
                           weights.certifications + weights.keywords + questionsMax;

        return {
            experience: { score: experienceScore, max: weights.experience, details: experienceDetails },
            education: { score: educationScore, max: weights.education, details: educationDetails },
            skills: { score: skillsScore, max: weights.skills, matched: matchedSkills, missing: missingSkills },
            certifications: { score: certificationsScore, max: weights.certifications, matched: matchedCerts, missing: missingCerts },
            keywords: { score: keywordsScore, max: weights.keywords, matched: matchedKeywords },
            questions: { score: questionsScore, max: questionsMax, correct: correctAnswers, total: nonKnockoutQuestions.length },
            salary: { score: 0, max: 0, details: '' }, // Salary is typically knockout, not scored
            total,
            maxPossible,
            percentage: maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0,
        };
    }

    private async rejectApplication(application: Application): Promise<void> {
        const rejectedStage = await this.stageRepo.findOne({ where: { code: 'REJECTED' } });
        if (rejectedStage) {
            application.stage = rejectedStage;
        }
        application.status = ApplicationStatus.REJECTED;
        application.rejected_at = new Date();
        await this.applicationRepo.save(application);
    }

    private async shortlistApplication(application: Application): Promise<void> {
        const screeningStage = await this.stageRepo.findOne({ where: { code: 'SCREENING' } });
        if (screeningStage) {
            application.stage = screeningStage;
        }
        application.screened_at = new Date();
        await this.applicationRepo.save(application);
    }

    // ==================== SCREENING RESULT QUERIES ====================

    async getScreeningResult(applicationId: string): Promise<ScreeningResult | null> {
        return this.resultRepo.findOne({
            where: { application: { id: applicationId } },
            relations: ['application', 'application.candidate', 'application.jobPost'],
        });
    }

    async getScreeningResults(jobPostId: string, status?: ScreeningStatus): Promise<ScreeningResult[]> {
        const qb = this.resultRepo.createQueryBuilder('result')
            .leftJoinAndSelect('result.application', 'application')
            .leftJoinAndSelect('application.candidate', 'candidate')
            .leftJoinAndSelect('application.jobPost', 'jobPost')
            .where('jobPost.id = :jobPostId', { jobPostId });

        if (status) {
            qb.andWhere('result.status = :status', { status });
        }

        return qb.orderBy('result.percentage', 'DESC').getMany();
    }

    async overrideScreeningResult(
        resultId: string,
        newStatus: ScreeningStatus,
        reason: string
    ): Promise<ScreeningResult> {
        const result = await this.resultRepo.findOne({ where: { id: resultId } });
        if (!result) throw new NotFoundException('Screening result not found');

        result.status = newStatus;
        result.is_manual_override = true;
        result.override_reason = reason;

        return this.resultRepo.save(result);
    }

    // Bulk screen all pending applications for a job
    async screenAllApplications(jobPostId: string): Promise<{ screened: number; passed: number; failed: number }> {
        const applications = await this.applicationRepo.find({
            where: { jobPost: { id: jobPostId } },
            relations: ['candidate'],
        });

        let screened = 0;
        let passed = 0;
        let failed = 0;

        for (const app of applications) {
            const existingResult = await this.resultRepo.findOne({
                where: { application: { id: app.id } },
            });

            if (!existingResult || existingResult.status === ScreeningStatus.PENDING) {
                const result = await this.screenApplication(app.id);
                screened++;
                if (result.status === ScreeningStatus.PASSED) {
                    passed++;
                } else if (result.status === ScreeningStatus.FAILED) {
                    failed++;
                }
            }
        }

        return { screened, passed, failed };
    }
}
