import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TrainingProgram } from './entities/training-program.entity';
import { TrainingSession, SessionStatus } from './entities/training-session.entity';
import { TrainingEnrollment, EnrollmentStatus } from './entities/training-enrollment.entity';

@Injectable()
export class TrainingService {
    constructor(
        @InjectRepository(TrainingProgram) private programRepo: Repository<TrainingProgram>,
        @InjectRepository(TrainingSession) private sessionRepo: Repository<TrainingSession>,
        @InjectRepository(TrainingEnrollment) private enrollmentRepo: Repository<TrainingEnrollment>,
    ) {}

    // Programs
    listPrograms(activeOnly = false) {
        return this.programRepo.find({ where: activeOnly ? { is_active: true } : {}, order: { code: 'ASC' } });
    }
    async createProgram(data: Partial<TrainingProgram>) {
        if (data.code) {
            const exists = await this.programRepo.findOne({ where: { code: data.code } });
            if (exists) throw new ConflictException('Program code already exists');
        }
        return this.programRepo.save(this.programRepo.create(data));
    }
    async updateProgram(id: string, data: Partial<TrainingProgram>) {
        const p = await this.programRepo.findOne({ where: { id } });
        if (!p) throw new NotFoundException('Program not found');
        Object.assign(p, data);
        return this.programRepo.save(p);
    }
    async deleteProgram(id: string) {
        const r = await this.programRepo.delete(id);
        if (!r.affected) throw new NotFoundException('Program not found');
    }
    async getProgram(id: string) {
        const p = await this.programRepo.findOne({ where: { id }, relations: ['sessions'] });
        if (!p) throw new NotFoundException('Program not found');
        return p;
    }

    // Sessions
    listSessions(programId?: string) {
        return this.sessionRepo.find({ where: programId ? { program_id: programId } : {}, relations: ['program'], order: { start_date: 'DESC' } });
    }
    async createSession(data: Partial<TrainingSession> & { program_id: string }) {
        const program = await this.programRepo.findOne({ where: { id: data.program_id } });
        if (!program) throw new NotFoundException('Program not found');
        return this.sessionRepo.save(this.sessionRepo.create(data));
    }
    async updateSession(id: string, data: Partial<TrainingSession>) {
        const s = await this.sessionRepo.findOne({ where: { id } });
        if (!s) throw new NotFoundException('Session not found');
        Object.assign(s, data);
        return this.sessionRepo.save(s);
    }
    async getSession(id: string) {
        const s = await this.sessionRepo.findOne({ where: { id }, relations: ['program', 'enrollments', 'enrollments.staff'] });
        if (!s) throw new NotFoundException('Session not found');
        return s;
    }

    // Enrollments
    async enroll(sessionId: string, staffIds: string[]) {
        const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
        if (!session) throw new NotFoundException('Session not found');
        if (session.max_participants) {
            const existing = await this.enrollmentRepo.count({ where: { session_id: sessionId } });
            if (existing + staffIds.length > session.max_participants) throw new BadRequestException(`Exceeds max participants (${session.max_participants})`);
        }
        let created = 0;
        for (const sid of staffIds) {
            const exists = await this.enrollmentRepo.findOne({ where: { session_id: sessionId, staff_id: sid } });
            if (!exists) {
                await this.enrollmentRepo.save(this.enrollmentRepo.create({ session_id: sessionId, staff_id: sid, status: EnrollmentStatus.ENROLLED }));
                created++;
            }
        }
        return { created };
    }

    async updateEnrollment(id: string, data: Partial<TrainingEnrollment>) {
        const e = await this.enrollmentRepo.findOne({ where: { id }, relations: ['session', 'session.program'] });
        if (!e) throw new NotFoundException('Enrollment not found');
        Object.assign(e, data);
        // If completed and program issues certificate, set expiry
        if (data.status === EnrollmentStatus.COMPLETED && e.session?.program?.issues_certificate) {
            e.completed_at = e.completed_at || new Date().toISOString().slice(0, 10);
            e.certificate_issued_at = e.completed_at;
            if (e.session.program.certificate_validity_months) {
                const expiry = new Date(e.completed_at);
                expiry.setMonth(expiry.getMonth() + e.session.program.certificate_validity_months);
                e.certificate_expires_at = expiry.toISOString().slice(0, 10);
            }
        }
        return this.enrollmentRepo.save(e);
    }

    listStaffEnrollments(staffId: string) {
        return this.enrollmentRepo.find({ where: { staff_id: staffId }, relations: ['session', 'session.program'], order: { created_at: 'DESC' } });
    }

    listMyTrainings(staffId: string) {
        return this.listStaffEnrollments(staffId);
    }

    /** Get expiring certificates (within N days) for compliance tracking */
    async getExpiringCertificates(days = 60) {
        const today = new Date();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + days);
        const entries = await this.enrollmentRepo.createQueryBuilder('e')
            .leftJoinAndSelect('e.staff', 'staff')
            .leftJoinAndSelect('e.session', 'session')
            .leftJoinAndSelect('session.program', 'program')
            .where('e.certificate_expires_at IS NOT NULL')
            .andWhere('e.certificate_expires_at <= :cutoff', { cutoff: cutoff.toISOString().slice(0, 10) })
            .andWhere('e.status IN (:...statuses)', { statuses: [EnrollmentStatus.COMPLETED] })
            .orderBy('e.certificate_expires_at', 'ASC')
            .getMany();
        return entries;
    }

    async getStats() {
        const programs = await this.programRepo.count({ where: { is_active: true } });
        const upcomingSessions = await this.sessionRepo.count({ where: { status: SessionStatus.SCHEDULED } });
        const totalCompletions = await this.enrollmentRepo.count({ where: { status: EnrollmentStatus.COMPLETED } });
        const expiringSoon = await this.getExpiringCertificates(60);
        return { active_programs: programs, upcoming_sessions: upcomingSessions, total_completions: totalCompletions, expiring_certificates: expiringSoon.length };
    }
}
