import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    CreditCard,
    TrendingUp,
    FileText,
    Download,
    AlertTriangle,
    CheckCircle,
    Clock,
    Building2,
    PiggyBank,
    Receipt,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
} from 'lucide-react';
import api from '../../lib/api';

interface LoanStats {
    totalLoans: number;
    activeLoans: number;
    totalDisbursed: number;
    totalOutstanding: number;
    totalCollected: number;
    overdueAmount: number;
}

interface ClaimStats {
    totalClaims: number;
    pendingClaims: number;
    approvedAmount: number;
    pendingAmount: number;
}

export default function AccountantDashboard() {
    const navigate = useNavigate();
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Fetch loan statistics
    const { data: loanStats } = useQuery<LoanStats>({
        queryKey: ['accountant-loan-stats'],
        queryFn: () => api.get('/loans/stats').then(r => r.data),
    });

    // Fetch claims statistics
    const { data: claimStats } = useQuery<ClaimStats>({
        queryKey: ['accountant-claim-stats'],
        queryFn: () => api.get('/claims/stats').then(r => r.data).catch(() => ({
            totalClaims: 0,
            pendingClaims: 0,
            approvedAmount: 0,
            pendingAmount: 0,
        })),
    });

    // Fetch overdue loans
    const { data: overdueLoans = [] } = useQuery({
        queryKey: ['overdue-loans'],
        queryFn: () => api.get('/loans/overdue').then(r => r.data).catch(() => []),
    });

    // Fetch pending loan approvals
    const { data: pendingLoans = [] } = useQuery({
        queryKey: ['pending-loan-approvals'],
        queryFn: () => api.get('/loans/pending-approval').then(r => r.data).catch(() => []),
    });

    const handleExportPayroll = async () => {
        try {
            const response = await api.get(`/loans/payroll/export?month=${currentMonth}`);
            console.log('Payroll export:', response.data);
            // In a real app, this would download a file
            alert(`Payroll export generated for ${currentMonth}`);
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const handleExportReport = async (type: string) => {
        try {
            window.open(`http://localhost:3010/reporting/export/excel?type=${type}`, '_blank');
        } catch (error) {
            console.error('Export failed:', error);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount || 0);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                        Accountant Dashboard
                    </h1>
                    <p className="text-slate-600 mt-1">Financial overview and transaction management</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportPayroll}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export Payroll
                    </button>
                    <button
                        onClick={() => handleExportReport('summary')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 text-sm">Total Disbursed</p>
                            <p className="text-2xl font-bold mt-1">
                                {formatCurrency(loanStats?.totalDisbursed || 0)}
                            </p>
                            <p className="text-emerald-100 text-xs mt-1">
                                {loanStats?.activeLoans || 0} active loans
                            </p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <DollarSign className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Total Outstanding</p>
                            <p className="text-2xl font-bold mt-1">
                                {formatCurrency(loanStats?.totalOutstanding || 0)}
                            </p>
                            <p className="text-blue-100 text-xs mt-1">
                                Portfolio balance
                            </p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <PiggyBank className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-sm">Total Collected</p>
                            <p className="text-2xl font-bold mt-1">
                                {formatCurrency(loanStats?.totalCollected || 0)}
                            </p>
                            <p className="text-purple-100 text-xs mt-1 flex items-center gap-1">
                                <ArrowUpRight className="w-3 h-3" />
                                Repayments received
                            </p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-sm">Overdue Amount</p>
                            <p className="text-2xl font-bold mt-1">
                                {formatCurrency(loanStats?.overdueAmount || 0)}
                            </p>
                            <p className="text-red-100 text-xs mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {overdueLoans.length} loans overdue
                            </p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl">
                            <ArrowDownRight className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Claims Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg">
                            <Receipt className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{claimStats?.pendingClaims || 0}</p>
                            <p className="text-sm text-slate-500">Pending Claims</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Worth {formatCurrency(claimStats?.pendingAmount || 0)}
                    </p>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">
                                {formatCurrency(claimStats?.approvedAmount || 0)}
                            </p>
                            <p className="text-sm text-slate-500">Approved This Month</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{claimStats?.totalClaims || 0}</p>
                            <p className="text-sm text-slate-500">Total Claims</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Loan Disbursements */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">Pending Loan Disbursements</h3>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                            {pendingLoans.length} pending
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {pendingLoans.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                                <p>No pending disbursements</p>
                            </div>
                        ) : (
                            pendingLoans.slice(0, 5).map((loan: any) => (
                                <div key={loan.id} className="p-4 hover:bg-slate-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-slate-800">
                                                {loan.staff?.first_name} {loan.staff?.last_name}
                                            </p>
                                            <p className="text-sm text-slate-500">{loan.loan_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-slate-800">
                                                {formatCurrency(loan.principal)}
                                            </p>
                                            <p className="text-xs text-slate-500">{loan.loan_type}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {pendingLoans.length > 0 && (
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => navigate('/loans')}
                                className="text-sm text-emerald-600 font-medium hover:text-emerald-700"
                            >
                                View all pending loans →
                            </button>
                        </div>
                    )}
                </div>

                {/* Overdue Loans */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">Overdue Loans</h3>
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            {overdueLoans.length} overdue
                        </span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {overdueLoans.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                                <p>No overdue loans</p>
                            </div>
                        ) : (
                            overdueLoans.slice(0, 5).map((loan: any) => (
                                <div key={loan.id} className="p-4 hover:bg-slate-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-slate-800">
                                                {loan.staff?.first_name} {loan.staff?.last_name}
                                            </p>
                                            <p className="text-sm text-red-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {loan.days_overdue || 0} days overdue
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-red-600">
                                                {formatCurrency(loan.overdue_amount)}
                                            </p>
                                            <p className="text-xs text-slate-500">{loan.loan_number}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Export Actions */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-4">Quick Exports</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={handleExportPayroll}
                        className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <Calendar className="w-6 h-6" />
                        <span className="text-sm">Payroll Deductions</span>
                    </button>
                    <button
                        onClick={() => handleExportReport('summary')}
                        className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <FileText className="w-6 h-6" />
                        <span className="text-sm">Summary Report</span>
                    </button>
                    <button
                        onClick={() => handleExportReport('branches')}
                        className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <Building2 className="w-6 h-6" />
                        <span className="text-sm">Branch Report</span>
                    </button>
                    <button
                        onClick={() => navigate('/claims')}
                        className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <Receipt className="w-6 h-6" />
                        <span className="text-sm">Claims Report</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
