import {
    Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
    CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Staff } from './staff.entity';

export enum BankAccountType {
    SALARY = 'salary',
    REIMBURSEMENT = 'reimbursement',
    BONUS = 'bonus',
    OTHER = 'other',
}

/**
 * Multiple bank accounts per staff member.
 * Replaces the single bank fields on Staff entity.
 */
@Entity('staff_bank_accounts')
@Index(['staff_id', 'is_primary'])
@Index(['staff_id', 'account_type'])
export class StaffBankAccount {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    staff_id: string;

    @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'staff_id' })
    staff: Staff;

    @Column()
    bank_name: string;

    @Column({ nullable: true })
    bank_branch?: string;

    @Column()
    bank_code?: string; // e.g., "01" for KCB

    @Column()
    account_number: string;

    @Column()
    account_name: string; // name as it appears in bank records

    @Column({ type: 'enum', enum: BankAccountType, default: BankAccountType.SALARY })
    account_type: BankAccountType;

    @Column({ default: true })
    is_primary: boolean; // default account for salary

    @Column({ type: 'text', nullable: true })
    swift_code?: string; // for international transfers

    @Column({ type: 'text', nullable: true })
    iban?: string;

    @Column({ type: 'text', nullable: true })
    routing_number?: string;

    @Column({ default: false })
    is_active: boolean;

    @Column({ nullable: true })
    verified_by?: string;

    @Column({ type: 'timestamptz', nullable: true })
    verified_at?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
