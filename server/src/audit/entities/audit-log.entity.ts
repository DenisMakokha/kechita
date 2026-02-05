import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum AuditAction {
    CREATE = 'CREATE',
    READ = 'READ',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    APPROVE = 'APPROVE',
    REJECT = 'REJECT',
    SUBMIT = 'SUBMIT',
    EXPORT = 'EXPORT',
    UPLOAD = 'UPLOAD',
    DOWNLOAD = 'DOWNLOAD',
}

@Entity('audit_logs')
@Index(['entity_type', 'entity_id'])
@Index(['user_id'])
@Index(['created_at'])
@Index(['action'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    user_id: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ nullable: true })
    staff_id: string;

    @Column({
        type: 'enum',
        enum: AuditAction,
    })
    action: AuditAction;

    @Column()
    entity_type: string;

    @Column({ nullable: true })
    entity_id: string;

    @Column({ nullable: true })
    entity_name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    old_values: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    new_values: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @Column({ nullable: true })
    ip_address: string;

    @Column({ nullable: true })
    user_agent: string;

    @Column({ nullable: true })
    request_url: string;

    @Column({ nullable: true })
    request_method: string;

    @Column({ default: true })
    is_successful: boolean;

    @Column({ type: 'text', nullable: true })
    error_message: string;

    @CreateDateColumn()
    created_at: Date;
}
