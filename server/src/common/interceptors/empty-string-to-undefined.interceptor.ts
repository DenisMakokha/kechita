import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Recursively converts empty/whitespace-only strings in request bodies to
 * `undefined` so that `@IsOptional()` validators (UUID, Email, DateString,
 * Number, Enum) don't reject unfilled form fields submitted as `""`.
 *
 * This runs BEFORE class-validator/transformer because Nest interceptors
 * execute before global pipes for the same request.
 */
@Injectable()
export class EmptyStringToUndefinedInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest();
        if (req?.body && typeof req.body === 'object') {
            this.clean(req.body);
        }
        return next.handle();
    }

    private clean(obj: any, depth = 0): void {
        if (depth > 6 || obj === null || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
                const v = obj[i];
                if (typeof v === 'string' && v.trim() === '') {
                    obj[i] = undefined as any;
                } else if (v && typeof v === 'object') {
                    this.clean(v, depth + 1);
                }
            }
            return;
        }
        for (const key of Object.keys(obj)) {
            const v = obj[key];
            if (typeof v === 'string' && v.trim() === '') {
                delete obj[key];
            } else if (v && typeof v === 'object') {
                this.clean(v, depth + 1);
            }
        }
    }
}
