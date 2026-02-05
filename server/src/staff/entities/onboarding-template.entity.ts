import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Position } from '../../org/entities/position.entity';
import { Department } from '../../org/entities/department.entity';
import { OnboardingTask } from './onboarding-task.entity';

/**
 * OnboardingTemplate defines a checklist of tasks for new employee onboarding
 * Templates can be specific to positions/departments or general
 */
@Entity('onboarding_templates')
export class OnboardingTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    // Optional: Specific to a position
    @ManyToOne(() => Position, { nullable: true })
    @JoinColumn({ name: 'position_id' })
    position: Position;

    // Optional: Specific to a department
    @ManyToOne(() => Department, { nullable: true })
    @JoinColumn({ name: 'department_id' })
    department: Department;

    // If true, this is the default template when no specific one matches
    @Column({ default: false })
    is_default: boolean;

    @Column({ default: true })
    is_active: boolean;

    // Expected completion time in days
    @Column({ type: 'int', default: 30 })
    expected_days: number;

    @OneToMany(() => OnboardingTask, (task) => task.template, { cascade: true })
    tasks: OnboardingTask[];

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ nullable: true })
    created_by: string;
}
