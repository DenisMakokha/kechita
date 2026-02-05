import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { PettyCashFloat, FloatTier, FLOAT_TIER_LIMITS } from './entities/petty-cash-float.entity';
import { PettyCashTransaction, TransactionType, ExpenseCategory, TransactionStatus } from './entities/petty-cash-transaction.entity';
import { PettyCashReplenishment, ReplenishmentStatus } from './entities/petty-cash-replenishment.entity';
import { PettyCashReconciliation, ReconciliationStatus } from './entities/petty-cash-reconciliation.entity';
import { Branch } from '../org/entities/branch.entity';
import { Staff } from '../staff/entities/staff.entity';
import { generateRef } from '../common/id-utils';

// ==================== DTOs ====================

export interface CreateFloatDto {
    branch_id: string;
    tier: FloatTier;
    custodian_id?: string;
    initial_balance?: number;
    minimum_threshold?: number;
}

export interface RecordExpenseDto {
    float_id: string;
    category: ExpenseCategory;
    description: string;
    amount: number;
    transaction_date: string;
    receipt_number?: string;
    vendor_name?: string;
    document_id?: string;
    notes?: string;
}

export interface RequestReplenishmentDto {
    float_id: string;
    amount_requested: number;
    justification?: string;
    supporting_document_ids?: string[];
}

export interface CashCountDto {
    float_id: string;
    physical_count: number;
    denomination_breakdown?: {
        notes_1000?: number;
        notes_500?: number;
        notes_200?: number;
        notes_100?: number;
        notes_50?: number;
        coins_40?: number;
        coins_20?: number;
        coins_10?: number;
        coins_5?: number;
        coins_1?: number;
    };
    variance_explanation?: string;
}

@Injectable()
export class PettyCashService {
    constructor(
        @InjectRepository(PettyCashFloat)
        private floatRepo: Repository<PettyCashFloat>,
        @InjectRepository(PettyCashTransaction)
        private transactionRepo: Repository<PettyCashTransaction>,
        @InjectRepository(PettyCashReplenishment)
        private replenishmentRepo: Repository<PettyCashReplenishment>,
        @InjectRepository(PettyCashReconciliation)
        private reconciliationRepo: Repository<PettyCashReconciliation>,
    ) { }

    // ==================== FLOAT MANAGEMENT ====================

    async createFloat(data: CreateFloatDto, createdById?: string): Promise<PettyCashFloat> {
        const existingFloat = await this.floatRepo.findOne({
            where: { branch: { id: data.branch_id } },
        });
        if (existingFloat) {
            throw new BadRequestException('A float already exists for this branch');
        }

        const maxLimit = FLOAT_TIER_LIMITS[data.tier];
        const initialBalance = data.initial_balance || 0;

        if (initialBalance > maxLimit) {
            throw new BadRequestException(`Initial balance cannot exceed tier limit of ${maxLimit}`);
        }

        const float = this.floatRepo.create({
            branch: { id: data.branch_id } as Branch,
            tier: data.tier,
            maximum_limit: maxLimit,
            minimum_threshold: data.minimum_threshold || maxLimit * 0.2, // 20% default threshold
            current_balance: initialBalance,
            custodian: data.custodian_id ? { id: data.custodian_id } as Staff : undefined,
        });

        const saved = await this.floatRepo.save(float);

        // Record opening balance transaction
        if (initialBalance > 0) {
            await this.recordTransaction({
                float_id: saved.id,
                type: TransactionType.OPENING_BALANCE,
                description: 'Opening balance',
                amount: initialBalance,
                balance_before: 0,
                balance_after: initialBalance,
                transaction_date: new Date(),
                status: TransactionStatus.APPROVED,
                created_by_id: createdById,
            });
        }

        return this.getFloat(saved.id);
    }

    async getFloat(id: string): Promise<PettyCashFloat> {
        const float = await this.floatRepo.findOne({
            where: { id },
            relations: ['branch', 'custodian'],
        });
        if (!float) throw new NotFoundException('Float not found');
        return float;
    }

    async getFloatsByBranch(branchId: string): Promise<PettyCashFloat | null> {
        return this.floatRepo.findOne({
            where: { branch: { id: branchId } },
            relations: ['branch', 'custodian'],
        });
    }

    async getAllFloats(): Promise<PettyCashFloat[]> {
        return this.floatRepo.find({
            relations: ['branch', 'custodian'],
            order: { branch: { name: 'ASC' } },
        });
    }

    async getFloatsNeedingReplenishment(): Promise<PettyCashFloat[]> {
        const floats = await this.floatRepo.find({
            where: { is_active: true },
            relations: ['branch', 'custodian'],
        });
        return floats.filter(f => f.needs_replenishment);
    }

    async updateFloatCustodian(floatId: string, custodianId: string): Promise<PettyCashFloat> {
        await this.floatRepo.update(floatId, {
            custodian: { id: custodianId } as Staff,
        });
        return this.getFloat(floatId);
    }

    // ==================== TRANSACTIONS ====================

    private async recordTransaction(data: {
        float_id: string;
        type: TransactionType;
        description: string;
        amount: number;
        balance_before: number;
        balance_after: number;
        transaction_date: Date;
        status: TransactionStatus;
        created_by_id?: string;
        category?: ExpenseCategory;
        receipt_number?: string;
        vendor_name?: string;
        document_id?: string;
        notes?: string;
    }): Promise<PettyCashTransaction> {
        const txnNumber = generateRef('PCT', { digits: 6 });

        const transaction = this.transactionRepo.create({
            transaction_number: txnNumber,
            float: { id: data.float_id } as PettyCashFloat,
            type: data.type,
            category: data.category,
            description: data.description,
            amount: data.amount,
            balance_before: data.balance_before,
            balance_after: data.balance_after,
            transaction_date: data.transaction_date,
            status: data.status,
            createdBy: data.created_by_id ? { id: data.created_by_id } as Staff : undefined,
            receipt_number: data.receipt_number,
            vendor_name: data.vendor_name,
            document_id: data.document_id,
            notes: data.notes,
        });

        return this.transactionRepo.save(transaction);
    }

    async recordExpense(data: RecordExpenseDto, createdById: string): Promise<PettyCashTransaction> {
        const float = await this.getFloat(data.float_id);

        if (data.amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        if (data.amount > Number(float.current_balance)) {
            throw new BadRequestException(`Insufficient balance. Available: ${float.current_balance}`);
        }

        const balanceBefore = Number(float.current_balance);
        const balanceAfter = balanceBefore - data.amount;

        // Update float balance
        await this.floatRepo.update(float.id, { current_balance: balanceAfter });

        // Record transaction
        return this.recordTransaction({
            float_id: float.id,
            type: TransactionType.EXPENSE,
            category: data.category,
            description: data.description,
            amount: data.amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            transaction_date: new Date(data.transaction_date),
            status: TransactionStatus.APPROVED,
            created_by_id: createdById,
            receipt_number: data.receipt_number,
            vendor_name: data.vendor_name,
            document_id: data.document_id,
            notes: data.notes,
        });
    }

    async getTransactions(filters: {
        float_id?: string;
        type?: TransactionType;
        category?: ExpenseCategory;
        start_date?: string;
        end_date?: string;
        status?: TransactionStatus;
    }): Promise<PettyCashTransaction[]> {
        const qb = this.transactionRepo.createQueryBuilder('t')
            .leftJoinAndSelect('t.float', 'float')
            .leftJoinAndSelect('float.branch', 'branch')
            .leftJoinAndSelect('t.createdBy', 'createdBy')
            .leftJoinAndSelect('t.approvedBy', 'approvedBy');

        if (filters.float_id) {
            qb.andWhere('float.id = :floatId', { floatId: filters.float_id });
        }
        if (filters.type) {
            qb.andWhere('t.type = :type', { type: filters.type });
        }
        if (filters.category) {
            qb.andWhere('t.category = :category', { category: filters.category });
        }
        if (filters.status) {
            qb.andWhere('t.status = :status', { status: filters.status });
        }
        if (filters.start_date && filters.end_date) {
            qb.andWhere('t.transaction_date BETWEEN :start AND :end', {
                start: filters.start_date,
                end: filters.end_date,
            });
        }

        return qb.orderBy('t.created_at', 'DESC').getMany();
    }

    async getLedger(floatId: string, startDate?: string, endDate?: string): Promise<{
        opening_balance: number;
        closing_balance: number;
        total_expenses: number;
        total_replenishments: number;
        transactions: PettyCashTransaction[];
    }> {
        const float = await this.getFloat(floatId);

        const txnQuery = this.transactionRepo.createQueryBuilder('t')
            .where('t.float_id = :floatId', { floatId })
            .andWhere('t.status = :status', { status: TransactionStatus.APPROVED });

        if (startDate && endDate) {
            txnQuery.andWhere('t.transaction_date BETWEEN :start AND :end', {
                start: startDate,
                end: endDate,
            });
        }

        const transactions = await txnQuery.orderBy('t.created_at', 'ASC').getMany();

        let totalExpenses = 0;
        let totalReplenishments = 0;

        for (const txn of transactions) {
            if (txn.type === TransactionType.EXPENSE) {
                totalExpenses += Number(txn.amount);
            } else if (txn.type === TransactionType.REPLENISHMENT) {
                totalReplenishments += Number(txn.amount);
            }
        }

        const openingBalance = transactions.length > 0 ? Number(transactions[0].balance_before) : Number(float.current_balance);
        const closingBalance = transactions.length > 0 ? Number(transactions[transactions.length - 1].balance_after) : Number(float.current_balance);

        return {
            opening_balance: openingBalance,
            closing_balance: closingBalance,
            total_expenses: totalExpenses,
            total_replenishments: totalReplenishments,
            transactions,
        };
    }

    // ==================== REPLENISHMENT ====================

    async requestReplenishment(data: RequestReplenishmentDto, requestedById: string): Promise<PettyCashReplenishment> {
        const float = await this.getFloat(data.float_id);

        const maxReplenishment = Number(float.maximum_limit) - Number(float.current_balance);
        if (data.amount_requested > maxReplenishment) {
            throw new BadRequestException(`Maximum replenishment amount is ${maxReplenishment}`);
        }

        const requestNumber = generateRef('REP', { digits: 6 });

        const replenishment = this.replenishmentRepo.create({
            request_number: requestNumber,
            float: { id: float.id } as PettyCashFloat,
            amount_requested: data.amount_requested,
            balance_at_request: float.current_balance,
            justification: data.justification,
            supporting_document_ids: data.supporting_document_ids,
            requestedBy: { id: requestedById } as Staff,
            requested_at: new Date(),
            status: ReplenishmentStatus.REQUESTED,
        });

        return this.replenishmentRepo.save(replenishment);
    }

    async approveReplenishment(replenishmentId: string, approvedById: string, comment?: string, amountApproved?: number): Promise<PettyCashReplenishment> {
        const replenishment = await this.replenishmentRepo.findOne({
            where: { id: replenishmentId },
            relations: ['float'],
        });
        if (!replenishment) throw new NotFoundException('Replenishment request not found');

        if (replenishment.status !== ReplenishmentStatus.REQUESTED) {
            throw new BadRequestException('Only pending requests can be approved');
        }

        replenishment.status = ReplenishmentStatus.APPROVED;
        replenishment.approvedBy = { id: approvedById } as Staff;
        replenishment.approved_at = new Date();
        replenishment.approval_comment = comment;
        replenishment.amount_approved = amountApproved || replenishment.amount_requested;

        return this.replenishmentRepo.save(replenishment);
    }

    async disburseReplenishment(replenishmentId: string, disbursedById: string, paymentDetails: {
        cheque_number?: string;
        payment_reference?: string;
    }): Promise<PettyCashReplenishment> {
        const replenishment = await this.replenishmentRepo.findOne({
            where: { id: replenishmentId },
            relations: ['float'],
        });
        if (!replenishment) throw new NotFoundException('Replenishment request not found');

        if (replenishment.status !== ReplenishmentStatus.APPROVED) {
            throw new BadRequestException('Only approved requests can be disbursed');
        }

        const amount = Number(replenishment.amount_approved);
        const float = await this.getFloat(replenishment.float.id);
        const balanceBefore = Number(float.current_balance);
        const balanceAfter = balanceBefore + amount;

        // Update float balance
        await this.floatRepo.update(float.id, { current_balance: balanceAfter });

        // Record transaction
        await this.recordTransaction({
            float_id: float.id,
            type: TransactionType.REPLENISHMENT,
            description: `Replenishment - ${replenishment.request_number}`,
            amount,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            transaction_date: new Date(),
            status: TransactionStatus.APPROVED,
            created_by_id: disbursedById,
        });

        // Update replenishment
        replenishment.status = ReplenishmentStatus.DISBURSED;
        replenishment.disbursedBy = { id: disbursedById } as Staff;
        replenishment.disbursed_at = new Date();
        replenishment.cheque_number = paymentDetails.cheque_number;
        replenishment.payment_reference = paymentDetails.payment_reference;

        return this.replenishmentRepo.save(replenishment);
    }

    async getPendingReplenishments(): Promise<PettyCashReplenishment[]> {
        return this.replenishmentRepo.find({
            where: { status: ReplenishmentStatus.REQUESTED },
            relations: ['float', 'float.branch', 'requestedBy'],
            order: { requested_at: 'ASC' },
        });
    }

    // ==================== RECONCILIATION ====================

    async performCashCount(data: CashCountDto, countedById: string): Promise<PettyCashReconciliation> {
        const float = await this.getFloat(data.float_id);
        const systemBalance = Number(float.current_balance);
        const variance = data.physical_count - systemBalance;

        const reconNumber = generateRef('REC', { digits: 6 });

        const reconciliation = this.reconciliationRepo.create({
            reconciliation_number: reconNumber,
            float: { id: float.id } as PettyCashFloat,
            reconciliation_date: new Date(),
            system_balance: systemBalance,
            physical_count: data.physical_count,
            denomination_breakdown: data.denomination_breakdown,
            variance,
            variance_explanation: data.variance_explanation,
            status: Math.abs(variance) < 0.01 ? ReconciliationStatus.SUBMITTED : ReconciliationStatus.VARIANCE_NOTED,
            countedBy: { id: countedById } as Staff,
        });

        const saved = await this.reconciliationRepo.save(reconciliation);

        // Update float last reconciliation date
        await this.floatRepo.update(float.id, {
            last_reconciliation_date: new Date(),
        });

        // If there's a variance, record an adjustment transaction
        if (Math.abs(variance) >= 0.01) {
            await this.recordTransaction({
                float_id: float.id,
                type: TransactionType.CASH_COUNT,
                description: `Cash count adjustment - ${data.variance_explanation || 'Variance noted'}`,
                amount: Math.abs(variance),
                balance_before: systemBalance,
                balance_after: data.physical_count,
                transaction_date: new Date(),
                status: TransactionStatus.PENDING, // Needs approval
                created_by_id: countedById,
            });
        }

        return saved;
    }

    async verifyReconciliation(reconciliationId: string, verifiedById: string, comment?: string): Promise<PettyCashReconciliation> {
        const reconciliation = await this.reconciliationRepo.findOne({
            where: { id: reconciliationId },
            relations: ['float'],
        });
        if (!reconciliation) throw new NotFoundException('Reconciliation not found');

        reconciliation.verifiedBy = { id: verifiedById } as Staff;
        reconciliation.verified_at = new Date();
        reconciliation.verifier_comment = comment;
        reconciliation.status = ReconciliationStatus.APPROVED;

        // If variance was noted, adjust the actual balance
        if (Math.abs(Number(reconciliation.variance)) >= 0.01) {
            await this.floatRepo.update(reconciliation.float.id, {
                current_balance: reconciliation.physical_count,
            });
        }

        return this.reconciliationRepo.save(reconciliation);
    }

    // ==================== REPORTS ====================

    async getMonthlyReport(floatId: string, year: number, month: number): Promise<{
        float: PettyCashFloat;
        period: string;
        opening_balance: number;
        closing_balance: number;
        total_expenses: number;
        total_replenishments: number;
        expense_by_category: Record<ExpenseCategory, number>;
        transaction_count: number;
        reconciliations: PettyCashReconciliation[];
    }> {
        const float = await this.getFloat(floatId);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const transactions = await this.transactionRepo.find({
            where: {
                float: { id: floatId },
                status: TransactionStatus.APPROVED,
                transaction_date: Between(startDate, endDate),
            },
            order: { created_at: 'ASC' },
        });

        const expenseByCategory: Record<string, number> = {};
        let totalExpenses = 0;
        let totalReplenishments = 0;

        for (const txn of transactions) {
            if (txn.type === TransactionType.EXPENSE) {
                totalExpenses += Number(txn.amount);
                if (txn.category) {
                    expenseByCategory[txn.category] = (expenseByCategory[txn.category] || 0) + Number(txn.amount);
                }
            } else if (txn.type === TransactionType.REPLENISHMENT) {
                totalReplenishments += Number(txn.amount);
            }
        }

        const reconciliations = await this.reconciliationRepo.find({
            where: {
                float: { id: floatId },
                reconciliation_date: Between(startDate, endDate),
            },
            order: { reconciliation_date: 'ASC' },
        });

        return {
            float,
            period: `${year}-${month.toString().padStart(2, '0')}`,
            opening_balance: transactions.length > 0 ? Number(transactions[0].balance_before) : Number(float.current_balance),
            closing_balance: transactions.length > 0 ? Number(transactions[transactions.length - 1].balance_after) : Number(float.current_balance),
            total_expenses: totalExpenses,
            total_replenishments: totalReplenishments,
            expense_by_category: expenseByCategory as Record<ExpenseCategory, number>,
            transaction_count: transactions.length,
            reconciliations,
        };
    }

    async getDashboardStats(): Promise<{
        total_floats: number;
        total_balance: number;
        floats_needing_replenishment: number;
        pending_replenishments: number;
        pending_replenishment_amount: number;
        total_expenses_this_month: number;
        variance_alerts: number;
    }> {
        const floats = await this.getAllFloats();
        const floatsNeedingReplenishment = floats.filter(f => f.needs_replenishment);
        const pendingReplenishments = await this.replenishmentRepo.find({
            where: { status: ReplenishmentStatus.REQUESTED },
        });

        const thisMonth = new Date();
        const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);

        const monthlyExpenses = await this.transactionRepo
            .createQueryBuilder('t')
            .select('SUM(t.amount)', 'total')
            .where('t.type = :type', { type: TransactionType.EXPENSE })
            .andWhere('t.status = :status', { status: TransactionStatus.APPROVED })
            .andWhere('t.transaction_date >= :start', { start: startOfMonth })
            .getRawOne();

        const varianceAlerts = await this.reconciliationRepo.count({
            where: {
                status: ReconciliationStatus.VARIANCE_NOTED,
            },
        });

        return {
            total_floats: floats.length,
            total_balance: floats.reduce((sum, f) => sum + Number(f.current_balance), 0),
            floats_needing_replenishment: floatsNeedingReplenishment.length,
            pending_replenishments: pendingReplenishments.length,
            pending_replenishment_amount: pendingReplenishments.reduce((sum, r) => sum + Number(r.amount_requested), 0),
            total_expenses_this_month: Number(monthlyExpenses?.total || 0),
            variance_alerts: varianceAlerts,
        };
    }
}
