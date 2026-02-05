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

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const ctx = context.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || '';
        const correlationId = headers['x-correlation-id'] || this.generateCorrelationId();

        // Add correlation ID to response headers
        response.setHeader('x-correlation-id', correlationId);

        const now = Date.now();

        return next.handle().pipe(
            tap({
                next: () => {
                    const duration = Date.now() - now;
                    const { statusCode } = response;

                    const logMessage = `${method} ${url} ${statusCode} ${duration}ms - ${ip}`;

                    if (statusCode >= 400) {
                        this.logger.warn(logMessage);
                    } else {
                        this.logger.log(logMessage);
                    }
                },
                error: (error) => {
                    const duration = Date.now() - now;
                    const statusCode = error.status || 500;

                    this.logger.error(
                        `${method} ${url} ${statusCode} ${duration}ms - ${ip} - ${error.message}`
                    );
                },
            }),
        );
    }

    private generateCorrelationId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
