import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { ContractService } from './services/contract.service';

/**
 * Public, **unauthenticated** signing endpoints. Access is gated entirely by
 * possession of the one-shot token mailed to the employee. This is kept on a
 * separate controller so it sits outside the JwtAuthGuard chain attached at
 * the StaffController class level.
 *
 * Route shape:
 *   GET  /public/contracts/sign/:token      → returns a minimal view payload
 *   POST /public/contracts/sign/:token      → submits the signature
 */
@Controller('public/contracts')
export class PublicContractSigningController {
    constructor(private readonly contractService: ContractService) {}

    @Get('sign/:token')
    async getByToken(@Param('token') token: string) {
        const c = await this.contractService.getByToken(token);
        const staff: any = c.staff || {};
        // Return only what the signing UI needs — never expose audit fields
        // or other contracts here.
        return {
            id: c.id,
            contract_number: c.contract_number,
            contract_type: c.contract_type,
            title: c.title,
            start_date: c.start_date,
            end_date: c.end_date,
            salary: c.salary,
            salary_currency: c.salary_currency,
            notice_period_days: c.notice_period_days,
            status: c.status,
            staff: {
                first_name: staff.first_name,
                last_name: staff.last_name,
                full_name: [staff.first_name, staff.middle_name, staff.last_name].filter(Boolean).join(' '),
                employee_number: staff.employee_number,
                position: staff.position?.name,
                branch: staff.branch?.name,
                department: staff.department?.name,
            },
            expires_at: c.signature_token_expires_at,
        };
    }

    @Post('sign/:token')
    async sign(
        @Param('token') token: string,
        @Body() data: { signatureImage: string; signedByName: string },
        @Req() req: any,
    ) {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
        const ua = req.headers['user-agent'] as string | undefined;
        const c = await this.contractService.signWithToken(token, {
            signatureImage: data.signatureImage,
            signedByName: data.signedByName,
            ip,
            userAgent: ua,
        });
        return {
            ok: true,
            contract_id: c.id,
            signed_date: c.signed_date,
            status: c.status,
        };
    }

    // ===== Addendum signing (Phase 2C) =====

    @Get('addendums/sign/:token')
    async getAddendumByToken(@Param('token') token: string) {
        const a = await this.contractService.getAddendumByToken(token);
        return {
            id: a.id,
            sequence: a.sequence,
            title: a.title,
            body: a.body,
            effective_date: a.effective_date,
            status: a.status,
            expires_at: a.signature_token_expires_at,
        };
    }

    @Post('addendums/sign/:token')
    async signAddendum(
        @Param('token') token: string,
        @Body() data: { signatureImage: string; signedByName: string },
        @Req() req: any,
    ) {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
        const ua = req.headers['user-agent'] as string | undefined;
        const a = await this.contractService.signAddendumWithToken(token, {
            signatureImage: data.signatureImage,
            signedByName: data.signedByName,
            ip,
            userAgent: ua,
        });
        return { ok: true, addendum_id: a.id, signed_date: a.signed_date, status: a.status };
    }
}
