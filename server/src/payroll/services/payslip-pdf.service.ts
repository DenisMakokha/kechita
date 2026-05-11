import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payslip } from '../entities/payslip.entity';
import { PayslipLine, PayslipLineKind } from '../entities/payslip-line.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

@Injectable()
export class PayslipPDFService {
    constructor(
        @InjectRepository(Payslip) private payslipRepo: Repository<Payslip>,
        @InjectRepository(PayslipLine) private lineRepo: Repository<PayslipLine>,
    ) {}

    /** Returns a PDF Buffer of the payslip. */
    async generate(payslipId: string): Promise<Buffer> {
        const payslip = await this.payslipRepo.findOne({
            where: { id: payslipId },
            relations: ['run', 'run.period'],
        });
        if (!payslip) throw new Error('Payslip not found');
        const lines = await this.lineRepo.find({ where: { payslip_id: payslipId }, order: { sort_order: 'ASC' } });

        return new Promise<Buffer>((resolve, reject) => {
            const doc = new PDFDocument({ margin: 36, size: 'A4' });
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Header
            doc.fillColor('#0066B3').fontSize(20).text('KECHITA CAPITAL', { align: 'left' });
            doc.fontSize(10).fillColor('#666').text('Employee Payslip', { align: 'left' });
            doc.moveDown(0.5);
            doc.fillColor('#000').fontSize(9);
            const period = payslip.run?.period;
            const monthName = period ? new Date(period.year, period.month - 1, 1).toLocaleString('en-GB', { month: 'long' }) : '';
            doc.text(`Payslip No: ${payslip.payslip_number}    |    Period: ${monthName} ${period?.year || ''}    |    Pay Date: ${period?.pay_date || ''}`);
            doc.moveDown(0.5);
            doc.strokeColor('#ccc').moveTo(36, doc.y).lineTo(559, doc.y).stroke();
            doc.moveDown(0.5);

            // Employee block
            doc.fontSize(10).fillColor('#000');
            const startY = doc.y;
            doc.text(`Employee No: ${payslip.employee_number_snapshot}`, 36, startY);
            doc.text(`Name: ${payslip.full_name_snapshot}`, 36, doc.y);
            if (payslip.position_snapshot) doc.text(`Position: ${payslip.position_snapshot}`, 36, doc.y);
            if (payslip.branch_snapshot) doc.text(`Branch: ${payslip.branch_snapshot}`, 36, doc.y);
            const rightX = 320;
            doc.text(`KRA PIN: ${payslip.tax_pin_snapshot || '-'}`, rightX, startY);
            doc.text(`NSSF No: ${payslip.nssf_number_snapshot || '-'}`, rightX, startY + 14);
            doc.text(`SHIF No: ${payslip.shif_number_snapshot || '-'}`, rightX, startY + 28);
            doc.text(`Days Worked: ${payslip.days_worked}${payslip.lwop_days > 0 ? ` (LWOP ${payslip.lwop_days})` : ''}`, rightX, startY + 42);
            doc.moveDown(2);

            // Earnings / Deductions table
            const earnings = lines.filter(l => l.kind === PayslipLineKind.EARNING);
            const deductions = lines.filter(l => l.kind === PayslipLineKind.DEDUCTION);
            const employer = lines.filter(l => l.kind === PayslipLineKind.EMPLOYER_CONTRIBUTION);

            const tableTop = doc.y + 6;
            const col1X = 36, col2X = 200, col3X = 320, col4X = 480;
            doc.fontSize(10).fillColor('#0066B3');
            doc.text('Earnings', col1X, tableTop, { bold: true } as any);
            doc.text('Amount (KES)', col2X, tableTop);
            doc.text('Deductions', col3X, tableTop);
            doc.text('Amount (KES)', col4X, tableTop);
            doc.strokeColor('#0066B3').moveTo(col1X, tableTop + 14).lineTo(559, tableTop + 14).stroke();

            doc.fillColor('#000').fontSize(9);
            const rows = Math.max(earnings.length, deductions.length);
            for (let i = 0; i < rows; i++) {
                const y = tableTop + 20 + i * 14;
                if (earnings[i]) {
                    doc.text(earnings[i].label, col1X, y);
                    doc.text(format(Number(earnings[i].amount)), col2X, y, { width: 100, align: 'right' });
                }
                if (deductions[i]) {
                    doc.text(deductions[i].label, col3X, y);
                    doc.text(format(Number(deductions[i].amount)), col4X, y, { width: 70, align: 'right' });
                }
            }
            const endTableY = tableTop + 20 + rows * 14 + 4;
            doc.strokeColor('#ccc').moveTo(col1X, endTableY).lineTo(559, endTableY).stroke();

            // Totals
            const totalsY = endTableY + 8;
            doc.fillColor('#000').fontSize(10);
            doc.text('Gross Pay', col1X, totalsY, { bold: true } as any);
            doc.text(format(Number(payslip.gross_pay)), col2X, totalsY, { width: 100, align: 'right' });
            doc.text('Total Deductions', col3X, totalsY);
            doc.text(format(Number(payslip.total_deductions)), col4X, totalsY, { width: 70, align: 'right' });

            const netY = totalsY + 22;
            doc.rect(col1X, netY - 4, 523, 24).fillColor('#0066B3').fill();
            doc.fillColor('#fff').fontSize(13).text('NET PAY', col1X + 8, netY);
            doc.text(`KES ${format(Number(payslip.net_pay))}`, col1X + 380, netY, { width: 140, align: 'right' });

            // Employer contributions (info)
            doc.moveDown(2);
            doc.fillColor('#666').fontSize(9).text('Employer Contributions (informational):', { align: 'left' });
            const empY = doc.y + 4;
            let yy = empY;
            for (const e of employer) {
                doc.fillColor('#666').text(`${e.label}: KES ${format(Number(e.amount))}`, col1X, yy);
                yy += 12;
            }

            // Footer
            doc.fillColor('#999').fontSize(8).text(
                'This is a system-generated payslip and does not require a signature.',
                36,
                doc.page.height - 50,
                { align: 'center', width: 523 },
            );

            doc.end();
        });
    }
}

function format(n: number): string {
    return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
