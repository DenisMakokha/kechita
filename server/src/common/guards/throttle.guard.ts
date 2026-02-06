import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitRecord {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
    limit: number;
    ttlSeconds: number;
}

export const Throttle = (limit: number, ttlSeconds: number) => {
    return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(THROTTLE_KEY, { limit, ttlSeconds }, descriptor.value);
        } else {
            Reflect.defineMetadata(THROTTLE_KEY, { limit, ttlSeconds }, target);
        }
        return descriptor || target;
    };
};

@Injectable()
export class ThrottleGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const throttleOptions = this.reflector.get<ThrottleOptions>(
            THROTTLE_KEY,
            context.getHandler(),
        ) || this.reflector.get<ThrottleOptions>(THROTTLE_KEY, context.getClass());

        if (!throttleOptions) {
            return true;
        }

        const { limit, ttlSeconds } = throttleOptions;
        const request = context.switchToHttp().getRequest();
        const key = this.generateKey(request);
        const now = Date.now();

        let record = rateLimitStore.get(key);

        if (!record || now > record.resetTime) {
            record = {
                count: 1,
                resetTime: now + ttlSeconds * 1000,
            };
            rateLimitStore.set(key, record);
            return true;
        }

        if (record.count >= limit) {
            const retryAfter = Math.ceil((record.resetTime - now) / 1000);
            throw new HttpException(
                {
                    statusCode: HttpStatus.TOO_MANY_REQUESTS,
                    message: `Too many requests. Please try again in ${retryAfter} seconds.`,
                    retryAfter,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        record.count++;
        return true;
    }

    private generateKey(request: any): string {
        const ip = request.ip || request.connection?.remoteAddress || 'unknown';
        const path = request.path || request.url;
        return `${ip}:${path}`;
    }
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);
