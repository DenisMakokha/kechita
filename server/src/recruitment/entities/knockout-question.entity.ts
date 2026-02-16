import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { JobPost } from './job-post.entity';

export enum QuestionType {
    YES_NO = 'yes_no',
    SINGLE_CHOICE = 'single_choice',
    MULTIPLE_CHOICE = 'multiple_choice',
    TEXT = 'text',
    NUMBER = 'number',
    DATE = 'date',
}

@Entity('knockout_questions')
export class KnockoutQuestion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => JobPost, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'job_post_id' })
    jobPost: JobPost;

    @Column()
    question: string;

    @Column({ type: 'enum', enum: QuestionType, default: QuestionType.YES_NO })
    type: QuestionType;

    // For choice questions - JSON array of options
    @Column({ type: 'jsonb', nullable: true })
    options: string[];

    // The correct/acceptable answer(s) that pass screening
    // For yes_no: "yes" or "no"
    // For single_choice: the correct option
    // For multiple_choice: JSON array of acceptable options
    // For number: ">=5" or "<=10" or "5-10" (range)
    @Column()
    acceptable_answer: string;

    // If true, wrong answer = auto-reject
    @Column({ default: true })
    is_knockout: boolean;

    // Points for correct answer (if not knockout)
    @Column({ type: 'int', default: 10 })
    points: number;

    @Column({ default: true })
    is_required: boolean;

    @Column({ type: 'int', default: 0 })
    display_order: number;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
