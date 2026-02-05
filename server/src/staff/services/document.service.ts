import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan, Between } from 'typeorm';
import { Document } from '../entities/document.entity';
import { StaffDocument, StaffDocumentStatus } from '../entities/staff-document.entity';
import { DocumentType } from '../entities/document-type.entity';
import { Staff } from '../entities/staff.entity';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export interface UploadResult {
    document: Document;
    staffDocument?: StaffDocument;
}

export interface ExpiringDocument {
    staffDocument: StaffDocument;
    daysUntilExpiry: number;
    staff: Staff;
}

@Injectable()
export class DocumentService {
    private readonly uploadDir: string;

    constructor(
        @InjectRepository(Document)
        private documentRepo: Repository<Document>,
        @InjectRepository(StaffDocument)
        private staffDocumentRepo: Repository<StaffDocument>,
        @InjectRepository(DocumentType)
        private documentTypeRepo: Repository<DocumentType>,
        @InjectRepository(Staff)
        private staffRepo: Repository<Staff>,
    ) {
        // Create uploads directory if it doesn't exist
        this.uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    // ==================== DOCUMENT TYPE OPERATIONS ====================

    async createDocumentType(data: Partial<DocumentType>): Promise<DocumentType> {
        const docType = this.documentTypeRepo.create(data);
        return this.documentTypeRepo.save(docType);
    }

    async getDocumentTypes(activeOnly = true): Promise<DocumentType[]> {
        const where = activeOnly ? { is_active: true } : {};
        return this.documentTypeRepo.find({
            where,
            order: { sort_order: 'ASC', name: 'ASC' }
        });
    }

    async getDocumentType(id: string): Promise<DocumentType> {
        const docType = await this.documentTypeRepo.findOneBy({ id });
        if (!docType) throw new NotFoundException('Document type not found');
        return docType;
    }

    async updateDocumentType(id: string, data: Partial<DocumentType>): Promise<DocumentType> {
        await this.documentTypeRepo.update(id, data);
        return this.getDocumentType(id);
    }

    // ==================== FILE UPLOAD OPERATIONS ====================

    async uploadFile(file: UploadedFile, uploadedBy?: string): Promise<Document> {
        // Validate file
        if (!file || !file.buffer) {
            throw new BadRequestException('No file provided');
        }

        // Generate unique filename
        const ext = path.extname(file.originalname);
        const storedName = `${uuidv4()}${ext}`;
        const storageKey = path.join('documents', new Date().toISOString().slice(0, 7), storedName);
        const fullPath = path.join(this.uploadDir, storageKey);

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Calculate checksum
        const checksum = crypto.createHash('md5').update(file.buffer).digest('hex');

        // Save file to disk
        fs.writeFileSync(fullPath, file.buffer);

        // Create document record
        const document = this.documentRepo.create({
            storage_key: storageKey,
            original_name: file.originalname,
            stored_name: storedName,
            mime_type: file.mimetype,
            size_bytes: file.size,
            storage_provider: 'local',
            checksum,
            uploaded_by: uploadedBy,
        });

        return this.documentRepo.save(document);
    }

    async uploadStaffDocument(
        staffId: string,
        documentTypeId: string,
        file: UploadedFile,
        metadata: {
            expiryDate?: Date;
            issueDate?: Date;
            referenceNumber?: string;
        },
        uploadedBy?: string,
    ): Promise<StaffDocument> {
        // Validate staff exists
        const staff = await this.staffRepo.findOneBy({ id: staffId });
        if (!staff) throw new NotFoundException('Staff not found');

        // Validate document type
        const docType = await this.documentTypeRepo.findOneBy({ id: documentTypeId });
        if (!docType) throw new NotFoundException('Document type not found');

        // Validate file extension
        const ext = path.extname(file.originalname).slice(1).toLowerCase();
        const allowedExtensions = docType.allowed_extensions.split(',').map(e => e.trim().toLowerCase());
        if (!allowedExtensions.includes(ext)) {
            throw new BadRequestException(`File type .${ext} not allowed. Allowed: ${docType.allowed_extensions}`);
        }

        // Validate file size
        const maxSizeBytes = docType.max_size_mb * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            throw new BadRequestException(`File size exceeds ${docType.max_size_mb}MB limit`);
        }

        // Upload the file
        const document = await this.uploadFile(file, uploadedBy);

        // Check if there's an existing document of this type for this staff
        const existingDoc = await this.staffDocumentRepo.findOne({
            where: {
                staff: { id: staffId },
                documentType: { id: documentTypeId }
            }
        });

        if (existingDoc) {
            // Update existing record
            existingDoc.document = document;
            existingDoc.expiry_date = metadata.expiryDate;
            existingDoc.issue_date = metadata.issueDate;
            existingDoc.reference_number = metadata.referenceNumber;
            existingDoc.status = StaffDocumentStatus.UPLOADED;
            existingDoc.uploaded_by = uploadedBy;
            existingDoc.reminder_days_before = docType.reminder_days_before;
            existingDoc.reminder_sent_30_days = false;
            existingDoc.reminder_sent_7_days = false;
            existingDoc.reminder_sent_expired = false;
            return this.staffDocumentRepo.save(existingDoc);
        }

        // Create new staff document record
        const staffDocument = this.staffDocumentRepo.create({
            staff,
            documentType: docType,
            document,
            doc_type: docType.code,
            expiry_date: metadata.expiryDate,
            issue_date: metadata.issueDate,
            reference_number: metadata.referenceNumber,
            status: StaffDocumentStatus.UPLOADED,
            reminder_days_before: docType.reminder_days_before,
            uploaded_by: uploadedBy,
        });

        return this.staffDocumentRepo.save(staffDocument);
    }

    // ==================== DOCUMENT RETRIEVAL ====================

    async getDocument(id: string): Promise<Document> {
        const doc = await this.documentRepo.findOneBy({ id });
        if (!doc) throw new NotFoundException('Document not found');
        return doc;
    }

    async getDocumentFile(id: string): Promise<{ buffer: Buffer; document: Document }> {
        const document = await this.getDocument(id);
        const fullPath = path.join(this.uploadDir, document.storage_key);

        if (!fs.existsSync(fullPath)) {
            throw new NotFoundException('File not found on disk');
        }

        const buffer = fs.readFileSync(fullPath);
        return { buffer, document };
    }

    async getStaffDocuments(staffId: string): Promise<StaffDocument[]> {
        return this.staffDocumentRepo.find({
            where: { staff: { id: staffId } },
            relations: ['documentType', 'document'],
            order: { uploaded_at: 'DESC' },
        });
    }

    async getStaffDocument(id: string): Promise<StaffDocument> {
        const doc = await this.staffDocumentRepo.findOne({
            where: { id },
            relations: ['staff', 'documentType', 'document'],
        });
        if (!doc) throw new NotFoundException('Staff document not found');
        return doc;
    }

    // ==================== DOCUMENT VERIFICATION ====================

    async verifyDocument(id: string, verifiedBy: string, notes?: string): Promise<StaffDocument> {
        const doc = await this.getStaffDocument(id);
        doc.status = StaffDocumentStatus.VERIFIED;
        doc.verified_by = verifiedBy;
        doc.verified_at = new Date();
        doc.verification_notes = notes;
        return this.staffDocumentRepo.save(doc);
    }

    async rejectDocument(id: string, reason: string, rejectedBy: string): Promise<StaffDocument> {
        const doc = await this.getStaffDocument(id);
        doc.status = StaffDocumentStatus.REJECTED;
        doc.rejection_reason = reason;
        doc.verified_by = rejectedBy;
        doc.verified_at = new Date();
        return this.staffDocumentRepo.save(doc);
    }

    // ==================== DOCUMENT EXPIRY ====================

    async getExpiringDocuments(daysAhead: number): Promise<ExpiringDocument[]> {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const expiringDocs = await this.staffDocumentRepo.find({
            where: {
                expiry_date: Between(today, futureDate),
                status: StaffDocumentStatus.VERIFIED,
            },
            relations: ['staff', 'staff.user', 'documentType'],
        });

        return expiringDocs.map(doc => ({
            staffDocument: doc,
            daysUntilExpiry: doc.expiry_date ? Math.ceil((new Date(doc.expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0,
            staff: doc.staff,
        }));
    }

    async getExpiredDocuments(): Promise<StaffDocument[]> {
        const today = new Date();
        return this.staffDocumentRepo.find({
            where: {
                expiry_date: LessThanOrEqual(today),
                status: StaffDocumentStatus.VERIFIED,
            },
            relations: ['staff', 'staff.user', 'documentType'],
        });
    }

    async updateExpiredDocumentStatuses(): Promise<number> {
        const expired = await this.getExpiredDocuments();
        let count = 0;

        for (const doc of expired) {
            doc.status = StaffDocumentStatus.EXPIRED;
            await this.staffDocumentRepo.save(doc);
            count++;
        }

        return count;
    }

    async getExpiringSoonDocuments(days: number): Promise<StaffDocument[]> {
        const today = new Date();
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);

        return this.staffDocumentRepo.find({
            where: {
                expiry_date: Between(today, targetDate),
                status: StaffDocumentStatus.VERIFIED,
            },
            relations: ['staff', 'staff.user', 'documentType'],
        });
    }

    // Mark reminder as sent
    async markReminderSent(id: string, reminderType: '30_days' | '7_days' | 'expired'): Promise<StaffDocument> {
        const doc = await this.getStaffDocument(id);

        switch (reminderType) {
            case '30_days':
                doc.reminder_sent_30_days = true;
                break;
            case '7_days':
                doc.reminder_sent_7_days = true;
                break;
            case 'expired':
                doc.reminder_sent_expired = true;
                break;
        }

        return this.staffDocumentRepo.save(doc);
    }

    // ==================== DOCUMENT COMPLIANCE CHECK ====================

    async getStaffDocumentCompliance(staffId: string): Promise<{
        requiredDocuments: DocumentType[];
        uploadedDocuments: StaffDocument[];
        missingDocuments: DocumentType[];
        expiringDocuments: StaffDocument[];
        expiredDocuments: StaffDocument[];
        compliancePercentage: number;
    }> {
        const requiredDocs = await this.documentTypeRepo.find({
            where: { is_required: true, is_active: true }
        });

        const uploadedDocs = await this.getStaffDocuments(staffId);
        const uploadedTypeIds = uploadedDocs
            .filter(d => d.status === StaffDocumentStatus.VERIFIED || d.status === StaffDocumentStatus.UPLOADED)
            .map(d => d.documentType?.id)
            .filter(Boolean);

        const missingDocs = requiredDocs.filter(rt => !uploadedTypeIds.includes(rt.id));

        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

        const expiringDocs = uploadedDocs.filter(d =>
            d.expiry_date &&
            new Date(d.expiry_date) > today &&
            new Date(d.expiry_date) <= thirtyDaysLater
        );

        const expiredDocs = uploadedDocs.filter(d =>
            d.expiry_date && new Date(d.expiry_date) < today
        );

        const verifiedDocs = uploadedDocs.filter(d =>
            d.status === StaffDocumentStatus.VERIFIED &&
            (!d.expiry_date || new Date(d.expiry_date) > today)
        );

        const compliancePercentage = requiredDocs.length > 0
            ? Math.round((verifiedDocs.length / requiredDocs.length) * 100)
            : 100;

        return {
            requiredDocuments: requiredDocs,
            uploadedDocuments: uploadedDocs,
            missingDocuments: missingDocs,
            expiringDocuments: expiringDocs,
            expiredDocuments: expiredDocs,
            compliancePercentage,
        };
    }

    // ==================== DELETE OPERATIONS ====================

    async deleteDocument(id: string): Promise<void> {
        const document = await this.getDocument(id);
        const fullPath = path.join(this.uploadDir, document.storage_key);

        // Delete file from disk
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        // Delete database record
        await this.documentRepo.delete(id);
    }

    async deleteStaffDocument(id: string): Promise<void> {
        const staffDoc = await this.getStaffDocument(id);

        if (staffDoc.document) {
            await this.deleteDocument(staffDoc.document.id);
        }

        await this.staffDocumentRepo.delete(id);
    }
}
