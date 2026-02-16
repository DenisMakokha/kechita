import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany, JoinTable, OneToOne, Index } from 'typeorm';
import { Role } from './role.entity';
import { Staff } from '../../staff/entities/staff.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ select: false })
    password_hash: string;

    @Index()
    @Column({ default: true })
    is_active: boolean;

    // Account lockout fields
    @Column({ default: 0 })
    failed_login_attempts: number;

    @Column({ type: 'timestamp', nullable: true })
    locked_until: Date;

    @Column({ type: 'timestamp', nullable: true })
    last_login_at: Date;

    // 2FA fields
    @Column({ default: false })
    two_factor_enabled: boolean;

    @Column({ nullable: true, select: false })
    two_factor_secret: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToMany(() => Role, (role) => role.users)
    @JoinTable({
        name: 'user_roles',
        joinColumn: { name: 'user_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
    })
    roles: Role[];

    // Inverse relation to Staff - will be populated when joined
    // Note: We use a lazy loading approach to avoid circular dependency
    @OneToOne(() => Staff, (staff) => staff.user)
    staff?: Staff;
}

