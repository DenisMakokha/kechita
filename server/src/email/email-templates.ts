/**
 * Professional email template builder for Kechita Capital.
 * All notification emails use this unified layout.
 */

export interface TemplateOptions {
    recipientName: string;
    title: string;
    body: string;
    /** Optional accent color for the header (default: brand purple) */
    accentColor?: string;
    /** Optional header icon emoji */
    icon?: string;
    /** Optional CTA button */
    action?: { label: string; url: string };
    /** Optional key-value detail rows */
    details?: Array<{ label: string; value: string }>;
    /** Optional footer note */
    footerNote?: string;
    /** Priority badge (shows a colored tag in the header) */
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}

const BRAND = {
    primary: '#7c3aed',
    secondary: '#0066B3',
    success: '#059669',
    warning: '#f59e0b',
    danger: '#ef4444',
    text: '#1e293b',
    muted: '#64748b',
    bg: '#f8fafc',
    cardBg: '#ffffff',
    border: '#e2e8f0',
    logo: 'Kechita Capital',
    domain: 'https://kechita.cloud',
};

const PRIORITY_COLORS: Record<string, string> = {
    low: '#94a3b8',
    medium: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
};

function getAccent(opts: TemplateOptions): string {
    if (opts.accentColor) return opts.accentColor;
    if (opts.priority === 'urgent') return BRAND.danger;
    if (opts.priority === 'high') return BRAND.warning;
    return BRAND.primary;
}

/**
 * Build a professional HTML email from structured options.
 */
export function buildEmailHtml(opts: TemplateOptions): string {
    const accent = getAccent(opts);
    const detailsHtml = opts.details?.length
        ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;border-collapse:collapse;">
            ${opts.details.map(d => `
                <tr>
                    <td style="padding:10px 16px;font-size:13px;color:${BRAND.muted};border-bottom:1px solid ${BRAND.border};width:140px;vertical-align:top;">${d.label}</td>
                    <td style="padding:10px 16px;font-size:14px;color:${BRAND.text};border-bottom:1px solid ${BRAND.border};font-weight:500;">${d.value}</td>
                </tr>
            `).join('')}
           </table>`
        : '';

    const actionHtml = opts.action
        ? `<div style="text-align:center;margin:28px 0 12px;">
               <a href="${opts.action.url}" style="display:inline-block;background:${accent};color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">${opts.action.label}</a>
           </div>`
        : '';

    const priorityBadge = opts.priority
        ? `<span style="display:inline-block;background:${PRIORITY_COLORS[opts.priority]}22;color:${PRIORITY_COLORS[opts.priority]};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;text-transform:uppercase;margin-left:8px;">${opts.priority}</span>`
        : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${opts.title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;-webkit-font-smoothing:antialiased;">
    <table cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.bg};">
        <tr><td style="padding:32px 16px;">
            <table cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;width:100%;">

                <!-- Header -->
                <tr><td style="background:linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
                    <div style="font-size:28px;margin-bottom:6px;">${opts.icon || '📬'}</div>
                    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${opts.title}${priorityBadge}</h1>
                </td></tr>

                <!-- Body -->
                <tr><td style="background:${BRAND.cardBg};padding:32px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
                    <p style="margin:0 0 16px;color:${BRAND.text};font-size:15px;line-height:1.6;">Dear <strong>${opts.recipientName}</strong>,</p>
                    <p style="margin:0 0 4px;color:${BRAND.text};font-size:15px;line-height:1.7;">${opts.body}</p>
                    ${detailsHtml}
                    ${actionHtml}
                </td></tr>

                <!-- Footer -->
                <tr><td style="background:${BRAND.bg};padding:24px 32px;border:1px solid ${BRAND.border};border-top:none;border-radius:0 0 12px 12px;text-align:center;">
                    ${opts.footerNote ? `<p style="margin:0 0 12px;color:${BRAND.muted};font-size:12px;">${opts.footerNote}</p>` : ''}
                    <p style="margin:0;color:${BRAND.muted};font-size:12px;">
                        <a href="${BRAND.domain}" style="color:${accent};text-decoration:none;font-weight:600;">${BRAND.logo}</a>
                        &nbsp;·&nbsp; Staff Portal
                    </p>
                    <p style="margin:8px 0 0;color:#cbd5e1;font-size:11px;">This is an automated notification. Please do not reply directly.</p>
                </td></tr>

            </table>
        </td></tr>
    </table>
</body>
</html>`;
}

// ─── Pre-built notification templates ───────────────────────────────

export function approvalRequiredEmail(recipientName: string, targetLabel: string, stepName: string): string {
    return buildEmailHtml({
        recipientName,
        icon: '📋',
        title: `${targetLabel} Approval Required`,
        body: `A new ${targetLabel.toLowerCase()} requires your approval at the <strong>${stepName}</strong> step. Please review it at your earliest convenience.`,
        accentColor: BRAND.warning,
        priority: 'high',
        action: { label: 'Review Now', url: `${BRAND.domain}/approvals` },
    });
}

export function approvalCompletedEmail(recipientName: string, targetLabel: string, approved: boolean, comment?: string): string {
    return buildEmailHtml({
        recipientName,
        icon: approved ? '✅' : '❌',
        title: `${targetLabel} ${approved ? 'Approved' : 'Rejected'}`,
        body: `Your ${targetLabel.toLowerCase()} has been <strong>${approved ? 'approved' : 'rejected'}</strong>.${comment ? `<br><br><em>Comment: ${comment}</em>` : ''}`,
        accentColor: approved ? BRAND.success : BRAND.danger,
        priority: approved ? 'medium' : 'high',
        action: { label: 'View Details', url: `${BRAND.domain}/approvals` },
    });
}

export function approvalReturnedEmail(recipientName: string, targetLabel: string, comment?: string): string {
    return buildEmailHtml({
        recipientName,
        icon: '🔄',
        title: `${targetLabel} Returned for Review`,
        body: `Your ${targetLabel.toLowerCase()} has been returned for corrections. Please review the feedback and resubmit.${comment ? `<br><br><em>Comment: ${comment}</em>` : ''}`,
        accentColor: BRAND.warning,
        priority: 'high',
        action: { label: 'View & Correct', url: `${BRAND.domain}/approvals` },
    });
}

export function approvalEscalatedEmail(recipientName: string, targetLabel: string, stepOrder: number): string {
    return buildEmailHtml({
        recipientName,
        icon: '⚡',
        title: `Escalated: ${targetLabel} Approval`,
        body: `A ${targetLabel.toLowerCase()} approval has been <strong>escalated</strong> to your role at step ${stepOrder}. The previous approver did not respond in time. Please review urgently.`,
        accentColor: BRAND.danger,
        priority: 'urgent',
        action: { label: 'Review Now', url: `${BRAND.domain}/approvals` },
    });
}

export function documentExpiringEmail(recipientName: string, docName: string, expiryDate: string, daysLeft: string): string {
    return buildEmailHtml({
        recipientName,
        icon: '📄',
        title: `Document ${daysLeft === 'expired' ? 'Expired' : 'Expiring Soon'}`,
        body: daysLeft === 'expired'
            ? `Your <strong>${docName}</strong> has expired. Please upload a renewed document as soon as possible to remain compliant.`
            : `Your <strong>${docName}</strong> will expire on <strong>${expiryDate}</strong>. Please start the renewal process.`,
        accentColor: daysLeft === 'expired' ? BRAND.danger : BRAND.warning,
        priority: daysLeft === 'expired' ? 'urgent' : 'high',
        details: [
            { label: 'Document', value: docName },
            { label: 'Expiry Date', value: expiryDate },
            { label: 'Status', value: daysLeft === 'expired' ? '🔴 Expired' : `⚠️ Expires in ${daysLeft}` },
        ],
        action: { label: 'View Documents', url: `${BRAND.domain}/staff-management` },
    });
}

export function documentExpiredHrEmail(recipientName: string, staffName: string, docName: string): string {
    return buildEmailHtml({
        recipientName,
        icon: '🚨',
        title: 'Staff Document Expired',
        body: `<strong>${staffName}</strong>'s <strong>${docName}</strong> has expired. Please follow up to ensure compliance.`,
        accentColor: BRAND.danger,
        priority: 'high',
        details: [
            { label: 'Staff Member', value: staffName },
            { label: 'Document', value: docName },
        ],
        action: { label: 'View Staff', url: `${BRAND.domain}/staff-management` },
    });
}

export function leaveRequestEmail(recipientName: string, action: 'submitted' | 'approved' | 'rejected', leaveType?: string, dates?: string, comment?: string): string {
    const icons = { submitted: '🏖️', approved: '✅', rejected: '❌' };
    const titles = { submitted: 'Leave Request Submitted', approved: 'Leave Request Approved', rejected: 'Leave Request Rejected' };
    const colors = { submitted: BRAND.secondary, approved: BRAND.success, rejected: BRAND.danger };
    const bodies = {
        submitted: `Your ${leaveType || 'leave'} request${dates ? ` for <strong>${dates}</strong>` : ''} has been submitted and is pending approval.`,
        approved: `Your ${leaveType || 'leave'} request${dates ? ` for <strong>${dates}</strong>` : ''} has been <strong>approved</strong>.${comment ? `<br><br><em>Comment: ${comment}</em>` : ''}`,
        rejected: `Your ${leaveType || 'leave'} request${dates ? ` for <strong>${dates}</strong>` : ''} has been <strong>rejected</strong>.${comment ? `<br><br><em>Reason: ${comment}</em>` : ''}`,
    };

    return buildEmailHtml({
        recipientName,
        icon: icons[action],
        title: titles[action],
        body: bodies[action],
        accentColor: colors[action],
        priority: action === 'rejected' ? 'high' : 'medium',
        action: { label: 'View Leave', url: `${BRAND.domain}/leave-management` },
    });
}

export function claimEmail(recipientName: string, action: 'submitted' | 'approved' | 'rejected' | 'paid', amount?: string, comment?: string): string {
    const icons = { submitted: '🧾', approved: '✅', rejected: '❌', paid: '💰' };
    const titles = { submitted: 'Expense Claim Submitted', approved: 'Expense Claim Approved', rejected: 'Expense Claim Rejected', paid: 'Expense Claim Paid' };
    const colors = { submitted: BRAND.secondary, approved: BRAND.success, rejected: BRAND.danger, paid: BRAND.success };

    return buildEmailHtml({
        recipientName,
        icon: icons[action],
        title: titles[action],
        body: `Your expense claim${amount ? ` of <strong>${amount}</strong>` : ''} has been <strong>${action}</strong>.${comment ? `<br><br><em>${action === 'rejected' ? 'Reason' : 'Comment'}: ${comment}</em>` : ''}`,
        accentColor: colors[action],
        priority: action === 'rejected' ? 'high' : 'medium',
        action: { label: 'View Claims', url: `${BRAND.domain}/claims` },
    });
}

export function loanEmail(recipientName: string, action: 'submitted' | 'approved' | 'rejected' | 'payment_due' | 'overdue', amount?: string, comment?: string): string {
    const icons: Record<string, string> = { submitted: '💳', approved: '✅', rejected: '❌', payment_due: '📅', overdue: '🚨' };
    const titles: Record<string, string> = { submitted: 'Loan Application Submitted', approved: 'Loan Approved', rejected: 'Loan Rejected', payment_due: 'Loan Payment Due', overdue: 'Loan Payment Overdue' };
    const colors: Record<string, string> = { submitted: BRAND.secondary, approved: BRAND.success, rejected: BRAND.danger, payment_due: BRAND.warning, overdue: BRAND.danger };
    const bodies: Record<string, string> = {
        submitted: `Your loan application${amount ? ` for <strong>${amount}</strong>` : ''} has been submitted and is pending approval.`,
        approved: `Your loan application${amount ? ` for <strong>${amount}</strong>` : ''} has been <strong>approved</strong>.${comment ? `<br><br><em>Comment: ${comment}</em>` : ''}`,
        rejected: `Your loan application has been <strong>rejected</strong>.${comment ? `<br><br><em>Reason: ${comment}</em>` : ''}`,
        payment_due: `Your loan repayment${amount ? ` of <strong>${amount}</strong>` : ''} is due soon. Please ensure timely payment.`,
        overdue: `Your loan repayment${amount ? ` of <strong>${amount}</strong>` : ''} is <strong>overdue</strong>. Please make the payment immediately to avoid penalties.`,
    };

    return buildEmailHtml({
        recipientName,
        icon: icons[action],
        title: titles[action],
        body: bodies[action],
        accentColor: colors[action],
        priority: action === 'overdue' ? 'urgent' : action === 'rejected' ? 'high' : 'medium',
        action: { label: 'View Loans', url: `${BRAND.domain}/loans` },
    });
}

export function welcomeEmail(recipientName: string): string {
    return buildEmailHtml({
        recipientName,
        icon: '🎉',
        title: 'Welcome to Kechita Capital!',
        body: `We're excited to have you on board! Your staff account has been created. You can now log in to the Kechita Staff Portal to access your dashboard, submit requests, and manage your profile.`,
        accentColor: BRAND.primary,
        action: { label: 'Log In to Portal', url: `${BRAND.domain}/login` },
        footerNote: 'If you did not expect this email, please contact your HR department.',
    });
}

export function genericNotificationEmail(recipientName: string, title: string, body: string, actionUrl?: string, actionLabel?: string): string {
    return buildEmailHtml({
        recipientName,
        icon: '🔔',
        title,
        body,
        action: actionUrl ? { label: actionLabel || 'View Details', url: actionUrl } : undefined,
    });
}
