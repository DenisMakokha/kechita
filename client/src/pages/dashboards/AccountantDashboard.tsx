import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
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
    Wallet,
    RefreshCw,
    ChevronRight,
    Percent,
    ClipboardCheck,
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
    const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast(null), 3000);
    };

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

    // Fetch petty cash dashboard stats
    const { data: pettyCashStats } = useQuery({
        queryKey: ['petty-cash-dashboard'],
        queryFn: () => api.get('/petty-cash/dashboard').then(r => r.data).catch(() => null),
        refetchInterval: 60000,
    });

    // Fetch pending replenishments
    const { data: pendingReplenishments = [] } = useQuery({
        queryKey: ['pending-replenishments'],
        queryFn: () => api.get('/petty-cash/replenishments/pending').then(r => r.data).catch(() => []),
        refetchInterval: 60000,
    });

    // Fetch floats needing replenishment
    const { data: floatsNeedingReplenishment = [] } = useQuery({
        queryKey: ['floats-needing-replenishment'],
        queryFn: () => api.get('/petty-cash/floats/needing-replenishment').then(r => r.data).catch(() => []),
        refetchInterval: 60000,
    });

    // Fetch pending approvals
    const { data: pendingApprovals = [] } = useQuery({
        queryKey: ['accountant-pending-approvals'],
        queryFn: () => api.get('/approvals/pending').then(r => r.data).catch(() => []),
        refetchInterval: 30000,
    });

    // Fetch payroll summary by branch
    const { data: payrollByBranch } = useQuery({
        queryKey: ['payroll-by-branch', currentMonth],
        queryFn: () => api.get(`/loans/payroll/summary-by-branch?month=${currentMonth}`).then(r => r.data).catch(() => null),
    });

    const collectionRate = loanStats?.totalDisbursed ? ((loanStats.totalCollected || 0) / loanStats.totalDisbursed * 100) : 0;

    const handleExportPayroll = async () => {
        try {
            const response = await api.get(`/loans/payroll/export?month=${currentMonth}`);
            const data = response.data;
            if (!data?.deductions?.length) {
                showToast('No payroll deductions found for this month', 'error');
                return;
            }
            const headers = ['Staff No', 'Staff Name', 'Branch', 'Loan No', 'Loan Type', 'Installment #', 'Amount', 'Principal', 'Interest', 'Outstanding Balance'];
            const rows = data.deductions.map((d: any) => [
                d.staffNumber, d.staffName, d.branchName, d.loanNumber, d.loanType,
                d.installmentNumber, d.amount, d.principalComponent, d.interestComponent, d.outstandingBalance,
            ]);
            const csv = [headers.join(','), ...rows.map((r: any[]) => r.map(v => `"${v}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `payroll_deductions_${currentMonth}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showToast(`Payroll export downloaded (${data.deductions.length} deductions)`);
        } catch (error) {
            showToast('Failed to export payroll', 'error');
        }
    };

    const handleExportReport = async (type: string) => {
        try {
            const response = await api.get(`/reporting/export/excel?type=${type}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showToast('Report exported successfully');
        } catch (error) {
            showToast('Failed to export report', 'error');
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

                <div className="bg-[#0066B3] rounded-2xl p-5 text-white shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm">Total Collected</p>
                            <p className="text-2xl font-bold mt-1">
                                {formatCurrency(loanStats?.totalCollected || 0)}
                            </p>
                            <p className="text-blue-100 text-xs mt-1 flex items-center gap-1">
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

            {/* Collection Rate + Claims Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-100 rounded-lg">
                            <Percent className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{collectionRate.toFixed(1)}%</p>
                            <p className="text-sm text-slate-500">Collection Rate</p>
                        </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(collectionRate, 100)}%` }} />
                    </div>
                </div>
                <button onClick={() => navigate('/claims')} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-amber-300 hover:shadow-md transition-all text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-100 rounded-lg">
                            <Receipt className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{claimStats?.pendingClaims || 0}</p>
                            <p className="text-sm text-slate-500">Pending Claims</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Worth {formatCurrency(claimStats?.pendingAmount || 0)}</p>
                </button>
                <button onClick={() => navigate('/claims')} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-green-300 hover:shadow-md transition-all text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{formatCurrency(claimStats?.approvedAmount || 0)}</p>
                            <p className="text-sm text-slate-500">Approved This Month</p>
                        </div>
                    </div>
                </button>
                <button onClick={() => navigate('/approvals')} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:border-orange-300 hover:shadow-md transition-all text-left">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <ClipboardCheck className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{pendingApprovals.length}</p>
                            <p className="text-sm text-slate-500">Pending Approvals</p>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Requires your action</p>
                </button>
            </div>

            {/* Petty Cash Section */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Wallet className="w-5 h-5" /> Petty Cash Overview
                    </h3>
                    <button onClick={() => navigate('/petty-cash')} className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        Manage <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-purple-200 text-xs">Total Float Balance</p>
                        <p className="text-xl font-bold mt-1">{formatCurrency(pettyCashStats?.total_balance || 0)}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-purple-200 text-xs">Active Floats</p>
                        <p className="text-xl font-bold mt-1">{pettyCashStats?.total_floats || 0}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-purple-200 text-xs">Month Expenses</p>
                        <p className="text-xl font-bold mt-1">{formatCurrency(pettyCashStats?.total_expenses_this_month || 0)}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-purple-200 text-xs">Variance Alerts</p>
                        <p className="text-xl font-bold mt-1">{pettyCashStats?.variance_alerts || 0}</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pending Replenishments */}
                    <div className="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
                            <span className="font-medium text-sm flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Pending Replenishments</span>
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{pendingReplenishments.length}</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-white/10">
                            {pendingReplenishments.length === 0 ? (
                                <p className="p-4 text-sm text-purple-200 text-center">No pending replenishments</p>
                            ) : pendingReplenishments.slice(0, 4).map((r: any) => (
                                <div key={r.id} className="p-3 flex justify-between items-center">
                                    <span className="text-sm">{r.float?.branch?.name || 'Float'}</span>
                                    <span className="font-medium text-sm">{formatCurrency(r.amount_requested)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Floats Needing Replenishment */}
                    <div className="bg-white/10 backdrop-blur rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center">
                            <span className="font-medium text-sm flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Low Balance Floats</span>
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{floatsNeedingReplenishment.length}</span>
                        </div>
                        <div className="max-h-40 overflow-y-auto divide-y divide-white/10">
                            {floatsNeedingReplenishment.length === 0 ? (
                                <p className="p-4 text-sm text-purple-200 text-center">All floats are adequately funded</p>
                            ) : floatsNeedingReplenishment.slice(0, 4).map((f: any) => (
                                <div key={f.id} className="p-3 flex justify-between items-center">
                                    <span className="text-sm">{f.branch?.name || f.name}</span>
                                    <span className="font-medium text-sm text-amber-300">{formatCurrency(f.current_balance)}</span>
                                </div>
                            ))}
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

            {/* Payroll by Branch Summary */}
            {payrollByBranch?.branches && payrollByBranch.branches.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-slate-500" /> Payroll Deductions by Branch ({currentMonth})
                        </h3>
                        <button onClick={handleExportPayroll} className="text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1">
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left p-3 font-medium text-slate-600">Branch</th>
                                    <th className="text-right p-3 font-medium text-slate-600">Staff</th>
                                    <th className="text-right p-3 font-medium text-slate-600">Total Deductions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payrollByBranch.branches.slice(0, 8).map((b: any) => (
                                    <tr key={b.branchId || b.name} className="hover:bg-slate-50">
                                        <td className="p-3 font-medium text-slate-800">{b.name || b.branchName}</td>
                                        <td className="p-3 text-right text-slate-600">{b.staffCount || b.loans || 0}</td>
                                        <td className="p-3 text-right font-semibold text-slate-800">{formatCurrency(b.totalAmount || b.total || 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick Export Actions */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <button
                        onClick={handleExportPayroll}
                        className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <Calendar className="w-6 h-6" />
                        <span className="text-sm">Payroll Export</span>
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
                        <span className="text-sm">View Claims</span>
                    </button>
                    <button
                        onClick={() => navigate('/petty-cash')}
                        className="flex flex-col items-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <Wallet className="w-6 h-6" />
                        <span className="text-sm">Petty Cash</span>
                    </button>
                </div>
            </div>
            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${
                    toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'
                }`}>
                    {toast.text}
                </div>
            )}
        </div>
    );
}
