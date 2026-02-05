import { randomInt, randomUUID } from 'crypto';

export function uuid(): string {
    return randomUUID();
}

export function randomDigits(length: number): string {
    if (length <= 0) {
        throw new Error('length must be > 0');
    }

    const maxExclusive = 10 ** length;
    const n = randomInt(0, maxExclusive);
    return n.toString().padStart(length, '0');
}

export function randomString(length: number, alphabet: string): string {
    if (length <= 0) {
        throw new Error('length must be > 0');
    }
    if (!alphabet) {
        throw new Error('alphabet must be non-empty');
    }

    let result = '';
    for (let i = 0; i < length; i++) {
        result += alphabet.charAt(randomInt(0, alphabet.length));
    }
    return result;
}

export function formatDateYYYYMMDD(date: Date): string {
    const yyyy = date.getFullYear().toString();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
}

export function generateRef(prefix: string, options?: { date?: Date; digits?: number }): string {
    const date = options?.date ?? new Date();
    const digits = options?.digits ?? 6;
    return `${prefix}-${formatDateYYYYMMDD(date)}-${randomDigits(digits)}`;
}

export function generateTempPassword(length = 10): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return randomString(length, chars);
}
