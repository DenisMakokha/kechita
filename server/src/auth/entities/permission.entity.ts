import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string; // e.g. 'staff.create', 'leave.approve', 'loans.disburse'

    @Column()
    name: string; // Human-readable: 'Create Staff'

    @Column()
    module: string; // Grouping: 'staff', 'leave', 'loans', 'claims', etc.

    @Column()
    action: string; // 'create', 'read', 'update', 'delete', 'approve', 'export'

    @Column({ type: 'text', nullable: true })
    description?: string;

    @CreateDateColumn()
    created_at: Date;

    @ManyToMany(() => Role, (role) => role.permissions)
    roles: Role[];
}
