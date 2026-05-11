import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

/**
 * Centralized Multer configuration.
 * Use this in every module that handles file uploads to enforce
 * consistent size limits and MIME whitelisting.
 */

export const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const standardMulterOptions = {
    storage: memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
    },
    fileFilter: (_req: any, file: Express.Multer.File, callback: (err: Error | null, accept: boolean) => void) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            callback(null, true);
        } else {
            callback(
                new BadRequestException(
                    `File type '${file.mimetype}' is not allowed. Allowed: images, PDF, Word, Excel, CSV, text, ZIP.`,
                ),
                false,
            );
        }
    },
};
