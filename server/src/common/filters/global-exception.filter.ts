import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

interface ErrorResponse {
    statusCode: number;
    errorCode: string;
    message: string;
    details?: any;
    timestamp: string;
    path: string;
    method: string;
    correlationId?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const errorResponse = this.buildErrorResponse(exception, request);

        // Log the error
        this.logError(errorResponse, exception);

        response.status(errorResponse.statusCode).json(errorResponse);
    }

    private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
        const timestamp = new Date().toISOString();
        const path = request.url;
        const method = request.method;
        const correlationId = request.headers['x-correlation-id'] as string;

        // Handle HTTP exceptions from NestJS
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            let message = exception.message;
            let details: any = undefined;

            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const res = exceptionResponse as any;
                message = res.message || message;
                if (Array.isArray(res.message)) {
                    message = res.message[0];
                    details = { validationErrors: res.message };
                }
                if (res.error) {
                    details = { ...details, error: res.error };
                }
            }

            return {
                statusCode: status,
                errorCode: this.getErrorCode(status),
                message,
                details,
                timestamp,
                path,
                method,
                correlationId,
            };
        }

        // Handle TypeORM Query Failed errors
        if (exception instanceof QueryFailedError) {
            const pgError = exception as any;

            // Unique violation
            if (pgError.code === '23505') {
                return {
                    statusCode: HttpStatus.CONFLICT,
                    errorCode: 'DUPLICATE_ENTRY',
                    message: 'A record with this value already exists',
                    details: { constraint: pgError.constraint },
                    timestamp,
                    path,
                    method,
                    correlationId,
                };
            }

            // Foreign key violation
            if (pgError.code === '23503') {
                return {
                    statusCode: HttpStatus.BAD_REQUEST,
                    errorCode: 'FOREIGN_KEY_VIOLATION',
                    message: 'Referenced record does not exist',
                    details: { constraint: pgError.constraint },
                    timestamp,
                    path,
                    method,
                    correlationId,
                };
            }

            // Not null violation
            if (pgError.code === '23502') {
                return {
                    statusCode: HttpStatus.BAD_REQUEST,
                    errorCode: 'REQUIRED_FIELD_MISSING',
                    message: `Required field is missing: ${pgError.column}`,
                    timestamp,
                    path,
                    method,
                    correlationId,
                };
            }

            return {
                statusCode: HttpStatus.BAD_REQUEST,
                errorCode: 'DATABASE_ERROR',
                message: 'Database operation failed',
                timestamp,
                path,
                method,
                correlationId,
            };
        }

        // Handle TypeORM Entity Not Found
        if (exception instanceof EntityNotFoundError) {
            return {
                statusCode: HttpStatus.NOT_FOUND,
                errorCode: 'ENTITY_NOT_FOUND',
                message: 'The requested resource was not found',
                timestamp,
                path,
                method,
                correlationId,
            };
        }

        // Handle generic errors
        const error = exception as Error;
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            errorCode: 'INTERNAL_SERVER_ERROR',
            message: process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : error.message || 'An unexpected error occurred',
            details: process.env.NODE_ENV !== 'production' ? { stack: error.stack } : undefined,
            timestamp,
            path,
            method,
            correlationId,
        };
    }

    private getErrorCode(status: number): string {
        const errorCodes: Record<number, string> = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            405: 'METHOD_NOT_ALLOWED',
            409: 'CONFLICT',
            422: 'UNPROCESSABLE_ENTITY',
            429: 'TOO_MANY_REQUESTS',
            500: 'INTERNAL_SERVER_ERROR',
            502: 'BAD_GATEWAY',
            503: 'SERVICE_UNAVAILABLE',
        };
        return errorCodes[status] || 'UNKNOWN_ERROR';
    }

    private logError(errorResponse: ErrorResponse, exception: unknown) {
        const logMessage = `[${errorResponse.method}] ${errorResponse.path} - ${errorResponse.statusCode} ${errorResponse.errorCode}: ${errorResponse.message}`;

        if (errorResponse.statusCode >= 500) {
            this.logger.error(logMessage, exception instanceof Error ? exception.stack : undefined);
        } else if (errorResponse.statusCode >= 400) {
            this.logger.warn(logMessage);
        }
    }
}
