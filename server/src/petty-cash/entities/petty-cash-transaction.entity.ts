import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { PettyCashFloat } from './petty-cash-float.entity';
import { Staff } from '../../staff/entities/staff.entity';

export enum TransactionType {
    EXPENSE = 'expense',
    REPLENISHMENT = 'replenishment',
    ADJUSTMENT = 'adjustment',
    OPENING_BALANCE = 'opening_balance',
    CASH_COUNT = 'cash_count',
}

export enum ExpenseCategory {
    OFFICE_SUPPLIES = 'office_supplies',
    CLEANING = 'cleaning',
    TRANSPORT = 'transport',
    FUEL = 'fuel',
    MEALS_TEA = 'meals_tea',
    REPAIRS_MAINTENANCE = 'repairs_maintenance',
    UTILITIES = 'utilities',
    POSTAGE = 'postage',
    PRINTING = 'printing',
    SECURITY = 'security',
    COMMUNICATION = 'communication',
    BANK_CHARGES = 'bank_charges',
    ENTERTAINMENT = 'entertainment',
    MEDICAL_FIRST_AID = 'medical_first_aid',
    STATIONERY = 'stationery',
    COMPUTER_ACCESSORIES = 'computer_accessories',
    NEWSPAPERS = 'newspapers',
    WATER = 'water',
    ELECTRICITY = 'electricity',
    PARKING = 'parking',
    COURIER = 'courier',
    MISCELLANEOUS = 'miscellaneous',
    OTHER = 'other',
}

export enum TransactionStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CANCELLED = 'cancelled',
}

@Entity('petty_cash_transactions')
export class PettyCashTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    transaction_number: string;

    @Index()
    @ManyToOne(() => PettyCashFloat, { eager: true })
    @JoinColumn({ name: 'float_id' })
    float: PettyCashFloat;

    @Column({ type: 'enum', enum: TransactionType })
    type: TransactionType;

    @Column({ type: 'enum', enum: ExpenseCategory, nullable: true })
    category: ExpenseCategory;

    @Column()
    description: string;

    @Column('decimal', { precision: 12, scale: 2 })
    amount: number;

    @Column('decimal', { precision: 12, scale: 2 })
    balance_before: number;

    @Column('decimal', { precision: 12, scale: 2 })
    balance_after: number;

    @Column({ type: 'date' })
    transaction_date: Date;

    @Column({ nullable: true })
    receipt_number: string;

    @Column({ nullable: true })
    vendor_name: string;

    @Column({ type: 'uuid', nullable: true })
    document_id: string; // Receipt attachment

    @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
    status: TransactionStatus;

    @ManyToOne(() => Staff, { eager: true })
    @JoinColumn({ name: 'created_by_id' })
    createdBy: Staff;

    @ManyToOne(() => Staff, { nullable: true })
    @JoinColumn({ name: 'approved_by_id' })
    approvedBy: Staff;

    @Column({ type: 'timestamp', nullable: true })
    approved_at: Date;

    @Column({ type: 'text', nullable: true })
    approval_comment: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Index()
    @CreateDateColumn()
    created_at: Date;
}
