import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Upload, Download, FileSpreadsheet, TrendingUp, TrendingDown,
    Building2, Calendar, AlertTriangle, Check, BarChart3, PieChart
} from 'lucide-react';
import { api } from '../../lib/api';
import './kpi-dashboard.css';

interface MonthlyKPI {
    period: string;
    total_disbursed: number;
    total_recoveries: number;
    total_new_loans: number;
    average_par: number;
    par_buckets: { par_1_30: number; par_31_60: number; par_61_90: number; par_90_plus: number; total: number };
    branch_count: number;
    report_count: number;
}

interface ImportResult {
    total_rows: number;
    imported: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
}

export const KPIDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'par'>('overview');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const queryClient = useQueryClient();

    const year = parseInt(selectedMonth.split('-')[0]);
    const month = parseInt(selectedMonth.split('-')[1]);

    const { data: kpiSummary } = useQuery<MonthlyKPI>({
        queryKey: ['kpi-summary', year, month],
        queryFn: () => api.get(`/reporting/kpi/monthly/${year}/${month}`).then(r => r.data),
    });

    const importMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            const endpoint = file.name.endsWith('.csv')
                ? '/reporting/kpi/import/csv'
                : '/reporting/kpi/import/excel';
            return api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
        },
        onSuccess: (response) => {
            setImportResult(response.data);
            queryClient.invalidateQueries({ queryKey: ['kpi-summary'] });
        },
        onError: (e: any) => console.error('Import failed:', e),
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImportFile(e.target.files[0]);
            setImportResult(null);
        }
    };

    const handleImport = () => {
        if (importFile) {
            importMutation.mutate(importFile);
        }
    };

    const downloadTemplate = async () => {
        const response = await api.get('/reporting/kpi/template', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'kpi_import_template.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const renderOverview = () => (
        <div className="kpi-overview">
            <div className="kpi-period-selector">
                <Calendar size={18} />
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                />
            </div>

            {kpiSummary ? (
                <>
                    <div className="kpi-stats-grid">
                        <div className="kpi-stat-card primary">
                            <div className="kpi-stat-icon">
                                <TrendingUp size={24} />
                            </div>
                            <div className="kpi-stat-content">
                                <span className="kpi-stat-value">{formatCurrency(kpiSummary.total_disbursed)}</span>
                                <span className="kpi-stat-label">Total Disbursed</span>
                            </div>
                        </div>
                        <div className="kpi-stat-card success">
                            <div className="kpi-stat-icon">
                                <TrendingDown size={24} />
                            </div>
                            <div className="kpi-stat-content">
                                <span className="kpi-stat-value">{formatCurrency(kpiSummary.total_recoveries)}</span>
                                <span className="kpi-stat-label">Total Recoveries</span>
                            </div>
                        </div>
                        <div className="kpi-stat-card info">
                            <div className="kpi-stat-icon">
                                <BarChart3 size={24} />
                            </div>
                            <div className="kpi-stat-content">
                                <span className="kpi-stat-value">{kpiSummary.total_new_loans}</span>
                                <span className="kpi-stat-label">New Loans</span>
                            </div>
                        </div>
                        <div className={`kpi-stat-card ${kpiSummary.average_par > 5 ? 'danger' : kpiSummary.average_par > 3 ? 'warning' : 'success'}`}>
                            <div className="kpi-stat-icon">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="kpi-stat-content">
                                <span className="kpi-stat-value">{kpiSummary.average_par.toFixed(2)}%</span>
                                <span className="kpi-stat-label">Average PAR</span>
                            </div>
                        </div>
                    </div>

                    <div className="kpi-info-row">
                        <div className="kpi-info-card">
                            <Building2 size={18} />
                            <span>{kpiSummary.branch_count} Branches Reporting</span>
                        </div>
                        <div className="kpi-info-card">
                            <FileSpreadsheet size={18} />
                            <span>{kpiSummary.report_count} Daily Reports</span>
                        </div>
                    </div>
                </>
            ) : (
                <div className="kpi-empty">
                    <PieChart size={48} />
                    <h3>No Data Available</h3>
                    <p>No KPI data found for {selectedMonth}. Import data to get started.</p>
                </div>
            )}
        </div>
    );

    const renderImport = () => (
        <div className="kpi-import">
            <div className="kpi-import-header">
                <h3>Import Daily Reports</h3>
                <button className="kpi-btn secondary" onClick={downloadTemplate}>
                    <Download size={18} />
                    Download Template
                </button>
            </div>

            <div className="kpi-import-area">
                <div className="kpi-import-dropzone">
                    <Upload size={32} />
                    <h4>Choose File</h4>
                    <p>CSV or Excel file (.csv, .xlsx)</p>
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                    />
                </div>

                {importFile && (
                    <div className="kpi-import-file">
                        <FileSpreadsheet size={24} />
                        <div>
                            <span className="file-name">{importFile.name}</span>
                            <span className="file-size">{(importFile.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button
                            className="kpi-btn primary"
                            onClick={handleImport}
                            disabled={importMutation.isPending}
                        >
                            {importMutation.isPending ? 'Importing...' : 'Import'}
                        </button>
                    </div>
                )}

                {importResult && (
                    <div className={`kpi-import-result ${importResult.failed > 0 ? 'has-errors' : 'success'}`}>
                        <div className="result-header">
                            {importResult.failed === 0 ? (
                                <><Check size={20} /> Import Successful</>
                            ) : (
                                <><AlertTriangle size={20} /> Import Completed with Errors</>
                            )}
                        </div>
                        <div className="result-stats">
                            <div className="result-stat">
                                <span className="stat-value">{importResult.total_rows}</span>
                                <span className="stat-label">Total Rows</span>
                            </div>
                            <div className="result-stat success">
                                <span className="stat-value">{importResult.imported}</span>
                                <span className="stat-label">Imported</span>
                            </div>
                            <div className="result-stat danger">
                                <span className="stat-value">{importResult.failed}</span>
                                <span className="stat-label">Failed</span>
                            </div>
                        </div>
                        {importResult.errors.length > 0 && (
                            <div className="result-errors">
                                <h5>Errors:</h5>
                                <ul>
                                    {importResult.errors.slice(0, 5).map((err, i) => (
                                        <li key={i}>Row {err.row}: {err.error}</li>
                                    ))}
                                    {importResult.errors.length > 5 && (
                                        <li>...and {importResult.errors.length - 5} more errors</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="kpi-import-instructions">
                <h4>Instructions</h4>
                <ol>
                    <li>Download the template file using the button above</li>
                    <li>Fill in your daily branch data</li>
                    <li>Required columns: branch_code, report_date</li>
                    <li>Optional columns: loans_new_count, loans_disbursed_amount, recoveries_amount, arrears_collected, par_amount, par_ratio</li>
                    <li>Upload and import the completed file</li>
                </ol>
            </div>
        </div>
    );

    const renderPAR = () => {
        const buckets = kpiSummary?.par_buckets;
        const total = buckets?.total || 0;
        const pct = (val: number) => total > 0 ? Math.round((val / total) * 100) : 0;

        return (
            <div className="kpi-par">
                <h3>Portfolio at Risk Analysis</h3>
                <p className="kpi-par-subtitle">
                    PAR breakdown by aging bucket for {kpiSummary?.period || selectedMonth}
                    {total > 0 ? ` — Total: ${formatCurrency(total)}` : ''}
                </p>

                {total === 0 ? (
                    <div className="kpi-par-preview" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                        <AlertTriangle size={32} style={{ margin: '0 auto 0.5rem' }} />
                        <p>No PAR data available for this period.</p>
                        <p style={{ fontSize: '0.85rem' }}>Import branch daily reports with PAR figures to see the breakdown.</p>
                    </div>
                ) : (
                    <div className="kpi-par-preview">
                        <div className="par-bucket">
                            <div className="par-bucket-header">PAR 1-30</div>
                            <div className="par-bucket-bar" style={{ width: `${pct(buckets!.par_1_30)}%` }}></div>
                            <span>{pct(buckets!.par_1_30)}% ({formatCurrency(buckets!.par_1_30)})</span>
                        </div>
                        <div className="par-bucket">
                            <div className="par-bucket-header">PAR 31-60</div>
                            <div className="par-bucket-bar" style={{ width: `${pct(buckets!.par_31_60)}%` }}></div>
                            <span>{pct(buckets!.par_31_60)}% ({formatCurrency(buckets!.par_31_60)})</span>
                        </div>
                        <div className="par-bucket">
                            <div className="par-bucket-header">PAR 61-90</div>
                            <div className="par-bucket-bar" style={{ width: `${pct(buckets!.par_61_90)}%` }}></div>
                            <span>{pct(buckets!.par_61_90)}% ({formatCurrency(buckets!.par_61_90)})</span>
                        </div>
                        <div className="par-bucket">
                            <div className="par-bucket-header">PAR 90+</div>
                            <div className="par-bucket-bar danger" style={{ width: `${pct(buckets!.par_90_plus)}%` }}></div>
                            <span>{pct(buckets!.par_90_plus)}% ({formatCurrency(buckets!.par_90_plus)})</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="kpi-dashboard">
            <div className="kpi-tabs">
                <button
                    className={activeTab === 'overview' ? 'active' : ''}
                    onClick={() => setActiveTab('overview')}
                >
                    <BarChart3 size={18} />
                    Overview
                </button>
                <button
                    className={activeTab === 'import' ? 'active' : ''}
                    onClick={() => setActiveTab('import')}
                >
                    <Upload size={18} />
                    Import Data
                </button>
                <button
                    className={activeTab === 'par' ? 'active' : ''}
                    onClick={() => setActiveTab('par')}
                >
                    <PieChart size={18} />
                    PAR Analysis
                </button>
            </div>

            <div className="kpi-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'import' && renderImport()}
                {activeTab === 'par' && renderPAR()}
            </div>
        </div>
    );
};

export default KPIDashboard;
