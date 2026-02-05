import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OfferSignature, SignatureStatus } from './entities/offer-signature.entity';
import { Offer } from './entities/offer.entity';
import { Candidate } from './entities/candidate.entity';
import { EmailService } from '../email/email.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SignatureService {
    constructor(
        @InjectRepository(OfferSignature)
        private signatureRepo: Repository<OfferSignature>,
        @InjectRepository(Offer)
        private offerRepo: Repository<Offer>,
        private emailService: EmailService,
        private configService: ConfigService,
    ) { }

    async createSignatureRequest(offerId: string, expiresInDays: number = 7): Promise<OfferSignature> {
        const offer = await this.offerRepo.findOne({
            where: { id: offerId },
            relations: ['application', 'application.candidate'],
        });
        if (!offer) throw new NotFoundException('Offer not found');

        const candidate = offer.application?.candidate;
        if (!candidate) throw new BadRequestException('No candidate associated with this offer');

        // Check for existing pending signature
        const existing = await this.signatureRepo.findOne({
            where: { offer: { id: offerId }, status: SignatureStatus.PENDING },
        });
        if (existing) {
            throw new BadRequestException('A signature request already exists for this offer');
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const signature = this.signatureRepo.create({
            signature_token: uuidv4(),
            offer,
            candidate,
            status: SignatureStatus.PENDING,
            expires_at: expiresAt,
            audit_log: [{
                action: 'created',
                timestamp: new Date(),
                details: 'Signature request created',
            }],
        });

        const saved = await this.signatureRepo.save(signature);

        // Send signature request email
        const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
        const signatureUrl = `${frontendUrl}/offer/sign/${saved.signature_token}`;

        // Get job post title via application
        const jobTitle = offer.application?.jobPost?.title || 'Position Offered';

        await this.emailService.sendOfferSignatureRequest({
            candidateEmail: candidate.email,
            candidateName: `${candidate.first_name} ${candidate.last_name}`,
            jobTitle,
            signatureUrl,
            expiresAt,
            salary: offer.offered_salary,
            currency: offer.currency || 'KES',
            startDate: offer.start_date,
        });

        return saved;
    }

    async getSignatureByToken(token: string): Promise<OfferSignature> {
        const signature = await this.signatureRepo.findOne({
            where: { signature_token: token },
            relations: ['offer', 'candidate'],
        });
        if (!signature) throw new NotFoundException('Signature request not found');

        // Record first view
        if (!signature.first_viewed_at) {
            signature.first_viewed_at = new Date();
            signature.audit_log = [
                ...(signature.audit_log || []),
                { action: 'viewed', timestamp: new Date(), details: 'First viewed by candidate' },
            ];
            await this.signatureRepo.save(signature);
        }

        return signature;
    }

    async signOffer(
        token: string,
        signatureData: {
            signature_type: 'drawn' | 'typed' | 'uploaded';
            signature_data?: string; // Base64 for drawn/uploaded
            typed_name?: string;
        },
        signerInfo: {
            ip_address?: string;
            user_agent?: string;
        },
    ): Promise<OfferSignature> {
        const signature = await this.getSignatureByToken(token);

        if (signature.status !== SignatureStatus.PENDING) {
            throw new BadRequestException(`This offer has already been ${signature.status}`);
        }

        if (new Date() > signature.expires_at) {
            signature.status = SignatureStatus.EXPIRED;
            await this.signatureRepo.save(signature);
            throw new BadRequestException('This signature request has expired');
        }

        // Validate signature data
        if (signatureData.signature_type === 'drawn' || signatureData.signature_type === 'uploaded') {
            if (!signatureData.signature_data) {
                throw new BadRequestException('Signature data is required');
            }
        } else if (signatureData.signature_type === 'typed') {
            if (!signatureData.typed_name) {
                throw new BadRequestException('Typed name is required');
            }
        }

        signature.signature_type = signatureData.signature_type;
        signature.signature_data = signatureData.signature_data;
        signature.typed_name = signatureData.typed_name;
        signature.signed_at = new Date();
        signature.signer_ip_address = signerInfo.ip_address;
        signature.signer_user_agent = signerInfo.user_agent;
        signature.status = SignatureStatus.SIGNED;
        signature.audit_log = [
            ...(signature.audit_log || []),
            {
                action: 'signed',
                timestamp: new Date(),
                ip_address: signerInfo.ip_address,
                details: `Signed via ${signatureData.signature_type}`,
            },
        ];

        const saved = await this.signatureRepo.save(signature);

        // Update offer status
        await this.offerRepo.update(signature.offer.id, {
            status: 'accepted',
        });

        // Send confirmation email to candidate
        const jobTitle = signature.offer?.application?.jobPost?.title || 'Position';
        await this.emailService.sendOfferSigned({
            candidateEmail: signature.candidate.email,
            candidateName: `${signature.candidate.first_name} ${signature.candidate.last_name}`,
            jobTitle,
            startDate: signature.offer.start_date,
            hrEmail: this.configService.get('HR_EMAIL'),
        });

        return saved;
    }

    async declineOffer(token: string, reason: string, signerInfo: { ip_address?: string }): Promise<OfferSignature> {
        const signature = await this.getSignatureByToken(token);

        if (signature.status !== SignatureStatus.PENDING) {
            throw new BadRequestException(`This offer has already been ${signature.status}`);
        }

        signature.status = SignatureStatus.DECLINED;
        signature.decline_reason = reason;
        signature.declined_at = new Date();
        signature.audit_log = [
            ...(signature.audit_log || []),
            {
                action: 'declined',
                timestamp: new Date(),
                ip_address: signerInfo.ip_address,
                details: `Declined: ${reason}`,
            },
        ];

        const saved = await this.signatureRepo.save(signature);

        // Update offer status
        await this.offerRepo.update(signature.offer.id, {
            status: 'rejected',
        });

        // Notify HR about declined offer
        const hrEmail = this.configService.get('HR_EMAIL');
        if (hrEmail) {
            const jobTitle = signature.offer?.application?.jobPost?.title || 'Position';
            await this.emailService.sendOfferDeclined({
                hrEmails: [hrEmail],
                candidateName: `${signature.candidate.first_name} ${signature.candidate.last_name}`,
                candidateEmail: signature.candidate.email,
                jobTitle,
                reason,
            });
        }

        return saved;
    }

    async getSignaturesForOffer(offerId: string): Promise<OfferSignature[]> {
        return this.signatureRepo.find({
            where: { offer: { id: offerId } },
            order: { created_at: 'DESC' },
        });
    }

    async expirePendingSignatures(): Promise<number> {
        const now = new Date();
        const pending = await this.signatureRepo.find({
            where: { status: SignatureStatus.PENDING },
        });

        let expired = 0;
        for (const sig of pending) {
            if (sig.expires_at < now) {
                sig.status = SignatureStatus.EXPIRED;
                sig.audit_log = [
                    ...(sig.audit_log || []),
                    { action: 'expired', timestamp: now, details: 'Signature request expired' },
                ];
                await this.signatureRepo.save(sig);
                expired++;
            }
        }

        return expired;
    }

    getSigningUrl(token: string): string {
        // This would be configured based on your frontend URL
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return `${baseUrl}/offer/sign/${token}`;
    }

    async getPendingSignatures(): Promise<OfferSignature[]> {
        return this.signatureRepo.find({
            where: { status: SignatureStatus.PENDING },
            relations: ['offer', 'candidate'],
            order: { created_at: 'ASC' },
        });
    }
}
