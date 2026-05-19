import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Staff } from './staff.entity';

export enum LanguageProficiency {
    BASIC = 'basic',
    CONVERSATIONAL = 'conversational',
    WORKING_PROFICIENCY = 'working_proficiency',
    FLUENT = 'fluent',
    NATIVE = 'native',
}

/**
 * Languages spoken by a staff member.
 */
@Entity('staff_languages')
@Index(['staff_id', 'is_primary'])
export class StaffLanguage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    staff_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column()
    language: string; // e.g., "English", "Swahili", "French"

    @Column({ type: 'enum', enum: LanguageProficiency })
    proficiency: LanguageProficiency;

    @Column({ default: false })
    is_primary: boolean; // mother tongue/native language

    @Column({ default: false })
    can_read: boolean;

    @Column({ default: false })
    can_write: boolean;

    @Column({ default: false })
    can_speak: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
