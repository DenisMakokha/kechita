import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { uuid } from '../id-utils';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || '';
        const correlationId = (headers['x-correlation-id'] as string) || this.generateCorrelationId();

        // Add correlation ID to response headers
        response.setHeader('x-correlation-id', correlationId);

        // Store correlation ID in request for access in other components
        (request as any).correlationId = correlationId;

        const now = Date.now();
        const user = (request as any).user;
        const userId = user?.id;
        const staffId = user?.staff_id;

        // Build structured log context
        const logContext = {
            correlationId,
            userId,
            staffId,
            ip,
            userAgent: userAgent.substring(0, 100), // Truncate long user agents
        };

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - now;
                    const { statusCode } = response;

                    const logMessage = `${correlationId} ${method} ${url} ${statusCode} ${duration}ms`;

                    if (statusCode >= 400) {
                        this.logger.warn(logMessage, JSON.stringify(logContext));
                    } else {
                        this.logger.log(logMessage, JSON.stringify(logContext));
                    }
                },
                error: (error) => {
                    const duration = Date.now() - now;
                    const statusCode = error.status || 500;

                    this.logger.error(
                        `${correlationId} ${method} ${url} ${statusCode} ${duration}ms - ${error.message}`,
                        error.stack,
                        JSON.stringify(logContext),
                    );
                },
            }),
        );
    }

    private generateCorrelationId(): string {
        return uuid();
    }
}
